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
