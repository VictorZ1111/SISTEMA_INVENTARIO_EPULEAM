import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { AuditoriaService } from "../auditoria/auditoria.service";
import { Repository } from "typeorm";

import { ActualizarBodegaDto } from "./dto/actualizar-bodega.dto";
import { CrearBodegaDto } from "./dto/crear-bodega.dto";
import { Bodega } from "./entities/bodega.entity";
import { EstadoBodega } from "./enums/estado-bodega.enum";
import { TipoBodega } from "./enums/tipo-bodega.enum";

export interface BodegaPublica {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoBodega;
  estado: EstadoBodega;
  esSistema: boolean;
  bodegaPadreId: string | null;
  bodegaPadre: {
    id: string;
    nombre: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BodegaOficial {
  nombre: string;
  descripcion: string;
  tipo: TipoBodega;
  padre?: string;
}

@Injectable()
export class BodegasService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BodegasService.name);

  private readonly bodegasOficiales: BodegaOficial[] = [
    {
      nombre: "Inventario General",
      descripcion: "Bodega central del inventario institucional.",
      tipo: TipoBodega.INVENTARIO_GENERAL,
    },
    {
      nombre: "Bodega Limpieza",
      descripcion: "Bodega principal de productos e insumos de limpieza.",
      tipo: TipoBodega.PRINCIPAL,
    },
    {
      nombre: "Bodega Oficina",
      descripcion: "Bodega principal de materiales e insumos de oficina.",
      tipo: TipoBodega.PRINCIPAL,
    },
    {
      nombre: "Gastronomía Tasty",
      descripcion: "Bodega principal del área de gastronomía.",
      tipo: TipoBodega.PRINCIPAL,
    },
    ...Array.from({ length: 5 }, (_, indice) => ({
      nombre: `Tasty ${indice + 1}`,
      descripcion: `Sucursal gastronómica Tasty ${indice + 1}.`,
      tipo: TipoBodega.SUCURSAL,
      padre: "Gastronomía Tasty",
    })),
  ];

  constructor(
    @InjectRepository(Bodega)
    private readonly bodegasRepository: Repository<Bodega>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.asegurarBodegasOficiales();
  }

  async listar(): Promise<BodegaPublica[]> {
    const bodegas = await this.bodegasRepository.find({
      relations: {
        bodegaPadre: true,
      },
      order: {
        tipo: "ASC",
        nombre: "ASC",
      },
    });

    return bodegas.map((bodega) => this.convertirAPublica(bodega));
  }

  async listarActivas(): Promise<BodegaPublica[]> {
    const bodegas = await this.bodegasRepository.find({
      where: {
        estado: EstadoBodega.ACTIVA,
      },
      relations: {
        bodegaPadre: true,
      },
      order: {
        tipo: "ASC",
        nombre: "ASC",
      },
    });

    return bodegas.map((bodega) => this.convertirAPublica(bodega));
  }

  async buscarPublicaPorId(id: string): Promise<BodegaPublica> {
    const bodega = await this.obtenerPorId(id);
    return this.convertirAPublica(bodega);
  }

