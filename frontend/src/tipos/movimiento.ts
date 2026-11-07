export type TipoMovimiento =
  | "entrada"
  | "transferencia"
  | "modificacion"
  | "baja"
  | "salida"
  | "ajuste"
  | "devolucion";

export interface Movimiento {
  id: string | number;
  tipo: TipoMovimiento;
  producto: string;
  productoId?: string;
  codigoProducto?: string;
  origen: string;
  destino: string;
  cantidad: number;
  cantidadAnterior?: number | null;
  cantidadNueva?: number | null;
  documento: string;
  fecha: string;
  createdAt?: string;
  usuario: string;
  observacion: string;
  solicitudId?: string | null;
  solicitudDetalleId?: string | null;
  movimientoOriginalId?: string | null;
  modulo?: string | null;
  accion?: string | null;
  registroId?: string | null;
}
