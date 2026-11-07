import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  In,
  MoreThan,
  Repository,
} from "typeorm";

import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { AuditoriaService } from "../auditoria/auditoria.service";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { EstadoBodega } from "../bodegas/enums/estado-bodega.enum";
import { Existencia } from "../inventario/entities/existencia.entity";
import { TipoBodega } from "../bodegas/enums/tipo-bodega.enum";
import { Usuario } from "../usuarios/entities/usuario.entity";
import { EstadoUsuario } from "../usuarios/enums/estado-usuario.enum";
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import { UsuarioBodega } from "./entities/usuario-bodega.entity";
import { TipoAsignacion } from "./enums/tipo-asignacion.enum";

export interface AsignacionPublica {
  id: string;
  tipoAsignacion: TipoAsignacion;
  createdAt: Date;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: RolUsuario;
    estado: EstadoUsuario;
  };
  bodega: {
    id: string;
    nombre: string;
    tipo: TipoBodega;
    estado: EstadoBodega;
    bodegaPadreId: string | null;
  };
}

export interface AsignacionesUsuarioPublicas {
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: RolUsuario;
    estado: EstadoUsuario;
  };
  asignaciones: AsignacionPublica[];
}

export interface AsignacionDirectorioPublica {
  usuario: {
    id: string;
    nombre: string;
    rol: RolUsuario;
    estado: EstadoUsuario;
  };
  bodega: {
    id: string;
    nombre: string;
  };
}

@Injectable()
export class AsignacionesService {
  private readonly bodegasSupervisorPermitidas = new Set([
    "Bodega Limpieza",
    "Bodega Oficina",
    "Gastronomía Tasty",
  ]);

  private readonly sucursalesResponsablePermitidas = new Set([
    "Tasty 1",
    "Tasty 2",
    "Tasty 3",
    "Tasty 4",
    "Tasty 5",
  ]);

  constructor(
    @InjectRepository(UsuarioBodega)
    private readonly asignacionesRepository: Repository<UsuarioBodega>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Bodega)
    private readonly bodegasRepository: Repository<Bodega>,
    @InjectRepository(Existencia)
    private readonly existenciasRepository: Repository<Existencia>,
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listarTodas(): Promise<AsignacionPublica[]> {
    const asignaciones = await this.asignacionesRepository.find({
      relations: {
        usuario: true,
        bodega: true,
      },
      order: {
        createdAt: "ASC",
      },
    });

    return asignaciones.map((asignacion) =>
      this.convertirAPublica(asignacion),
    );
  }

  async listarPorUsuario(
    usuarioId: string,
  ): Promise<AsignacionesUsuarioPublicas> {
    const usuario = await this.obtenerUsuario(usuarioId);

    const asignaciones = await this.asignacionesRepository.find({
      where: {
        usuarioId,
      },
      relations: {
        usuario: true,
        bodega: true,
      },
      order: {
        createdAt: "ASC",
      },
    });

    return {
      usuario: this.convertirUsuario(usuario),
      asignaciones: asignaciones.map((asignacion) =>
        this.convertirAPublica(asignacion),
      ),
    };
  }

  async listarDirectorio(
    actor: UsuarioAutenticado,
  ): Promise<AsignacionDirectorioPublica[]> {
    const asignaciones = await this.asignacionesRepository.find({
      relations: {
        usuario: true,
        bodega: true,
      },
      order: {
        createdAt: "ASC",
      },
    });

    const convertir = (
      asignacion: UsuarioBodega,
    ): AsignacionDirectorioPublica => ({
      usuario: {
        id: asignacion.usuario.id,
        nombre: asignacion.usuario.nombre,
        rol: asignacion.usuario.rol,
        estado: asignacion.usuario.estado,
      },
      bodega: {
        id: asignacion.bodega.id,
        nombre: asignacion.bodega.nombre,
      },
    });

    if (actor.rol === RolUsuario.ADMINISTRADOR) {
      return asignaciones.map(convertir);
    }

    const asignacionesActor = asignaciones.filter(
      (asignacion) => asignacion.usuarioId === actor.id,
    );

    if (asignacionesActor.length === 0) {
      return [];
    }

    const bodegas = await this.bodegasRepository.find();
    const alcance = new Set<string>();

    for (const asignacion of asignacionesActor) {
      const bodega = asignacion.bodega;
      alcance.add(bodega.id);

      if (actor.rol === RolUsuario.SUPERVISOR) {
        for (const posibleSucursal of bodegas) {
          if (
            posibleSucursal.bodegaPadreId === bodega.id &&
            posibleSucursal.tipo === TipoBodega.SUCURSAL
          ) {
            alcance.add(posibleSucursal.id);
          }
        }
      }

      if (
        actor.rol === RolUsuario.RESPONSABLE &&
        bodega.bodegaPadreId
      ) {
        alcance.add(bodega.bodegaPadreId);
      }
    }

    const rolRelacionado =
      actor.rol === RolUsuario.SUPERVISOR
        ? RolUsuario.RESPONSABLE
        : actor.rol === RolUsuario.RESPONSABLE
          ? RolUsuario.SUPERVISOR
          : null;

    if (!rolRelacionado) {
      return [];
    }

    return asignaciones
      .filter(
        (asignacion) =>
          asignacion.usuario.estado === EstadoUsuario.ACTIVO &&
          asignacion.usuario.rol === rolRelacionado &&
          alcance.has(asignacion.bodegaId),
      )
      .map(convertir);
  }

