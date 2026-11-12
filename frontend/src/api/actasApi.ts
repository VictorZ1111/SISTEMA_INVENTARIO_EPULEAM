import { clienteApi } from "./clienteApi";
import { obtenerMovimientosApi } from "./movimientosApi";

export type PeriodoActas = "dia" | "mes" | "anio" | "rango";
export type TipoBienActa = "todos" | "consumible" | "no_consumible";

export interface FiltrosActas {
  periodo: PeriodoActas;
  fecha: string;
  mes: string;
  anio: string;
  fechaInicio: string;
  fechaFin: string;
  custodioId: string;
  tipoProducto: TipoBienActa;
}

export interface RegistroActa {
  id: string;
  tipo: "entrada" | "transferencia" | "modificacion" | "baja" | "salida" | "ajuste" | "devolucion";
  codigo: string | null;
  producto: string;
  origen: string;
  destino: string;
  cantidad: number;
  usuario: string;
  usuarioId: string;
  createdAt: string;
  observacion: string;
  revertido: boolean;
}

interface ReporteMovimientosApi {
  items: Array<Omit<RegistroActa, "revertido">>;
}

function esInventarioGeneral(nombre: string) {
  return /inventario general|epuleam ep/i.test(nombre);
}

/** Consulta de solo lectura. No crea actas ni movimientos. */
export async function consultarRegistrosActas(filtros: FiltrosActas): Promise<RegistroActa[]> {
  const params = new URLSearchParams({ periodo: filtros.periodo });
  if (filtros.periodo === "dia") params.set("fecha", filtros.fecha);
  if (filtros.periodo === "mes") params.set("mes", filtros.mes);
  if (filtros.periodo === "anio") params.set("anio", filtros.anio);
  if (filtros.periodo === "rango") {
    params.set("fechaInicio", filtros.fechaInicio);
    params.set("fechaFin", filtros.fechaFin);
  }
  if (filtros.tipoProducto !== "todos") params.set("tipoProducto", filtros.tipoProducto);
  if (filtros.custodioId !== "todos" && filtros.custodioId !== "administracion") {
    params.set("custodioId", filtros.custodioId);
  }

  const [reporte, movimientos] = await Promise.all([
    clienteApi.get<ReporteMovimientosApi>(`/reportes/movimientos?${params}`),
    obtenerMovimientosApi(true),
  ]);

  const idsRevertidos = new Set(
    movimientos.map((movimiento) => movimiento.movimientoOriginalId).filter(Boolean),
  );

  return reporte.data.items
    .filter((item) =>
      (item.tipo === "entrada" && esInventarioGeneral(item.destino)) ||
      item.tipo === "transferencia",
    )
    .filter((item) =>
      filtros.custodioId !== "administracion" ||
      esInventarioGeneral(item.origen) || esInventarioGeneral(item.destino),
    )
    .map((item) => ({ ...item, revertido: idsRevertidos.has(item.id) }));
}
