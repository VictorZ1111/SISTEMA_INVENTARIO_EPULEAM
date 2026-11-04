import type { Producto } from "../tipos/producto";
import {
  BODEGA_INVENTARIO_GENERAL,
  limpiarPrefijoBodega,
} from "./bodegas";

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizarBodega(bodega: string) {
  return normalizarTexto(limpiarPrefijoBodega(bodega));
}

export function obtenerTituloBodega(bodega: string) {
  const nombre = limpiarPrefijoBodega(bodega);
  const normalizado = normalizarBodega(bodega);

  if (normalizado.includes("limpieza")) return "Bodega Limpieza";
  if (normalizado.includes("oficina")) return "Bodega Oficina";

  return nombre;
}

export function obtenerClaseIconoBodega(bodega: string) {
  const nombre = normalizarBodega(bodega);

  if (nombre.includes("limpieza")) return "icono-bodega-limpieza";
  if (nombre.includes("oficina")) return "icono-bodega-oficina";
  if (nombre.includes("gastronom") || nombre.includes("tasty")) {
    return "icono-bodega-gastronomia";
  }
  if (nombre.includes("inventario") || nombre.includes("general")) {
    return "icono-bodega-inventario";
  }

  return "icono-bodega-generica";
}

export function esBienVisible(producto: Producto) {
  const estadoBien = normalizarTexto(String(producto.estadoBien || ""));

  return (
    producto.estado === "activo" &&
    estadoBien !== "baja" &&
    producto.cantidad > 0
  );
}

export function obtenerBodegaProducto(producto: Producto) {
  const ubicacion = limpiarPrefijoBodega(producto.ubicacion || "");
  const ubicacionNormalizada = normalizarTexto(ubicacion);

  if (
    ubicacionNormalizada === "" ||
    ubicacionNormalizada === "general" ||
    ubicacionNormalizada === "inventario general" ||
    ubicacionNormalizada === "epuleam ep"
  ) {
    return BODEGA_INVENTARIO_GENERAL;
  }

  return ubicacion;
}
