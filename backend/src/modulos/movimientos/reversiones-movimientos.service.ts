import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";

import { LIMITE_REVERSA_MS } from "../../comun/constantes/reversiones";

import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { UsuarioBodega } from "../asignaciones/entities/usuario-bodega.entity";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { EstadoBodega } from "../bodegas/enums/estado-bodega.enum";
import { TipoBodega } from "../bodegas/enums/tipo-bodega.enum";
import { Existencia } from "../inventario/entities/existencia.entity";
import { Producto } from "../productos/entities/producto.entity";
import { EstadoBienProducto } from "../productos/enums/estado-bien-producto.enum";
import { EstadoProducto } from "../productos/enums/estado-producto.enum";
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import { SolicitudDetalle } from "../solicitudes/entities/solicitud-detalle.entity";
import { Solicitud } from "../solicitudes/entities/solicitud.entity";
import { EstadoSolicitud } from "../solicitudes/enums/estado-solicitud.enum";
import { RevertirMovimientoDto } from "./dto/revertir-movimiento.dto";
import { Movimiento } from "./entities/movimiento.entity";
import { TipoMovimiento } from "./enums/tipo-movimiento.enum";

@Injectable()
export class ReversionesMovimientosService {
  constructor(private readonly dataSource: DataSource) {}

  async revertir(
    id: string,
    dto: RevertirMovimientoDto,
    usuario: UsuarioAutenticado,
  ): Promise<string> {
    return this.dataSource.transaction(async (administrador) => {
      const movimiento = await administrador
        .getRepository(Movimiento)
        .createQueryBuilder("movimiento")
        .setLock("pessimistic_write")
        .where("movimiento.id = :id", { id })
        .getOne();

      if (!movimiento) {
        throw new NotFoundException(
          "El movimiento solicitado no existe.",
        );
      }

      await this.validarPermisoReversion(
        administrador,
        movimiento,
        usuario,
      );

      if (
        movimiento.tipo !== TipoMovimiento.TRANSFERENCIA &&
        movimiento.tipo !== TipoMovimiento.DEVOLUCION &&
        movimiento.tipo !== TipoMovimiento.BAJA
      ) {
        throw new ConflictException(
          "Este tipo de movimiento no requiere reversión.",
        );
      }

      const yaReversado = await administrador
        .getRepository(Movimiento)
        .exists({
          where: {
            movimientoOriginalId: movimiento.id,
          },
        });

      if (yaReversado) {
        throw new ConflictException(
          "Este movimiento ya fue reversado anteriormente.",
        );
      }

      const limite = new Date(
        movimiento.createdAt.getTime() + LIMITE_REVERSA_MS,
      );

      if (new Date() > limite) {
        throw new ConflictException(
          "Este movimiento ya superó el límite de 3 horas para reversarlo.",
        );
      }

      if (movimiento.tipo === TipoMovimiento.BAJA) {
        return this.revertirBaja(
          administrador,
          movimiento,
          dto,
          usuario.id,
        );
      }

      return this.revertirTransferencia(
        administrador,
        movimiento,
        dto,
        usuario.id,
      );
    });
  }

  private async validarPermisoReversion(
    administrador: EntityManager,
    movimiento: Movimiento,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      return;
    }

    if (usuario.rol !== RolUsuario.SUPERVISOR) {
      throw new ForbiddenException(
        "No tienes permiso para reversar movimientos.",
      );
    }

    const asignaciones = await administrador.getRepository(UsuarioBodega).find({
      where: { usuarioId: usuario.id },
      select: { bodegaId: true },
    });
    const principales = asignaciones.map((asignacion) => asignacion.bodegaId);

    const [sucursales, stocks] = await Promise.all([
      principales.length
        ? administrador.getRepository(Bodega).find({
            where: {
              bodegaPadreId: In(principales),
              tipo: TipoBodega.SUCURSAL,
              estado: EstadoBodega.ACTIVA,
            },
            select: { id: true },
          })
        : Promise.resolve([]),
      administrador.getRepository(Bodega).find({
        where: {
          tipo: TipoBodega.STOCK_SUPERVISOR,
          supervisorId: usuario.id,
          estado: EstadoBodega.ACTIVA,
        },
        select: { id: true },
      }),
    ]);

    const permitidas = new Set([
      ...principales,
      ...sucursales.map((bodega) => bodega.id),
      ...stocks.map((bodega) => bodega.id),
    ]);

    const tieneAcceso =
      (movimiento.bodegaOrigenId
        ? permitidas.has(movimiento.bodegaOrigenId)
        : false) ||
      (movimiento.bodegaDestinoId
        ? permitidas.has(movimiento.bodegaDestinoId)
        : false);

