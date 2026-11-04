import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";

import { LIMITE_REVERSA_MS } from "../../comun/constantes/reversiones";

import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { Existencia } from "../inventario/entities/existencia.entity";
import { Producto } from "../productos/entities/producto.entity";
import { EstadoBienProducto } from "../productos/enums/estado-bien-producto.enum";
import { EstadoProducto } from "../productos/enums/estado-producto.enum";
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

      if (
        movimiento.tipo !== TipoMovimiento.TRANSFERENCIA &&
        movimiento.tipo !== TipoMovimiento.BAJA
      ) {
        throw new ConflictException(
          "Las entradas y modificaciones no requieren reversión.",
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

    await this.recalcularSolicitudSiAplica(
      administrador,
      movimiento,
      usuarioId,
      dto.motivo.trim(),
    );

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

    producto.estado = EstadoProducto.ACTIVO;
    if (producto.estadoBien === EstadoBienProducto.BAJA) {
      producto.estadoBien = EstadoBienProducto.BUENO;
    }
    producto.observacion = dto.motivo.trim();
    await productos.save(producto);

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

    const detallesRepository =
      administrador.getRepository(SolicitudDetalle);
    const solicitudesRepository =
      administrador.getRepository(Solicitud);

    const detalle = await detallesRepository
      .createQueryBuilder("detalle")
      .setLock("pessimistic_write")
      .where("detalle.id = :id", {
        id: movimiento.solicitudDetalleId,
      })
      .getOne();

    if (detalle) {
      detalle.cantidadEntregada = Math.max(
        0,
        detalle.cantidadEntregada - movimiento.cantidad,
      );
      detalle.cantidadPendiente =
        detalle.cantidadSolicitada -
        detalle.cantidadEntregada -
        detalle.cantidadRechazada;
      await detallesRepository.save(detalle);
    }

    const solicitud = await solicitudesRepository
      .createQueryBuilder("solicitud")
      .setLock("pessimistic_write")
      .where("solicitud.id = :id", {
        id: movimiento.solicitudId,
      })
      .getOne();

    if (!solicitud) {
      return;
    }

    const detalles = await detallesRepository.find({
      where: {
        solicitudId: solicitud.id,
      },
    });

    const totalSolicitado = detalles.reduce(
      (total, item) => total + item.cantidadSolicitada,
      0,
    );
    const totalEntregado = detalles.reduce(
      (total, item) => total + item.cantidadEntregada,
      0,
    );

    solicitud.estado =
      totalEntregado <= 0
        ? EstadoSolicitud.PENDIENTE
        : totalEntregado >= totalSolicitado
          ? EstadoSolicitud.ATENDIDA
          : EstadoSolicitud.PARCIAL;
    solicitud.observacionAtencion = motivo;
    solicitud.usuarioAtencionId = usuarioId;
    solicitud.atendidaAt =
      solicitud.estado === EstadoSolicitud.PENDIENTE
        ? null
        : solicitud.atendidaAt;

    await solicitudesRepository.save(solicitud);
  }
}