  async crear(dto: CrearBodegaDto, actor: UsuarioAutenticado): Promise<BodegaPublica> {
    await this.validarNombreDisponible(dto.nombre);

    if (dto.tipo === TipoBodega.INVENTARIO_GENERAL) {
      throw new ConflictException(
        "El sistema ya cuenta con un Inventario General.",
      );
    }

    const bodegaPadre = await this.validarJerarquia(
      dto.tipo,
      dto.bodegaPadreId ?? null,
    );

    const bodega = this.bodegasRepository.create({
      nombre: dto.nombre.trim(),
      descripcion: this.normalizarDescripcion(dto.descripcion),
      tipo: dto.tipo,
      estado: EstadoBodega.ACTIVA,
      esSistema: false,
      bodegaPadreId: bodegaPadre?.id ?? null,
    });

    const guardada = await this.bodegasRepository.save(bodega);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "bodegas",
      accion: "crear",
      registroId: guardada.id,
      descripcion: `Creación de la bodega ${guardada.nombre}.`,
    });
    return this.buscarPublicaPorId(guardada.id);
  }

  async actualizar(
    id: string,
    dto: ActualizarBodegaDto,
    actor: UsuarioAutenticado,
  ): Promise<BodegaPublica> {
    const bodega = await this.obtenerPorId(id);
    this.validarNoProtegida(bodega);

    const tipoFinal = dto.tipo ?? bodega.tipo;
    const padreFinal =
      dto.bodegaPadreId !== undefined
        ? dto.bodegaPadreId
        : bodega.bodegaPadreId;

    if (tipoFinal === TipoBodega.INVENTARIO_GENERAL) {
      throw new ConflictException(
        "No se puede crear otro Inventario General.",
      );
    }

    if (dto.nombre !== undefined) {
      await this.validarNombreDisponible(dto.nombre, id);
      bodega.nombre = dto.nombre.trim();
    }

    if (dto.descripcion !== undefined) {
      bodega.descripcion = this.normalizarDescripcion(dto.descripcion);
    }

    const bodegaPadre = await this.validarJerarquia(
      tipoFinal,
      padreFinal,
      bodega.id,
    );

    bodega.tipo = tipoFinal;
    bodega.bodegaPadreId = bodegaPadre?.id ?? null;

    await this.bodegasRepository.save(bodega);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "bodegas",
      accion: "editar",
      registroId: bodega.id,
      descripcion: `Edición de la bodega ${bodega.nombre}.`,
    });
    return this.buscarPublicaPorId(id);
  }

  async cambiarEstado(
    id: string,
    estado: EstadoBodega,
    actor: UsuarioAutenticado,
  ): Promise<BodegaPublica> {
    const bodega = await this.obtenerPorId(id);
    this.validarNoProtegida(bodega);

    if (estado === EstadoBodega.INACTIVA) {
      const sucursalesActivas = await this.bodegasRepository.count({
        where: {
          bodegaPadreId: id,
          estado: EstadoBodega.ACTIVA,
        },
      });

      if (sucursalesActivas > 0) {
        throw new ConflictException(
          "No se puede inactivar una bodega que tiene sucursales activas.",
        );
      }
    }

    bodega.estado = estado;
    await this.bodegasRepository.save(bodega);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "bodegas",
      accion: estado === EstadoBodega.ACTIVA ? "activar" : "inactivar",
      registroId: bodega.id,
      descripcion: `${estado === EstadoBodega.ACTIVA ? "Activación" : "Inactivación"} de la bodega ${bodega.nombre}.`,
    });

    return this.buscarPublicaPorId(id);
  }

  async eliminar(id: string): Promise<{ message: string }> {
    const bodega = await this.obtenerPorId(id);
    this.validarNoProtegida(bodega);

    const sucursales = await this.bodegasRepository.count({
      where: {
        bodegaPadreId: id,
      },
    });

    if (sucursales > 0) {
      throw new ConflictException(
        "No se puede eliminar una bodega que contiene sucursales.",
      );
    }

    const asignaciones = await this.bodegasRepository
      .createQueryBuilder("bodega")
      .leftJoin("bodega.asignaciones", "asignacion")
      .where("bodega.id = :id", { id })
      .andWhere("asignacion.id IS NOT NULL")
      .getCount();

    if (asignaciones > 0) {
      throw new ConflictException(
        "No se puede eliminar una bodega que tiene usuarios asignados.",
      );
    }

    await this.bodegasRepository.remove(bodega);

    return {
      message: "Bodega eliminada correctamente.",
    };
  }

  convertirAPublica(bodega: Bodega): BodegaPublica {
    return {
      id: bodega.id,
      nombre: bodega.nombre,
      descripcion: bodega.descripcion,
      tipo: bodega.tipo,
      estado: bodega.estado,
      esSistema: bodega.esSistema,
      bodegaPadreId: bodega.bodegaPadreId,
      bodegaPadre: bodega.bodegaPadre
        ? {
            id: bodega.bodegaPadre.id,
            nombre: bodega.bodegaPadre.nombre,
          }
        : null,
      createdAt: bodega.createdAt,
      updatedAt: bodega.updatedAt,
    };
  }

  private async obtenerPorId(id: string): Promise<Bodega> {
    const bodega = await this.bodegasRepository.findOne({
      where: { id },
      relations: {
        bodegaPadre: true,
      },
    });

    if (!bodega) {
      throw new NotFoundException("La bodega solicitada no existe.");
    }

    return bodega;
  }

  private async validarNombreDisponible(
    nombre: string,
    idExcluido?: string,
  ): Promise<void> {
    const nombreNormalizado = nombre.trim().toLowerCase();

    const consulta = this.bodegasRepository
      .createQueryBuilder("bodega")
      .where("LOWER(TRIM(bodega.nombre)) = :nombre", {
        nombre: nombreNormalizado,
      });

    if (idExcluido) {
      consulta.andWhere("bodega.id <> :idExcluido", { idExcluido });
    }

    if ((await consulta.getCount()) > 0) {
      throw new ConflictException(
        "Ya existe una bodega con ese nombre.",
      );
    }
  }

  private async validarJerarquia(
    tipo: TipoBodega,
    bodegaPadreId: string | null,
    bodegaActualId?: string,
  ): Promise<Bodega | null> {
    if (tipo === TipoBodega.PRINCIPAL) {
      if (bodegaPadreId) {
        throw new ConflictException(
          "Una bodega principal no puede depender de otra bodega.",
        );
      }

      return null;
    }

    if (tipo !== TipoBodega.SUCURSAL) {
      return null;
    }

    if (!bodegaPadreId) {
      throw new ConflictException(
        "Una sucursal debe pertenecer a una bodega principal.",
      );
    }

    if (bodegaActualId && bodegaPadreId === bodegaActualId) {
      throw new ConflictException(
        "Una bodega no puede ser su propia bodega padre.",
      );
    }

    const padre = await this.bodegasRepository.findOne({
      where: {
        id: bodegaPadreId,
      },
    });

    if (!padre) {
      throw new NotFoundException(
        "La bodega principal seleccionada no existe.",
      );
    }

    if (padre.tipo !== TipoBodega.PRINCIPAL) {
      throw new ConflictException(
        "Una sucursal solo puede depender de una bodega principal.",
      );
    }

    if (padre.estado !== EstadoBodega.ACTIVA) {
      throw new ConflictException(
        "La bodega principal seleccionada está inactiva.",
      );
    }

    return padre;
  }

  private normalizarDescripcion(
    descripcion?: string,
  ): string | null {
    const valor = descripcion?.trim();
    return valor ? valor : null;
  }

  private validarNoProtegida(bodega: Bodega): void {
    if (bodega.esSistema) {
      throw new ForbiddenException(
        "Esta bodega pertenece a la estructura oficial del sistema y está protegida.",
      );
    }
  }

  private async asegurarBodegasOficiales(): Promise<void> {
    const creadas = new Map<string, Bodega>();

    for (const oficial of this.bodegasOficiales.filter(
      (bodega) => !bodega.padre,
    )) {
      const bodega = await this.crearOActualizarOficial(oficial, null);
      creadas.set(oficial.nombre, bodega);
    }

    for (const oficial of this.bodegasOficiales.filter(
      (bodega) => bodega.padre,
    )) {
      const padre = creadas.get(oficial.padre!);

      if (!padre) {
        throw new Error(
          `No se pudo resolver la bodega padre de ${oficial.nombre}.`,
        );
      }

      const bodega = await this.crearOActualizarOficial(
        oficial,
        padre.id,
      );
      creadas.set(oficial.nombre, bodega);
    }

    this.logger.log(
      "Estructura oficial de bodegas verificada correctamente.",
    );
  }

  private async crearOActualizarOficial(
    oficial: BodegaOficial,
    bodegaPadreId: string | null,
  ): Promise<Bodega> {
    let bodega = await this.bodegasRepository
      .createQueryBuilder("bodega")
      .where("LOWER(TRIM(bodega.nombre)) = :nombre", {
        nombre: oficial.nombre.toLowerCase(),
      })
      .getOne();

    if (!bodega) {
      bodega = this.bodegasRepository.create({
        nombre: oficial.nombre,
        descripcion: oficial.descripcion,
        tipo: oficial.tipo,
        estado: EstadoBodega.ACTIVA,
        esSistema: true,
        bodegaPadreId,
      });
    } else {
      bodega.nombre = oficial.nombre;
      bodega.descripcion = oficial.descripcion;
      bodega.tipo = oficial.tipo;
      bodega.estado = EstadoBodega.ACTIVA;
      bodega.esSistema = true;
      bodega.bodegaPadreId = bodegaPadreId;
    }

    return this.bodegasRepository.save(bodega);
  }
}
