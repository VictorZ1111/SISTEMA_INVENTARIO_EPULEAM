import type { InventarioFrontendBackend } from "../api/inventarioApi";
import type { MovimientoBackend } from "../api/movimientosApi";
import type { SolicitudBackend } from "../api/solicitudesApi";
import type { Movimiento } from "../tipos/movimiento";
import type { Producto } from "../tipos/producto";
import type { ItemSolicitud, Solicitud } from "../tipos/solicitud";
import { normalizarNombreBodega } from "./asignacionesUsuarios";

export function convertirMovimientoBackend(movimiento: MovimientoBackend): Movimiento {
  const tipo =
    movimiento.tipo === "salida"
      ? "transferencia"
      : movimiento.tipo === "ajuste"
        ? "modificacion"
        : movimiento.tipo;

  const origen = movimiento.bodegaOrigen?.nombre
    ? normalizarNombreBodega(movimiento.bodegaOrigen.nombre)
    : movimiento.tipo === "entrada"
      ? "Entrada externa"
      : "No especificado";

  const destino = movimiento.bodegaDestino?.nombre
    ? normalizarNombreBodega(movimiento.bodegaDestino.nombre)
    : movimiento.tipo === "baja"
      ? "Producto dado de baja"
      : "No especificado";

  return {
    id: movimiento.id,
    tipo,
    producto: movimiento.producto?.nombre || "Registro del sistema",
    productoId: movimiento.producto?.id,
    codigoProducto: movimiento.producto?.codigo,
    origen,
    destino,
    cantidad: movimiento.cantidad,
    cantidadAnterior: movimiento.cantidadAnterior,
    cantidadNueva: movimiento.cantidadNueva,
    documento: movimiento.solicitudId
      ? `SOL-${movimiento.solicitudId}`
      : `MOV-${movimiento.id.slice(0, 8).toUpperCase()}`,
    fecha: movimiento.createdAt.slice(0, 10),
    createdAt: movimiento.createdAt,
    usuario: movimiento.usuario.nombre,
    observacion: movimiento.observacion || "",
    solicitudId: movimiento.solicitudId,
    solicitudDetalleId: movimiento.solicitudDetalleId,
    movimientoOriginalId: movimiento.movimientoOriginalId,
    modulo: movimiento.modulo,
    accion: movimiento.accion,
    registroId: movimiento.registroId,
  };
}

export function convertirSolicitudBackend(solicitud: SolicitudBackend): Solicitud {
  const items: ItemSolicitud[] = solicitud.detalles.map((detalle) => ({
    id: detalle.id,
    productoId: detalle.producto.id,
    productoSolicitado: detalle.producto.nombre,
    cantidad: detalle.cantidadSolicitada,
    cantidadEntregada: detalle.cantidadEntregada,
    cantidadRechazada: detalle.cantidadRechazada,
    cantidadPendiente: detalle.cantidadPendiente,
  }));

  const cantidad = items.reduce((total, item) => total + item.cantidad, 0);
  const cantidadEntregada = items.reduce(
    (total, item) => total + (item.cantidadEntregada || 0),
    0,
  );
  const cantidadRechazada = items.reduce(
    (total, item) => total + (item.cantidadRechazada || 0),
    0,
  );
  const cantidadPendiente = items.reduce(
    (total, item) => total + (item.cantidadPendiente || 0),
    0,
  );

  return {
    id: solicitud.id,
    codigo: solicitud.codigo,
    solicitudOrigenId: solicitud.solicitudOrigenId ?? null,
    tipo: "producto",
    solicitante: solicitud.usuarioSolicitante.nombre,
    bodega: normalizarNombreBodega(solicitud.bodegaSolicitante.nombre),
    productoId: items[0]?.productoId,
    productoSolicitado:
      items.length > 1
        ? `${items.length} bienes solicitados`
        : items[0]?.productoSolicitado || "No especificado",
    cantidad,
    cantidadEntregada,
    cantidadRechazada,
    unidad: "Unidad",
    descripcion:
      solicitud.observacionSolicitante ||
      `Solicitud ${solicitud.codigo}`,
    estado: solicitud.estado,
    fecha: solicitud.createdAt.slice(0, 10),
    createdAt: solicitud.createdAt,
    updatedAt: solicitud.updatedAt,
    atendidaAt: solicitud.atendidaAt,
    reversada: Boolean(solicitud.reversa),
    items,
    pendientesRechazados:
      cantidadPendiente === 0 && cantidadRechazada > 0,
    observacionAdmin: solicitud.observacionAtencion || "",
  };
}

export function convertirProductoBackend(
  producto: InventarioFrontendBackend["producto"],
  cantidad: number,
  ubicacion: string,
): Producto {
  return {
    id: producto.id,
    codigo: producto.codigo,
    descripcion: producto.nombre || producto.descripcionBien,
    cantidad,
    tipoProducto: producto.tipoProducto,
    empresa: producto.empresa || undefined,
    serie: producto.serie,
    modelo: producto.modelo,
    marca: producto.marca,
    material: producto.material,
    color: producto.color,
    dimensiones: producto.dimensiones,
    estadoBien:
      producto.estadoBien === "baja" ? "malo" : producto.estadoBien,
    ubicacion: normalizarNombreBodega(ubicacion),
    custodioActual: producto.custodioActual || "Sin asignar",
    procedencia: producto.procedencia || "No especificada",
    codigoUleam: producto.codigoUleam || producto.codigo,
    categoria: producto.categoria.nombre,
    categoriaId: producto.categoria.id,
    unidad: producto.unidad || "Unidad",
    observacion: producto.observacion || "",
    estado: producto.estado,
    fechaRegistro: producto.fechaRegistro,
  };
}