    if (!tieneAcceso) {
      throw new ForbiddenException(
        "No tienes permiso para reversar este movimiento.",
      );
    }
  }

  private async revertirTransferencia(
    administrador: EntityManager,
    movimiento: Movimiento,
    dto: RevertirMovimientoDto,
    usuarioId: string,
  ): Promise<string> {
    if (
      !movimiento.productoId ||
      !movimiento.bodegaOrigenId ||
      !movimiento.bodegaDestinoId
    ) {
      throw new ConflictException(
        "El movimiento no tiene producto o bodegas válidas.",
      );
    }

    // Bloqueamos primero la solicitud, como en la atención normal, para
    // evitar cruzar los bloqueos con otra entrega concurrente.
    // Si falla el stock, toda la transacción se revierte, incluido este recálculo.
    await this.recalcularSolicitudSiAplica(
      administrador,
      movimiento,
      usuarioId,
      dto.motivo.trim(),
    );

    const productoId = movimiento.productoId;
    const existencias = administrador.getRepository(Existencia);

    const existenciaDestino = await existencias.findOne({
      where: {
        productoId,
        bodegaId: movimiento.bodegaDestinoId,
      },
      lock: {
        mode: "pessimistic_write",
      },
    });

    if (
      !existenciaDestino ||
      existenciaDestino.cantidad < movimiento.cantidad
    ) {
      const disponible = existenciaDestino?.cantidad ?? 0;
      throw new ConflictException(
        `La bodega receptora necesita ${movimiento.cantidad} unidades y solo dispone de ${disponible}.`,
      );
    }

    let existenciaOrigen = await existencias.findOne({
      where: {
        productoId,
        bodegaId: movimiento.bodegaOrigenId,
      },
      lock: {
        mode: "pessimistic_write",
      },
    });

    if (!existenciaOrigen) {
      existenciaOrigen = existencias.create({
        productoId,
        bodegaId: movimiento.bodegaOrigenId,
        cantidad: 0,
      });
    }

    existenciaDestino.cantidad -= movimiento.cantidad;
    existenciaOrigen.cantidad += movimiento.cantidad;
    await existencias.save([existenciaDestino, existenciaOrigen]);

    const movimientos = administrador.getRepository(Movimiento);

    const reversa = await movimientos.save(
      movimientos.create({
          tipo: TipoMovimiento.MODIFICACION,
          productoId,
          bodegaOrigenId: movimiento.bodegaDestinoId,
          bodegaDestinoId: movimiento.bodegaOrigenId,
          usuarioId,
          solicitudId: movimiento.solicitudId,
          solicitudDetalleId: movimiento.solicitudDetalleId,
          movimientoOriginalId: movimiento.id,
          cantidad: movimiento.cantidad,
          cantidadAnterior: null,
          cantidadNueva: null,
          observacion: dto.motivo.trim(),
          modulo: "movimientos",
          accion: "revertir_transferencia",
          registroId: movimiento.id,
      }),
    );

    return reversa.id;
  }

  private async revertirBaja(
    administrador: EntityManager,
    movimiento: Movimiento,
    dto: RevertirMovimientoDto,
    usuarioId: string,
  ): Promise<string> {
    if (!movimiento.productoId || !movimiento.bodegaOrigenId) {
      throw new ConflictException(
        "El movimiento de baja no tiene producto o bodega válida.",
      );
    }

    const productos = administrador.getRepository(Producto);
    const existencias = administrador.getRepository(Existencia);
    const movimientos = administrador.getRepository(Movimiento);

    const producto = await productos
      .createQueryBuilder("producto")
      .setLock("pessimistic_write")
      .where("producto.id = :id", { id: movimiento.productoId })
      .getOne();

    if (!producto) {
      throw new NotFoundException(
        "El producto relacionado con la baja no existe.",
      );
    }

    let existencia = await existencias.findOne({
      where: {
        productoId: movimiento.productoId,
        bodegaId: movimiento.bodegaOrigenId,
      },
      lock: {
        mode: "pessimistic_write",
      },
    });

    if (!existencia) {
      existencia = existencias.create({
        productoId: movimiento.productoId,
        bodegaId: movimiento.bodegaOrigenId,
        cantidad: 0,
      });
    }

    const anterior = existencia.cantidad;
    existencia.cantidad += movimiento.cantidad;
    await existencias.save(existencia);

    if (movimiento.accion !== "baja_por_consumo") {
      // Solo la baja administrativa desactiva y reactiva el producto maestro.
      producto.estado = EstadoProducto.ACTIVO;
      if (producto.estadoBien === EstadoBienProducto.BAJA) {
        producto.estadoBien = EstadoBienProducto.BUENO;
      }
      producto.observacion = dto.motivo.trim();
      await productos.save(producto);
    }

    const reversa = await movimientos.save(
      movimientos.create({
        tipo: TipoMovimiento.MODIFICACION,
        productoId: movimiento.productoId,
        bodegaOrigenId: null,
        bodegaDestinoId: movimiento.bodegaOrigenId,
        usuarioId,
        solicitudId: null,
        solicitudDetalleId: null,
        movimientoOriginalId: movimiento.id,
        cantidad: movimiento.cantidad,
        cantidadAnterior: anterior,
        cantidadNueva: existencia.cantidad,
        observacion: dto.motivo.trim(),
        modulo: "movimientos",
        accion: "revertir_baja",
        registroId: movimiento.id,
      }),
    );

    return reversa.id;
  }

  private async recalcularSolicitudSiAplica(
    administrador: EntityManager,
    movimiento: Movimiento,
    usuarioId: string,
    motivo: string,
  ): Promise<void> {
    if (!movimiento.solicitudId || !movimiento.solicitudDetalleId) {
      return;
    }

    const solicitudesRepository = administrador.getRepository(Solicitud);
    const detallesRepository = administrador.getRepository(SolicitudDetalle);

    // Misma transacción que la reversa física: ningún stock se mueve si las
    // cantidades de la solicitud no pueden restablecerse coherentemente.
    const solicitud = await solicitudesRepository
      .createQueryBuilder("solicitud")
      .setLock("pessimistic_write")
      .where("solicitud.id = :id", { id: movimiento.solicitudId })
      .getOne();

    if (!solicitud) {
      throw new NotFoundException(
        "No existe la solicitud relacionada con este movimiento.",
      );
    }

    const detalles = await detallesRepository
      .createQueryBuilder("detalle")
      .setLock("pessimistic_write")
      .where("detalle.solicitudId = :solicitudId", { solicitudId: solicitud.id })
      .orderBy("detalle.id", "ASC")
      .getMany();

    const detalle = detalles.find((item) => item.id === movimiento.solicitudDetalleId);
    if (!detalle) {
      throw new ConflictException(
        "El movimiento no corresponde a un bien de la solicitud.",
      );
    }

    if (detalle.cantidadEntregada < movimiento.cantidad) {
      throw new ConflictException(
        "La cantidad entregada registrada no coincide con el movimiento que se intenta reversar.",
      );
    }

    detalle.cantidadEntregada -= movimiento.cantidad;
    detalle.cantidadPendiente += movimiento.cantidad;

    // En una atención mixta, los rechazos forman parte de la decisión
    // revertida. Cuando ya no quedan unidades entregadas activas en el pedido,
    // también devolvemos sus rechazos a pendientes (no hay stock físico que
    // devolver por esas unidades).
    // Los bienes retirados siguen en la BD por trazabilidad, pero no deben
    // intervenir en el recálculo de la solicitud vigente.
    const detallesActivos = detalles.filter((item) => !item.retirado);
    const noQuedanEntregas = detallesActivos.every((item) => item.cantidadEntregada === 0);
    if (noQuedanEntregas) {
      for (const item of detallesActivos) {
        if (item.cantidadRechazada > 0) {
          item.cantidadPendiente += item.cantidadRechazada;
          item.cantidadRechazada = 0;
        }
      }
    }

    for (const item of detalles) {
      if (
        item.cantidadEntregada < 0 ||
        item.cantidadRechazada < 0 ||
        item.cantidadPendiente < 0 ||
        item.cantidadEntregada + item.cantidadRechazada + item.cantidadPendiente !==
          item.cantidadSolicitada
      ) {
        throw new ConflictException(
          "La reversa no puede aplicarse porque las cantidades de la solicitud son inconsistentes.",
        );
      }
    }

    await detallesRepository.save(detalles);

    const totalPendiente = detallesActivos.reduce(
      (total, item) => total + item.cantidadPendiente,
      0,
    );
    const totalEntregado = detallesActivos.reduce(
      (total, item) => total + item.cantidadEntregada,
      0,
    );
    const totalRechazado = detallesActivos.reduce(
      (total, item) => total + item.cantidadRechazada,
      0,
    );

    if (totalPendiente > 0) {
      solicitud.estado =
        totalEntregado + totalRechazado > 0
          ? EstadoSolicitud.PARCIAL
          : EstadoSolicitud.PENDIENTE;
    } else {
      solicitud.estado =
        totalEntregado > 0
          ? EstadoSolicitud.ATENDIDA
          : EstadoSolicitud.RECHAZADA;
    }

    solicitud.observacionAtencion = motivo;
    // La reversa queda auditada por el movimiento nuevo. No registrar al
    // usuario que revierte como si hubiese realizado una nueva entrega.
    solicitud.usuarioAtencionId =
      solicitud.estado === EstadoSolicitud.PENDIENTE
        ? null
        : solicitud.usuarioAtencionId;
    solicitud.atendidaAt =
      solicitud.estado === EstadoSolicitud.PENDIENTE
        ? null
        : solicitud.atendidaAt;

    await solicitudesRepository.save(solicitud);
  }
}
