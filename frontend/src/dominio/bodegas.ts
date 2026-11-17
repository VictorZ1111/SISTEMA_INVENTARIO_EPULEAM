import type { UsuarioSesion } from "../tipos/usuario";

export const BODEGA_INVENTARIO_GENERAL = "Inventario General";
export const BODEGA_GASTRONOMIA = "Gastronomía";
export const SUCURSAL_LIMPIEZA = "Sucursal Limpieza";
export const SUCURSAL_OFICINA = "Sucursal Oficina";
export const SUCURSALES_TASTY = [
  "Tasty 1",
  "Tasty 2",
  "Tasty 3",
  "Tasty 4",
  "Tasty 5",
] as const;

type UsuarioConBodegas =
  | (Pick<UsuarioSesion, "bodegasAsignadas" | "bodegaAsignada"> & Partial<Pick<UsuarioSesion, "rol">>)
  | null
  | undefined;

function normalizarTextoBodega(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function limpiarPrefijoBodega(bodega: string) {
  return bodega.replace(/^Bodega\s+/i, "").trim();
}

export function esBodegaGastronomiaAgrupada(bodega: string) {
  const nombre = normalizarTextoBodega(bodega);

  return (
    nombre === "gastronomia" ||
    nombre === "bodega gastronomia" ||
    nombre === "gastronomia tasty" ||
    nombre === "bodega gastronomia tasty"
  );
}

export function esBodegaGastronomia(bodega: string) {
  return normalizarTextoBodega(bodega).includes("gastronom");
}

export function esSucursalTastyOperativa(bodega: string) {
  return normalizarTextoBodega(limpiarPrefijoBodega(bodega)).startsWith("tasty ");
}

function obtenerSucursalesOperativasDesdeBodegas(bodegas: string[]): string[] {
  const todas = [...bodegas];
  if (bodegas.some(esBodegaGastronomiaAgrupada)) todas.push(...SUCURSALES_TASTY);
  // Limpieza y Oficina no son sucursales físicas: apuntan al inventario principal.
  return Array.from(new Set(todas));
}

export function obtenerBodegasBaseUsuario(usuario: UsuarioConBodegas) {
  const bodegasBase = usuario?.bodegasAsignadas?.length
    ? usuario.bodegasAsignadas
    : usuario?.bodegaAsignada
      ? [usuario.bodegaAsignada]
      : [];

  return Array.from(new Set(bodegasBase.filter(Boolean)));
}

export function obtenerBodegasPrincipalesUsuario(usuario: UsuarioConBodegas) {
  const bodegasBase = obtenerBodegasBaseUsuario(usuario);
  const tieneGastronomia = bodegasBase.some(esBodegaGastronomiaAgrupada);

  const bodegasPrincipales = bodegasBase.filter((bodega) => {
    if (esBodegaGastronomiaAgrupada(bodega)) return false;
    if (tieneGastronomia && esSucursalTastyOperativa(bodega)) return false;
    if (bodega === SUCURSAL_LIMPIEZA || bodega === SUCURSAL_OFICINA) return false;
    return !esSucursalTastyOperativa(bodega);
  });

  return Array.from(
    new Set([
      ...bodegasPrincipales,
      ...(tieneGastronomia ? [BODEGA_GASTRONOMIA] : []),
    ]),
  );
}

/** Incluye sucursales Tasty y de Limpieza/Oficina según el área asignada. */
export function obtenerSucursalesUsuario(usuario: UsuarioConBodegas) {
  const bodegas = obtenerBodegasBaseUsuario(usuario);
  return obtenerSucursalesOperativasDesdeBodegas(bodegas).filter(
    (nombre) => esSucursalTastyOperativa(nombre) ||
      (usuario?.rol === "responsable" &&
        (nombre === "Bodega Limpieza" || nombre === "Bodega Oficina")),
  );
}

export function obtenerSucursalesTastyUsuario(usuario: UsuarioConBodegas) {
  const bodegasBase = obtenerBodegasBaseUsuario(usuario);

  if (bodegasBase.some(esBodegaGastronomiaAgrupada)) {
    return [...SUCURSALES_TASTY];
  }

  return Array.from(new Set(bodegasBase.filter(esSucursalTastyOperativa)));
}

export function expandirBodegasAccesoTasty(bodegas: string[]) {
  return obtenerSucursalesOperativasDesdeBodegas(bodegas.filter(Boolean));
}

export function obtenerBodegasAccesoUsuario(usuario: UsuarioConBodegas) {
  return expandirBodegasAccesoTasty(obtenerBodegasBaseUsuario(usuario));
}

export function expandirBodegasOperativasTasty(bodegas: string[]) {
  const resultado: string[] = [];

  bodegas.forEach((bodega) => {
    if (esBodegaGastronomiaAgrupada(bodega)) {
      resultado.push(...SUCURSALES_TASTY);
      return;
    }

    resultado.push(bodega);
  });

  return Array.from(new Set(resultado.filter(Boolean)));
}

export function obtenerBodegasOperativasUsuario(usuario: UsuarioConBodegas) {
  return expandirBodegasOperativasTasty(obtenerBodegasBaseUsuario(usuario));
}
