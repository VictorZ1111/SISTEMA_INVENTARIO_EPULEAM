import { clienteApi } from "./clienteApi";

export interface StockSupervisorProducto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  descripcionBien: string;
  tipoProducto: "consumible" | "no_consumible";
  atributo: string | null;
  empresa: string | null;
  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;
  estadoBien: string;
  ubicacion: string;
  custodioActual: string;
  procedencia: string | null;
  codigoUleam: string | null;
  categoria: {
    id: string;
    nombre: string;
  };
  unidad: string;
  observacion: string | null;
  estado: "activo" | "inactivo";
  fechaRegistro: string;
}

export interface DestinoStockSupervisorApi {
  id: string;
  nombre: string;
}

export interface StockSupervisorItemApi {
  existenciaId: string;
  productoId: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  bodegaStockId: string;
  area: {
    id: string;
    nombre: string;
  };
  destinos: DestinoStockSupervisorApi[];
  producto: StockSupervisorProducto;
}

export interface DistribuirStockSupervisorPayload {
  productoId: string;
  bodegaStockId: string;
  bodegaDestinoIds: string[];
  cantidadTotal: number;
  observacion?: string;
}

export interface DevolverStockSupervisorPayload {
  productoId: string;
  bodegaStockId: string;
  cantidad: number;
  observacion?: string;
}

export async function obtenerMiStockSupervisorApi() {
  const { data } = await clienteApi.get<StockSupervisorItemApi[]>(
    "/inventario/stock-supervisor/mio",
  );

  return data;
}

export async function distribuirStockSupervisorApi(
  payload: DistribuirStockSupervisorPayload,
) {
  await clienteApi.post("/movimientos/distribucion-stock", payload);
}

export async function devolverStockSupervisorApi(
  payload: DevolverStockSupervisorPayload,
) {
  await clienteApi.post("/movimientos/devolucion-stock", payload);
}
