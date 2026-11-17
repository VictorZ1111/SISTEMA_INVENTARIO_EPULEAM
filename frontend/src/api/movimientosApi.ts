import { clienteApi } from "./clienteApi";

export interface MovimientoBackend {
  id: string;
  tipo:
    | "entrada"
    | "transferencia"
    | "modificacion"
    | "baja"
    | "salida"
    | "ajuste"
    | "devolucion";
  cantidad: number;
  cantidadAnterior: number | null;
  cantidadNueva: number | null;
  observacion: string | null;
  createdAt: string;
  solicitudId: string | null;
  solicitudDetalleId: string | null;
  movimientoOriginalId: string | null;
  modulo: string | null;
  accion: string | null;
  registroId: string | null;
  producto: { id: string; codigo: string; nombre: string } | null;
  bodegaOrigen: { id: string; nombre: string } | null;
  bodegaDestino: { id: string; nombre: string } | null;
  usuario: { id: string; nombre: string; rol: string };
}

export async function obtenerMovimientosApi(esAdministrador: boolean) {
  const ruta = esAdministrador ? "/movimientos" : "/movimientos/mios";
  const { data } = await clienteApi.get<MovimientoBackend[]>(ruta);
  return data;
}

export async function reversarMovimientoApi(
  movimientoId: string,
  motivo: string,
) {
  await clienteApi.post(`/movimientos/${movimientoId}/revertir`, { motivo });
}

/** Descuenta unidades efectivamente utilizadas, preservando el producto maestro. */
export async function registrarConsumoApi(datos: {
  existenciaId: string;
  cantidad: number;
}): Promise<void> {
  await clienteApi.post("/movimientos/consumo", datos);
}

/** Devuelve existencias de una bodega/sucursal del Supervisor al Inventario General. */
export async function devolverDesdeBodegaApi(datos: {
  existenciaId: string;
  cantidad: number;
  observacion?: string;
}): Promise<void> {
  await clienteApi.post("/movimientos/devolucion-bodega", datos);
}

/** Registra un incremento real de existencias en Inventario General como movimiento de entrada. */
export async function registrarEntradaInventarioGeneralApi(datos: {
  productoId: string;
  bodegaDestinoId: string;
  cantidad: number;
  observacion?: string;
}): Promise<void> {
  await clienteApi.post("/movimientos/entrada", datos);
}
