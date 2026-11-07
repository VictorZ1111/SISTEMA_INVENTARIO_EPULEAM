import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

import { LIMITE_REVERSA_MS } from "../../comun/constantes/reversiones";

import { UsuarioBodega } from "../asignaciones/entities/usuario-bodega.entity";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { EstadoBodega } from "../bodegas/enums/estado-bodega.enum";
import { TipoBodega } from "../bodegas/enums/tipo-bodega.enum";
import { Existencia } from "../inventario/entities/existencia.entity";
import { Movimiento } from "../movimientos/entities/movimiento.entity";
import { TipoMovimiento } from "../movimientos/enums/tipo-movimiento.enum";
import { Producto } from "../productos/entities/producto.entity";
import { EstadoProducto } from "../productos/enums/estado-producto.enum";
import { EstadoUsuario } from "../usuarios/enums/estado-usuario.enum";
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import { AtenderSolicitudDto } from "./dto/atender-solicitud.dto";
import { CrearSolicitudDto } from "./dto/crear-solicitud.dto";
import { FiltrarSolicitudesDto } from "./dto/filtrar-solicitudes.dto";
import { RechazarSolicitudDto } from "./dto/rechazar-solicitud.dto";
import { RevertirSolicitudDto } from "./dto/revertir-solicitud.dto";
import { ReversaSolicitud } from "./entities/reversa-solicitud.entity";
import { SolicitudDetalle } from "./entities/solicitud-detalle.entity";
import { Solicitud } from "./entities/solicitud.entity";
import { EstadoSolicitud } from "./enums/estado-solicitud.enum";

