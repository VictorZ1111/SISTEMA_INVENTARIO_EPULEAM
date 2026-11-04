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
  Repository,
} from "typeorm";

import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { AuditoriaService } from "../auditoria/auditoria.service";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { EstadoBodega } from "../bodegas/enums/estado-bodega.enum";
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

  async listarDirectorio(
    actor: UsuarioAutenticado,
  ): Promise<AsignacionDirectorioPublica[]> {
    if (actor.rol === RolUsuario.ADMINISTRADOR) {
      const asignaciones = await this.listarTodas();
      return asignaciones.map((asignacion) =>
        this.convertirADirectorio(asignacion),
      );
    }

    const asignacionesPropias = await this.asignacionesRepository.find({
      where: {
        usuarioId: actor.id,
      },
      relations: {
        bodega: true,
      },
    });

    if (asignacionesPropias.length === 0) {
      return [];
    }

    let bodegaIdsVisibles: string[] = [];
    let rolVisible: RolUsuario;

    if (actor.rol === RolUsuario.SUPERVISOR) {
      const bodegasPrincipalesIds = Array.from(
        new Set(
          asignacionesPropias
            .map((asignacion) => asignacion.bodega.id)
            .filter(Boolean),
        ),
      );

      const sucursales = bodegasPrincipalesIds.length
        ? await this.bodegasRepository.find({
            where: {
              bodegaPadreId: In(bodegasPrincipalesIds),
              estado: EstadoBodega.ACTIVA,
            },
          })
        : [];

      bodegaIdsVisibles = sucursales.map((bodega) => bodega.id);
      rolVisible = RolUsuario.RESPONSABLE;
    } else {
      bodegaIdsVisibles = Array.from(
        new Set(
          asignacionesPropias
            .map((asignacion) => asignacion.bodega.bodegaPadreId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      rolVisible = RolUsuario.SUPERVISOR;
    }

    if (bodegaIdsVisibles.length === 0) {
      return [];
    }

    const asignacionesVisibles = await this.asignacionesRepository.find({
      where: {
        bodegaId: In(bodegaIdsVisibles),
        usuario: {
          rol: rolVisible,
          estado: EstadoUsuario.ACTIVO,
        },
      },
      relations: {
        usuario: true,
        bodega: true,
      },
      order: {
        createdAt: "ASC",
      },
    });

    return asignacionesVisibles.map((asignacion) =>
      this.convertirADirectorio(this.convertirAPublica(asignacion)),
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

  async reemplazarAsignaciones(
    usuarioId: string,
    bodegaIds: string[],
    actor: UsuarioAutenticado,
  ): Promise<AsignacionesUsuarioPublicas> {
    const usuario = await this.obtenerUsuario(usuarioId);
    this.validarUsuarioAsignable(usuario);

    const bodegas = await this.obtenerBodegas(bodegaIds);
    this.validarBodegasSegunRol(usuario, bodegas);

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

    await this.asignacionesRepository.delete({ usuarioId });
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

  private convertirADirectorio(
    asignacion: AsignacionPublica,
  ): AsignacionDirectorioPublica {
    return {
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