  async reemplazarAsignaciones(
    usuarioId: string,
    bodegaIds: string[],
    actor: UsuarioAutenticado,
  ): Promise<AsignacionesUsuarioPublicas> {
    const usuario = await this.obtenerUsuario(usuarioId);
    this.validarUsuarioAsignable(usuario);

    const bodegas = await this.obtenerBodegas(bodegaIds);
    this.validarBodegasSegunRol(usuario, bodegas);

    if (usuario.rol === RolUsuario.SUPERVISOR) {
      await this.validarStocksAntesDeReasignar(
        usuario.id,
        bodegas.map((bodega) => bodega.id),
      );
    }

    const tipoAsignacion = this.obtenerTipoAsignacion(usuario.rol);

    await this.dataSource.transaction(async (administrador) => {
      const repositorio =
        administrador.getRepository(UsuarioBodega);

      await repositorio.delete({ usuarioId });

      if (bodegas.length === 0) {
        return;
      }

      const nuevasAsignaciones = bodegas.map((bodega) =>
        repositorio.create({
          usuarioId: usuario.id,
          bodegaId: bodega.id,
          tipoAsignacion,
        }),
      );

      await repositorio.save(nuevasAsignaciones);
    });

    if (usuario.rol === RolUsuario.SUPERVISOR) {
      await this.sincronizarStocksSupervisor(usuario, bodegas);
    }

    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "asignaciones",
      accion: "reemplazar",
      registroId: usuario.id,
      descripcion:
        bodegaIds.length > 0
          ? `Actualización de asignaciones de ${usuario.nombre}. Bodegas asignadas: ${bodegas.map((bodega) => bodega.nombre).join(", ")}.`
          : `Se retiraron todas las asignaciones de ${usuario.nombre}.`,
    });

    return this.listarPorUsuario(usuarioId);
  }

  async eliminarAsignaciones(
    usuarioId: string,
    actor: UsuarioAutenticado,
  ): Promise<{ message: string }> {
    const usuario = await this.obtenerUsuario(usuarioId);
    this.validarUsuarioAsignable(usuario);

    if (usuario.rol === RolUsuario.SUPERVISOR) {
      await this.validarStocksAntesDeReasignar(usuario.id, []);
    }

    await this.asignacionesRepository.delete({ usuarioId });

    if (usuario.rol === RolUsuario.SUPERVISOR) {
      await this.sincronizarStocksSupervisor(usuario, []);
    }
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "asignaciones",
      accion: "eliminar",
      registroId: usuario.id,
      descripcion: `Eliminación de todas las asignaciones de ${usuario.nombre}.`,
    });

    return {
      message: "Asignaciones eliminadas correctamente.",
    };
  }

  private async obtenerUsuario(id: string): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException(
        "El usuario solicitado no existe.",
      );
    }

    return usuario;
  }

  private async obtenerBodegas(
    ids: string[],
  ): Promise<Bodega[]> {
    if (ids.length === 0) {
      return [];
    }

    const bodegas = await this.bodegasRepository.find({
      where: {
        id: In(ids),
      },
    });

    if (bodegas.length !== ids.length) {
      throw new NotFoundException(
        "Una o varias bodegas seleccionadas no existen.",
      );
    }

    const porId = new Map(
      bodegas.map((bodega) => [bodega.id, bodega]),
    );

    return ids.map((id) => porId.get(id)!);
  }

  private validarUsuarioAsignable(usuario: Usuario): void {
    if (usuario.esAdministradorGeneral) {
      throw new ForbiddenException(
        "El Administrador General no requiere asignaciones.",
      );
    }

    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      throw new ConflictException(
        "Los administradores tienen acceso completo y no requieren asignaciones.",
      );
    }

    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new ConflictException(
        "No se pueden asignar bodegas a un usuario inactivo.",
      );
    }
  }

  private validarBodegasSegunRol(
    usuario: Usuario,
    bodegas: Bodega[],
  ): void {
    for (const bodega of bodegas) {
      if (bodega.estado !== EstadoBodega.ACTIVA) {
        throw new ConflictException(
          `La bodega "${bodega.nombre}" está inactiva.`,
        );
      }

      if (!bodega.esSistema) {
        throw new ConflictException(
          `La bodega "${bodega.nombre}" no pertenece a la estructura oficial asignable.`,
        );
      }

      if (usuario.rol === RolUsuario.SUPERVISOR) {
        const permitida =
          bodega.tipo === TipoBodega.PRINCIPAL &&
          this.bodegasSupervisorPermitidas.has(bodega.nombre);

        if (!permitida) {
          throw new ConflictException(
            "Un Supervisor solo puede recibir Bodega Limpieza, Bodega Oficina o Gastronomía Tasty.",
          );
        }
      }

      if (usuario.rol === RolUsuario.RESPONSABLE) {
        const permitida =
          bodega.tipo === TipoBodega.SUCURSAL &&
          this.sucursalesResponsablePermitidas.has(
            bodega.nombre,
          );

        if (!permitida) {
          throw new ConflictException(
            "Un Responsable solo puede recibir sucursales Tasty 1 a Tasty 5.",
          );
        }
      }
    }
  }

  private async validarStocksAntesDeReasignar(
    supervisorId: string,
    bodegaIdsNuevas: string[],
  ): Promise<void> {
    const stocks = await this.bodegasRepository.find({
      where: {
        tipo: TipoBodega.STOCK_SUPERVISOR,
        supervisorId,
      },
    });

    const nuevas = new Set(bodegaIdsNuevas);

    for (const stock of stocks) {
      if (stock.bodegaPadreId && nuevas.has(stock.bodegaPadreId)) {
        continue;
      }

      const existenciasPendientes = await this.existenciasRepository.count({
        where: {
          bodegaId: stock.id,
          cantidad: MoreThan(0),
        },
      });

      if (existenciasPendientes > 0) {
        throw new ConflictException(
          "No se puede retirar esta asignación porque el Supervisor todavía tiene productos en stock. Debe distribuirlos o devolverlos al Inventario General.",
        );
      }
    }
  }

  private async sincronizarStocksSupervisor(
    supervisor: Usuario,
    bodegas: Bodega[],
  ): Promise<void> {
    const stocksActuales = await this.bodegasRepository.find({
      where: {
        tipo: TipoBodega.STOCK_SUPERVISOR,
        supervisorId: supervisor.id,
      },
    });

    const stocksPorPadre = new Map(
      stocksActuales
        .filter((stock) => stock.bodegaPadreId)
        .map((stock) => [stock.bodegaPadreId!, stock]),
    );

    const padresActivos = new Set<string>();

    for (const bodega of bodegas) {
      padresActivos.add(bodega.id);
      const existente = stocksPorPadre.get(bodega.id);

      if (existente) {
        if (existente.estado !== EstadoBodega.ACTIVA) {
          existente.estado = EstadoBodega.ACTIVA;
          await this.bodegasRepository.save(existente);
        }
        continue;
      }

      const stock = this.bodegasRepository.create({
        nombre: `Stock Supervisor ${supervisor.id} ${bodega.id}`,
        descripcion: `Stock interno de ${supervisor.nombre} para ${bodega.nombre}.`,
        tipo: TipoBodega.STOCK_SUPERVISOR,
        estado: EstadoBodega.ACTIVA,
        esSistema: true,
        bodegaPadreId: bodega.id,
        supervisorId: supervisor.id,
      });

      await this.bodegasRepository.save(stock);
    }

    for (const stock of stocksActuales) {
      if (
        stock.bodegaPadreId &&
        !padresActivos.has(stock.bodegaPadreId) &&
        stock.estado !== EstadoBodega.INACTIVA
      ) {
        stock.estado = EstadoBodega.INACTIVA;
        await this.bodegasRepository.save(stock);
      }
    }
  }

  private obtenerTipoAsignacion(
    rol: RolUsuario,
  ): TipoAsignacion {
    if (rol === RolUsuario.SUPERVISOR) {
      return TipoAsignacion.SUPERVISOR;
    }

    if (rol === RolUsuario.RESPONSABLE) {
      return TipoAsignacion.RESPONSABLE;
    }

    throw new ConflictException(
      "El rol del usuario no admite asignaciones.",
    );
  }

  private convertirAPublica(
    asignacion: UsuarioBodega,
  ): AsignacionPublica {
    return {
      id: asignacion.id,
      tipoAsignacion: asignacion.tipoAsignacion,
      createdAt: asignacion.createdAt,
      usuario: this.convertirUsuario(asignacion.usuario),
      bodega: {
        id: asignacion.bodega.id,
        nombre: asignacion.bodega.nombre,
        tipo: asignacion.bodega.tipo,
        estado: asignacion.bodega.estado,
        bodegaPadreId: asignacion.bodega.bodegaPadreId,
      },
    };
  }

  private convertirUsuario(usuario: Usuario): {
    id: string;
    nombre: string;
    correo: string;
    rol: RolUsuario;
    estado: EstadoUsuario;
  } {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      estado: usuario.estado,
    };
  }
}