export interface SolicitudPublica {
  id: string;
  codigo: string;
  estado: EstadoSolicitud;
  observacionSolicitante: string | null;
  observacionAtencion: string | null;
  createdAt: Date;
  updatedAt: Date;
  atendidaAt: Date | null;
  usuarioSolicitante: {
    id: string;
    nombre: string;
    correo: string;
    rol: RolUsuario;
  };
  usuarioAtencion: {
    id: string;
    nombre: string;
    rol: RolUsuario;
  } | null;
  reversa: {
    id: string;
    motivo: string;
    createdAt: Date;
    usuario: {
      id: string;
      nombre: string;
      rol: RolUsuario;
    };
  } | null;
  bodegaSolicitante: {
    id: string;
    nombre: string;
    tipo: TipoBodega;
  };
  detalles: Array<{
    id: string;
    producto: {
      id: string;
      codigo: string;
      nombre: string;
      tipoProducto: string;
      atributo: string | null;
    };
    cantidadSolicitada: number;
    cantidadEntregada: number;
    cantidadRechazada: number;
    cantidadPendiente: number;
  }>;
}

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private readonly solicitudesRepository: Repository<Solicitud>,
    @InjectRepository(SolicitudDetalle)
    private readonly detallesRepository: Repository<SolicitudDetalle>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Bodega)
    private readonly bodegasRepository: Repository<Bodega>,
    @InjectRepository(UsuarioBodega)
    private readonly asignacionesRepository: Repository<UsuarioBodega>,
    private readonly dataSource: DataSource,
  ) {}

  async crear(
    dto: CrearSolicitudDto,
    usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      throw new ForbiddenException(
        "Los administradores atienden solicitudes y no requieren crearlas.",
      );
    }

    const bodega = await this.obtenerBodega(dto.bodegaSolicitanteId);
    this.validarBodegaActiva(bodega);
    await this.validarBodegaAsignada(usuario, bodega);
    this.validarBodegaSegunRol(usuario, bodega);

    const productoIds = dto.detalles.map(
      (detalle) => detalle.productoId,
    );

    if (new Set(productoIds).size !== productoIds.length) {
      throw new ConflictException(
        "No se puede repetir un producto dentro de la misma solicitud.",
      );
    }

    const productos = await this.productosRepository.find({
      where: {
        id: In(productoIds),
      },
    });

    if (productos.length !== productoIds.length) {
      throw new NotFoundException(
        "Uno o varios productos seleccionados no existen.",
      );
    }

    if (
      productos.some(
        (producto) => producto.estado !== EstadoProducto.ACTIVO,
      )
    ) {
      throw new ConflictException(
        "No se pueden solicitar productos inactivos.",
      );
    }

    const solicitudId = await this.dataSource.transaction(
      async (administrador) => {
        const solicitudes = administrador.getRepository(Solicitud);
        const detalles = administrador.getRepository(SolicitudDetalle);

        const solicitud = solicitudes.create({
          codigo: await this.generarCodigo(),
          usuarioSolicitanteId: usuario.id,
          bodegaSolicitanteId: bodega.id,
          estado: EstadoSolicitud.PENDIENTE,
          observacionSolicitante: this.normalizarObservacion(
            dto.observacionSolicitante,
          ),
          observacionAtencion: null,
          usuarioAtencionId: null,
          atendidaAt: null,
        });

        const guardada = await solicitudes.save(solicitud);

        await detalles.save(
          dto.detalles.map((detalle) =>
            detalles.create({
              solicitudId: guardada.id,
              productoId: detalle.productoId,
              cantidadSolicitada: detalle.cantidadSolicitada,
              cantidadEntregada: 0,
              cantidadRechazada: 0,
              cantidadPendiente: detalle.cantidadSolicitada,
            }),
          ),
        );

        return guardada.id;
      },
    );

    return this.buscarPorId(solicitudId, usuario);
  }

  async atender(
    id: string,
    dto: AtenderSolicitudDto,
    usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    const detalleIds = dto.detalles.map(
      (detalle) => detalle.detalleId,
    );

    if (new Set(detalleIds).size !== detalleIds.length) {
      throw new ConflictException(
        "No se puede atender dos veces el mismo detalle en una operación.",
      );
    }

    await this.dataSource.transaction(async (administrador) => {
      const solicitud = await this.obtenerSolicitudBloqueada(
        administrador,
        id,
      );

      this.validarSolicitudAbierta(solicitud);

      const rutaAtencion = await this.resolverRutaAtencionSolicitud(
        administrador,
        solicitud.bodegaSolicitante,
      );

      for (const atencion of dto.detalles) {
        const detalle = solicitud.detalles.find(
          (item) => item.id === atencion.detalleId,
        );

        if (!detalle) {
          throw new NotFoundException(
            "Uno de los detalles no pertenece a la solicitud.",
          );
        }

        const totalResolver =
          atencion.cantidadEntregada +
          atencion.cantidadRechazada;

        if (totalResolver <= 0) {
          throw new ConflictException(
            "Cada detalle atendido debe entregar o rechazar al menos una unidad.",
          );
        }

        if (totalResolver > detalle.cantidadPendiente) {
          throw new ConflictException(
            `No se pueden resolver más de ${detalle.cantidadPendiente} unidades pendientes del producto "${detalle.producto.nombre}".`,
          );
        }

        if (atencion.cantidadEntregada > 0) {
          await this.transferirPorSolicitud(
            administrador,
            solicitud,
            detalle,
            rutaAtencion.origen,
            rutaAtencion.destinoStock,
            atencion.cantidadEntregada,
            usuario.id,
            dto.observacionAtencion,
          );
        }

        detalle.cantidadEntregada +=
          atencion.cantidadEntregada;
        detalle.cantidadRechazada +=
          atencion.cantidadRechazada;
        detalle.cantidadPendiente -= totalResolver;

        await administrador
          .getRepository(SolicitudDetalle)
          .save(detalle);
      }

      solicitud.estado = this.calcularEstado(solicitud.detalles);
      solicitud.observacionAtencion =
        this.normalizarObservacion(dto.observacionAtencion);
      solicitud.usuarioAtencionId = usuario.id;
      solicitud.atendidaAt = new Date();

      await administrador
        .getRepository(Solicitud)
        .save(solicitud);
    });

    return this.buscarPorId(id, usuario);
  }

  async rechazar(
    id: string,
    dto: RechazarSolicitudDto,
    usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    await this.dataSource.transaction(async (administrador) => {
      const solicitud = await this.obtenerSolicitudBloqueada(
        administrador,
        id,
      );

      this.validarSolicitudAbierta(solicitud);

      for (const detalle of solicitud.detalles) {
        detalle.cantidadRechazada +=
          detalle.cantidadPendiente;
        detalle.cantidadPendiente = 0;

        await administrador
          .getRepository(SolicitudDetalle)
          .save(detalle);
      }

      solicitud.estado = this.calcularEstado(solicitud.detalles);
      solicitud.observacionAtencion =
        dto.observacionAtencion.trim();
      solicitud.usuarioAtencionId = usuario.id;
      solicitud.atendidaAt = new Date();

      await administrador
        .getRepository(Solicitud)
        .save(solicitud);
    });

    return this.buscarPorId(id, usuario);
  }

  async revertir(
    id: string,
    dto: RevertirSolicitudDto,
    usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    await this.dataSource.transaction(async (administrador) => {
      const solicitud = await this.obtenerSolicitudBloqueada(
        administrador,
        id,
      );

      if (
        solicitud.estado !== EstadoSolicitud.ATENDIDA &&
        solicitud.estado !== EstadoSolicitud.PARCIAL &&
        solicitud.estado !== EstadoSolicitud.RECHAZADA
      ) {
        throw new ConflictException(
          "La solicitud no tiene una atención o rechazo disponible para revertir.",
        );
      }

      if (!solicitud.atendidaAt) {
        throw new ConflictException(
          "La solicitud no tiene una fecha de atención válida.",
        );
      }

      const reversaExistente = await administrador
        .getRepository(ReversaSolicitud)
        .findOne({
          where: {
            solicitudId: solicitud.id,
          },
        });

      if (reversaExistente) {
        throw new ConflictException(
          "La solicitud ya fue revertida anteriormente.",
        );
      }

      const limiteReversa = new Date(
        solicitud.atendidaAt.getTime() + LIMITE_REVERSA_MS,
      );

      if (new Date() > limiteReversa) {
        throw new ConflictException(
          "La solicitud ya superó el límite de 3 horas para realizar la reversa.",
        );
      }

      const eraRechazada =
        solicitud.estado === EstadoSolicitud.RECHAZADA;

      if (!eraRechazada) {
        for (const detalle of solicitud.detalles) {
          if (detalle.cantidadEntregada <= 0) {
            continue;
          }

          const movimientosEntrega = await administrador
            .getRepository(Movimiento)
            .find({
              where: {
                solicitudId: solicitud.id,
                solicitudDetalleId: detalle.id,
                tipo: TipoMovimiento.TRANSFERENCIA,
              },
              order: {
                createdAt: "ASC",
              },
            });

          const cantidadRegistrada = movimientosEntrega.reduce(
            (total, movimiento) => total + movimiento.cantidad,
            0,
          );

          if (cantidadRegistrada !== detalle.cantidadEntregada) {
            throw new ConflictException(
              `No se puede revertir "${detalle.producto.nombre}" porque el historial de entregas no coincide con la cantidad registrada.`,
            );
          }

          for (const movimiento of movimientosEntrega) {
            if (!movimiento.bodegaOrigenId || !movimiento.bodegaDestinoId) {
              throw new ConflictException(
                `No se puede revertir "${detalle.producto.nombre}" porque una entrega no tiene origen o destino válido.`,
              );
            }

            const [origenReversa, destinoReversa] = await Promise.all([
              administrador.getRepository(Bodega).findOne({
                where: { id: movimiento.bodegaDestinoId },
              }),
              administrador.getRepository(Bodega).findOne({
                where: { id: movimiento.bodegaOrigenId },
              }),
            ]);

            if (!origenReversa || !destinoReversa) {
              throw new NotFoundException(
                "No se pudo reconstruir la ruta original de una entrega.",
              );
            }

            await this.revertirTransferenciaSolicitud(
              administrador,
              solicitud,
              detalle,
              movimiento,
              origenReversa,
              destinoReversa,
              movimiento.cantidad,
              usuario.id,
              dto.motivo,
            );
          }
        }
      }

      for (const detalle of solicitud.detalles) {
        detalle.cantidadEntregada = 0;
        detalle.cantidadRechazada = 0;
        detalle.cantidadPendiente =
          detalle.cantidadSolicitada;

        await administrador
          .getRepository(SolicitudDetalle)
          .save(detalle);
      }

      solicitud.estado = EstadoSolicitud.PENDIENTE;
      solicitud.observacionAtencion = dto.motivo.trim();
      solicitud.usuarioAtencionId = usuario.id;
      solicitud.atendidaAt = null;

      await administrador
        .getRepository(Solicitud)
        .save(solicitud);

      const reversa = administrador
        .getRepository(ReversaSolicitud)
        .create({
          solicitudId: solicitud.id,
          usuarioId: usuario.id,
          motivo: dto.motivo.trim(),
        });

      await administrador
        .getRepository(ReversaSolicitud)
        .save(reversa);
    });

    return this.buscarPorId(id, usuario);
  }

  async listar(
    filtros: FiltrarSolicitudesDto,
  ): Promise<SolicitudPublica[]> {
    const solicitudes = await this.aplicarFiltros(
      this.crearConsultaBase(),
      filtros,
    )
      .orderBy("solicitud.createdAt", "DESC")
      .addOrderBy("detalle.id", "ASC")
      .getMany();

    return solicitudes.map((solicitud) =>
      this.convertirAPublica(solicitud),
    );
  }

  async listarMias(
    usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica[]> {
    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      return this.listar({});
    }

    const solicitudes = await this.crearConsultaBase()
      .where(
        "solicitud.usuarioSolicitanteId = :usuarioId",
        { usuarioId: usuario.id },
      )
      .orderBy("solicitud.createdAt", "DESC")
      .addOrderBy("detalle.id", "ASC")
      .getMany();

    return solicitudes.map((solicitud) =>
      this.convertirAPublica(solicitud),
    );
  }

  async buscarPorId(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    const solicitud = await this.crearConsultaBase()
      .where("solicitud.id = :id", { id })
      .getOne();

    if (!solicitud) {
      throw new NotFoundException(
        "La solicitud solicitada no existe.",
      );
    }

    if (
      usuario.rol !== RolUsuario.ADMINISTRADOR &&
      solicitud.usuarioSolicitanteId !== usuario.id
    ) {
      throw new ForbiddenException(
        "No tienes acceso a esta solicitud.",
      );
    }

    return this.convertirAPublica(solicitud);
  }

  private crearConsultaBase(): SelectQueryBuilder<Solicitud> {
    return this.solicitudesRepository
      .createQueryBuilder("solicitud")
      .leftJoinAndSelect(
        "solicitud.usuarioSolicitante",
        "usuarioSolicitante",
      )
      .leftJoinAndSelect(
        "solicitud.usuarioAtencion",
        "usuarioAtencion",
      )
      .leftJoinAndSelect("solicitud.reversa", "reversa")
      .leftJoinAndSelect("reversa.usuario", "usuarioReversa")
      .leftJoinAndSelect(
        "solicitud.bodegaSolicitante",
        "bodegaSolicitante",
      )
      .leftJoinAndSelect("solicitud.detalles", "detalle")
      .leftJoinAndSelect("detalle.producto", "producto");
  }

  private aplicarFiltros(
    consulta: SelectQueryBuilder<Solicitud>,
    filtros: FiltrarSolicitudesDto,
  ): SelectQueryBuilder<Solicitud> {
    if (filtros.estado) {
      consulta.andWhere("solicitud.estado = :estado", {
        estado: filtros.estado,
      });
    }

    if (filtros.bodegaId) {
      consulta.andWhere(
        "solicitud.bodegaSolicitanteId = :bodegaId",
        { bodegaId: filtros.bodegaId },
      );
    }

    if (filtros.usuarioId) {
      consulta.andWhere(
        "solicitud.usuarioSolicitanteId = :usuarioId",
        { usuarioId: filtros.usuarioId },
      );
    }

    if (filtros.buscar?.trim()) {
      const buscar = `%${filtros.buscar.trim().toLowerCase()}%`;

      consulta.andWhere(
        `(LOWER(solicitud.codigo) LIKE :buscar
          OR LOWER(usuarioSolicitante.nombre) LIKE :buscar
          OR LOWER(bodegaSolicitante.nombre) LIKE :buscar
          OR LOWER(producto.codigo) LIKE :buscar
          OR LOWER(producto.nombre) LIKE :buscar
          OR LOWER(COALESCE(solicitud.observacionSolicitante, '')) LIKE :buscar
          OR LOWER(COALESCE(solicitud.observacionAtencion, '')) LIKE :buscar)`,
        { buscar },
      );
    }

    return consulta;
  }

  private async obtenerSolicitudBloqueada(
    administrador: EntityManager,
    id: string,
  ): Promise<Solicitud> {
    const repositorio = administrador.getRepository(Solicitud);

    const solicitudBloqueada = await repositorio
      .createQueryBuilder("solicitud")
      .setLock("pessimistic_write")
      .where("solicitud.id = :id", { id })
      .getOne();

    if (!solicitudBloqueada) {
      throw new NotFoundException(
        "La solicitud solicitada no existe.",
      );
    }

    const solicitud = await repositorio
      .createQueryBuilder("solicitud")
      .innerJoinAndSelect(
        "solicitud.bodegaSolicitante",
        "bodegaSolicitante",
      )
      .innerJoinAndSelect("solicitud.detalles", "detalle")
      .innerJoinAndSelect("detalle.producto", "producto")
      .where("solicitud.id = :id", { id })
      .getOne();

    if (!solicitud) {
      throw new NotFoundException(
        "No se pudieron cargar los datos completos de la solicitud.",
      );
    }

    return solicitud;
  }

  private validarSolicitudAbierta(solicitud: Solicitud): void {
    if (
      solicitud.estado === EstadoSolicitud.ATENDIDA ||
      solicitud.estado === EstadoSolicitud.RECHAZADA
    ) {
      throw new ConflictException(
        "La solicitud ya está cerrada y no puede volver a atenderse.",
      );
    }

    if (
      solicitud.detalles.every(
        (detalle) => detalle.cantidadPendiente === 0,
      )
    ) {
      throw new ConflictException(
        "La solicitud no tiene cantidades pendientes.",
      );
    }
  }

  private async resolverRutaAtencionSolicitud(
    administrador: EntityManager,
    bodegaSolicitante: Bodega,
  ): Promise<{
    origen: Bodega;
    destinoStock: Bodega;
    area: Bodega;
  }> {
    const repositorio = administrador.getRepository(Bodega);

    const origen = await repositorio.findOne({
      where: {
        tipo: TipoBodega.INVENTARIO_GENERAL,
        estado: EstadoBodega.ACTIVA,
      },
    });

    if (!origen) {
      throw new NotFoundException(
        "No se encontró el Inventario General activo.",
      );
    }

    let area = bodegaSolicitante;

    if (bodegaSolicitante.tipo === TipoBodega.SUCURSAL) {
      if (!bodegaSolicitante.bodegaPadreId) {
        throw new ConflictException(
          "La sucursal solicitante no tiene una bodega principal asociada.",
        );
      }

      const bodegaPadre = await repositorio.findOne({
        where: {
          id: bodegaSolicitante.bodegaPadreId,
        },
      });

      if (!bodegaPadre) {
        throw new NotFoundException(
          "No se encontró la bodega principal de la sucursal.",
        );
      }

      area = bodegaPadre;
    }

    if (area.tipo !== TipoBodega.PRINCIPAL) {
      throw new ConflictException(
        "La solicitud debe pertenecer a una bodega principal o a una de sus sucursales.",
      );
    }

    this.validarBodegaActiva(area);

    const stocks = await repositorio
      .createQueryBuilder("stock")
      .innerJoinAndSelect("stock.supervisor", "supervisor")
      .where("stock.tipo = :tipoStock", {
        tipoStock: TipoBodega.STOCK_SUPERVISOR,
      })
      .andWhere("stock.estado = :estadoStock", {
        estadoStock: EstadoBodega.ACTIVA,
      })
      .andWhere("stock.bodegaPadreId = :areaId", {
        areaId: area.id,
      })
      .andWhere("supervisor.rol = :rolSupervisor", {
        rolSupervisor: RolUsuario.SUPERVISOR,
      })
      .andWhere("supervisor.estado = :estadoSupervisor", {
        estadoSupervisor: EstadoUsuario.ACTIVO,
      })
      .getMany();

    if (stocks.length === 0) {
      throw new ConflictException(
        `No existe un Supervisor activo con stock asignado para "${area.nombre}".`,
      );
    }

    if (stocks.length > 1) {
      throw new ConflictException(
        `La bodega "${area.nombre}" tiene más de un stock de Supervisor activo. Corrige las asignaciones antes de atender solicitudes.`,
      );
    }

    return {
      origen,
      destinoStock: stocks[0],
      area,
    };
  }

  private async transferirPorSolicitud(
    administrador: EntityManager,
    solicitud: Solicitud,
    detalle: SolicitudDetalle,
    origen: Bodega,
    destino: Bodega,
    cantidad: number,
    usuarioId: string,
    observacion?: string,
  ): Promise<void> {
    const existencias = administrador.getRepository(Existencia);

    const existenciaOrigen = await existencias.findOne({
      where: {
        productoId: detalle.productoId,
        bodegaId: origen.id,
      },
      lock: {
        mode: "pessimistic_write",
      },
    });

    if (!existenciaOrigen) {
      throw new ConflictException(
        `El producto "${detalle.producto.nombre}" no tiene existencias en "${origen.nombre}".`,
      );
    }

    if (existenciaOrigen.cantidad < cantidad) {
      throw new ConflictException(
        `Stock insuficiente de "${detalle.producto.nombre}" en "${origen.nombre}". Disponible: ${existenciaOrigen.cantidad}.`,
      );
    }

    let existenciaDestino = await existencias.findOne({
      where: {
        productoId: detalle.productoId,
        bodegaId: destino.id,
      },
      lock: {
        mode: "pessimistic_write",
      },
    });

    if (!existenciaDestino) {
      existenciaDestino = existencias.create({
        productoId: detalle.productoId,
        bodegaId: destino.id,
        cantidad: 0,
      });
    }

    existenciaOrigen.cantidad -= cantidad;
    existenciaDestino.cantidad += cantidad;

    await existencias.save([
      existenciaOrigen,
      existenciaDestino,
    ]);

    const movimiento = administrador
      .getRepository(Movimiento)
      .create({
        tipo: TipoMovimiento.TRANSFERENCIA,
        productoId: detalle.productoId,
        bodegaOrigenId: origen.id,
        bodegaDestinoId: destino.id,
        usuarioId,
        solicitudId: solicitud.id,
        solicitudDetalleId: detalle.id,
        cantidad,
        cantidadAnterior: null,
        cantidadNueva: null,
        observacion:
          this.normalizarObservacion(observacion) ??
          `Atención de solicitud ${solicitud.codigo}`,
      });

    await administrador
      .getRepository(Movimiento)
      .save(movimiento);
  }

  private async revertirTransferenciaSolicitud(
    administrador: EntityManager,
    solicitud: Solicitud,
    detalle: SolicitudDetalle,
    movimientoOriginal: Movimiento,
    origenReversa: Bodega,
    destinoReversa: Bodega,
    cantidad: number,
    usuarioId: string,
    motivo: string,
  ): Promise<void> {
    const existencias = administrador.getRepository(Existencia);

    const existenciaOrigen = await existencias.findOne({
      where: {
        productoId: detalle.productoId,
        bodegaId: origenReversa.id,
      },
      lock: {
        mode: "pessimistic_write",
      },
    });

    if (
      !existenciaOrigen ||
      existenciaOrigen.cantidad < cantidad
    ) {
      const disponible = existenciaOrigen?.cantidad ?? 0;

      throw new ConflictException(
        `No se puede revertir "${detalle.producto.nombre}". La bodega "${origenReversa.nombre}" necesita ${cantidad} unidades y solo dispone de ${disponible}.`,
      );
    }

    let existenciaDestino = await existencias.findOne({
      where: {
        productoId: detalle.productoId,
        bodegaId: destinoReversa.id,
      },
      lock: {
        mode: "pessimistic_write",
      },
    });

    if (!existenciaDestino) {
      existenciaDestino = existencias.create({
        productoId: detalle.productoId,
        bodegaId: destinoReversa.id,
        cantidad: 0,
      });
    }

    existenciaOrigen.cantidad -= cantidad;
    existenciaDestino.cantidad += cantidad;

    await existencias.save([
      existenciaOrigen,
      existenciaDestino,
    ]);

    const movimiento = administrador
      .getRepository(Movimiento)
      .create({
        tipo: TipoMovimiento.MODIFICACION,
        productoId: detalle.productoId,
        bodegaOrigenId: origenReversa.id,
        bodegaDestinoId: destinoReversa.id,
        usuarioId,
        solicitudId: solicitud.id,
        solicitudDetalleId: detalle.id,
        movimientoOriginalId: movimientoOriginal.id,
        cantidad,
        cantidadAnterior: null,
        cantidadNueva: null,
        observacion: motivo.trim(),
        modulo: "solicitudes",
        accion: "revertir_atencion",
        registroId: solicitud.id,
      });

    await administrador
      .getRepository(Movimiento)
      .save(movimiento);
  }

  private calcularEstado(
    detalles: SolicitudDetalle[],
  ): EstadoSolicitud {
    const pendienteTotal = detalles.reduce(
      (total, detalle) =>
        total + detalle.cantidadPendiente,
      0,
    );

    const entregadaTotal = detalles.reduce(
      (total, detalle) =>
        total + detalle.cantidadEntregada,
      0,
    );

    if (pendienteTotal > 0) {
      return EstadoSolicitud.PARCIAL;
    }

    if (entregadaTotal > 0) {
      return EstadoSolicitud.ATENDIDA;
    }

    return EstadoSolicitud.RECHAZADA;
  }

  private async obtenerBodega(id: string): Promise<Bodega> {
    const bodega = await this.bodegasRepository.findOne({
      where: { id },
    });

    if (!bodega) {
      throw new NotFoundException(
        "La bodega solicitante no existe.",
      );
    }

    return bodega;
  }

  private validarBodegaActiva(bodega: Bodega): void {
    if (bodega.estado !== EstadoBodega.ACTIVA) {
      throw new ConflictException(
        `La bodega "${bodega.nombre}" está inactiva.`,
      );
    }
  }

  private async validarBodegaAsignada(
    usuario: UsuarioAutenticado,
    bodega: Bodega,
  ): Promise<void> {
    const asignacionDirecta = await this.asignacionesRepository.findOne({
      where: {
        usuarioId: usuario.id,
        bodegaId: bodega.id,
      },
    });

    if (asignacionDirecta) {
      return;
    }

    // Regla especial de Gastronomía: el Supervisor se asigna a la bodega
    // principal "Gastronomía Tasty", pero opera solicitudes sobre sus
    // sucursales Tasty 1–5. No necesita una asignación duplicada por sucursal.
    if (
      usuario.rol === RolUsuario.SUPERVISOR &&
      bodega.tipo === TipoBodega.SUCURSAL &&
      bodega.bodegaPadreId
    ) {
      const asignacionPadre = await this.asignacionesRepository.findOne({
        where: {
          usuarioId: usuario.id,
          bodegaId: bodega.bodegaPadreId,
        },
        relations: {
          bodega: true,
        },
      });

      if (
        asignacionPadre?.bodega?.tipo === TipoBodega.PRINCIPAL &&
        asignacionPadre.bodega.nombre.trim().toLowerCase() ===
          "gastronomía tasty".toLowerCase()
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      "No tienes asignada la bodega seleccionada.",
    );
  }

  private validarBodegaSegunRol(
    usuario: UsuarioAutenticado,
    bodega: Bodega,
  ): void {
    if (
      usuario.rol === RolUsuario.SUPERVISOR &&
      bodega.tipo !== TipoBodega.PRINCIPAL &&
      bodega.tipo !== TipoBodega.SUCURSAL
    ) {
      throw new ConflictException(
        "Un Supervisor solo puede solicitar para su bodega principal o una sucursal Tasty asociada.",
      );
    }

    if (
      usuario.rol === RolUsuario.RESPONSABLE &&
      bodega.tipo !== TipoBodega.SUCURSAL
    ) {
      throw new ConflictException(
        "Un Responsable solo puede solicitar para una sucursal Tasty asignada.",
      );
    }
  }

  private async generarCodigo(): Promise<string> {
    for (let intento = 0; intento < 5; intento += 1) {
      const ahora = new Date();
      const fecha = [
        ahora.getUTCFullYear(),
        String(ahora.getUTCMonth() + 1).padStart(2, "0"),
        String(ahora.getUTCDate()).padStart(2, "0"),
      ].join("");

      const aleatorio = Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase();

      const codigo = `SOL-${fecha}-${aleatorio}`;

      const existe = await this.solicitudesRepository.exists({
        where: { codigo },
      });

      if (!existe) {
        return codigo;
      }
    }

    throw new ConflictException(
      "No se pudo generar un código único para la solicitud.",
    );
  }

  private normalizarObservacion(
    observacion?: string,
  ): string | null {
    const valor = observacion?.trim();
    return valor ? valor : null;
  }

  private convertirAPublica(
    solicitud: Solicitud,
  ): SolicitudPublica {
    return {
      id: solicitud.id,
      codigo: solicitud.codigo,
      estado: solicitud.estado,
      observacionSolicitante:
        solicitud.observacionSolicitante,
      observacionAtencion: solicitud.observacionAtencion,
      createdAt: solicitud.createdAt,
      updatedAt: solicitud.updatedAt,
      atendidaAt: solicitud.atendidaAt,
      usuarioSolicitante: {
        id: solicitud.usuarioSolicitante.id,
        nombre: solicitud.usuarioSolicitante.nombre,
        correo: solicitud.usuarioSolicitante.correo,
        rol: solicitud.usuarioSolicitante.rol,
      },
      usuarioAtencion: solicitud.usuarioAtencion
        ? {
            id: solicitud.usuarioAtencion.id,
            nombre: solicitud.usuarioAtencion.nombre,
            rol: solicitud.usuarioAtencion.rol,
          }
        : null,
      reversa: solicitud.reversa
        ? {
            id: solicitud.reversa.id,
            motivo: solicitud.reversa.motivo,
            createdAt: solicitud.reversa.createdAt,
            usuario: {
              id: solicitud.reversa.usuario.id,
              nombre: solicitud.reversa.usuario.nombre,
              rol: solicitud.reversa.usuario.rol,
            },
          }
        : null,
      bodegaSolicitante: {
        id: solicitud.bodegaSolicitante.id,
        nombre: solicitud.bodegaSolicitante.nombre,
        tipo: solicitud.bodegaSolicitante.tipo,
      },
      detalles: solicitud.detalles.map((detalle) => ({
        id: detalle.id,
        producto: {
          id: detalle.producto.id,
          codigo: detalle.producto.codigo,
          nombre: detalle.producto.nombre,
          tipoProducto: detalle.producto.tipoProducto,
          atributo: detalle.producto.atributo,
        },
        cantidadSolicitada: detalle.cantidadSolicitada,
        cantidadEntregada: detalle.cantidadEntregada,
        cantidadRechazada: detalle.cantidadRechazada,
        cantidadPendiente: detalle.cantidadPendiente,
      })),
    };
  }
}