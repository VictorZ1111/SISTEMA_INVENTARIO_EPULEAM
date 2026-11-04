import type { Movimiento } from "../tipos/movimiento";

export const MESES_CALENDARIO = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const DIAS_CALENDARIO = ["L", "M", "X", "J", "V", "S", "D"];

export function crearFechaIsoLocal(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export function formatearFechaFiltro(fechaIso: string) {
  if (!fechaIso) return "";

  const [anio, mes, dia] = fechaIso.split("-");

  if (!anio || !mes || !dia) return "";

  return `${dia}/${mes}/${anio}`;
}

export function convertirTextoFechaAIso(texto: string) {
  const coincidencia = texto
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!coincidencia) return null;

  const dia = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const anio = Number(coincidencia[3]);
  const fecha = new Date(anio, mes - 1, dia);

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return crearFechaIsoLocal(fecha);
}

export function normalizarEntradaFecha(texto: string) {
  const soloNumeros = texto.replace(/\D/g, "").slice(0, 8);
  const partes: string[] = [];

  if (soloNumeros.length > 0) partes.push(soloNumeros.slice(0, 2));
  if (soloNumeros.length > 2) partes.push(soloNumeros.slice(2, 4));
  if (soloNumeros.length > 4) partes.push(soloNumeros.slice(4, 8));

  return partes.join("/");
}

export function obtenerFechaIso(fecha: string) {
  const coincidencia = fecha.match(/^(\d{4}-\d{2}-\d{2})/);

  if (coincidencia) return coincidencia[1];

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) return "";

  const anio = fechaConvertida.getFullYear();
  const mes = String(fechaConvertida.getMonth() + 1).padStart(2, "0");
  const dia = String(fechaConvertida.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export function obtenerFechaHoraOrden(movimiento: Movimiento) {
  const valorFecha = movimiento.createdAt || movimiento.fecha;
  const fechaConvertida = new Date(valorFecha);

  if (!Number.isNaN(fechaConvertida.getTime())) {
    return fechaConvertida.getTime();
  }

  return 0;
}

export function formatearFechaMovimiento(fecha: string) {
  const fechaIso = obtenerFechaIso(fecha);

  if (!fechaIso) return fecha;

  const [anio, mes, dia] = fechaIso.split("-");

  return `${dia}/${mes}/${anio}`;
}
