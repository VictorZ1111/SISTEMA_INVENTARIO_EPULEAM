import type { TipoMovimiento } from "../tipos/movimiento";

export type TipoMovimientoNormalizado =
  | "entrada"
  | "transferencia"
  | "modificacion"
  | "baja";

export function normalizarTipoMovimiento(
  tipo: TipoMovimiento,
): TipoMovimientoNormalizado {
  if (tipo === "salida") return "transferencia";
  if (tipo === "ajuste") return "modificacion";
  if (tipo === "entrada") return "entrada";
  if (tipo === "modificacion") return "modificacion";
  if (tipo === "baja") return "baja";
  if (tipo === "transferencia") return "transferencia";
  return "transferencia";
}

export function obtenerTextoMovimiento(tipo: TipoMovimiento) {
  const tipoNormalizado = normalizarTipoMovimiento(tipo);

  if (tipoNormalizado === "transferencia") return "Transferencia";
  if (tipoNormalizado === "entrada") return "Entrada";
  if (tipoNormalizado === "baja") return "Baja";
  if (tipoNormalizado === "modificacion") return "Modificación";
  return "Movimiento";
}
