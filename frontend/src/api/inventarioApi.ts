import { clienteApi } from "./clienteApi";
import type { TipoProducto } from "../tipos/producto";

export interface ProductoBackend {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  descripcionBien: string;
  categoriaId: string;
  categoria: { id: string; nombre: string; estado?: string };
  tipoProducto: TipoProducto;
  atributo: "BLD" | "BCA" | null;
  empresa: "BLD" | "BCA" | null;
  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;
  estadoBien: "bueno" | "regular" | "malo" | "baja";
  ubicacion: string | null;
  custodioActual: string | null;
  procedencia: string | null;
  codigoUleam: string | null;
  unidad: string;
  observacion: string | null;
  fechaRegistro: string;
  cantidad: number;
  estado: "activo" | "inactivo";
}

export interface InventarioFrontendBackend {
  id: string;
  productoId: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  bodega: string;
  fechaAsignacion: string;
  producto: Omit<ProductoBackend, "categoriaId" | "cantidad"> & {
    categoria: { id: string; nombre: string };
  };
}

export interface BodegaBackendInventario {
  id: string;
  nombre: string;
  estado: "activa" | "inactiva";
}

export interface ProductoApiPayload {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoriaId: string;
  tipoProducto: TipoProducto;
  empresa: "BLD" | "BCA" | null;
  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;
  estadoBien: string;
  ubicacion: string;
  custodioActual: string;
  procedencia: string;
  codigoUleam: string;
  unidad: string;
  observacion?: string;
  cantidad: number;
  estado: string;
}

export interface AjustarCantidadProductoPayload {
  productoId: string;
  bodegaId: string;
  cantidadNueva: number;
  observacion: string;
}

export async function obtenerInventarioFrontendApi() {
  const { data } =
    await clienteApi.get<InventarioFrontendBackend[]>("/inventario/frontend");

  return data;
}

export async function obtenerBodegasInventarioApi() {
  const { data } = await clienteApi.get<BodegaBackendInventario[]>("/bodegas");
  return data;
}

export async function crearProductoApi(payload: ProductoApiPayload) {
  await clienteApi.post("/productos", payload);
}

export async function editarProductoApi(
  id: string,
  payload: Omit<ProductoApiPayload, "cantidad">,
) {
  await clienteApi.patch(`/productos/${id}`, payload);
}

export async function ajustarCantidadProductoApi(
  payload: AjustarCantidadProductoPayload,
) {
  await clienteApi.post("/movimientos/ajuste", payload);
}

export async function cambiarEstadoProductoApi(
  id: string,
  estado: "activo" | "inactivo",
) {
  await clienteApi.patch(`/productos/${id}/estado`, { estado });
}

export async function eliminarProductoApi(
  id: string,
  observacion: string,
) {
  await clienteApi.delete(`/productos/${id}`, {
    data: { observacion },
  });
}

export interface TransferirProductoPayload {
  productoId: string;
  bodegaOrigenId: string;
  bodegaDestinoId: string;
  cantidad: number;
  observacion: string;
}

export async function transferirProductoApi(
  payload: TransferirProductoPayload,
) {
  await clienteApi.post("/movimientos/transferencia", payload);
}
