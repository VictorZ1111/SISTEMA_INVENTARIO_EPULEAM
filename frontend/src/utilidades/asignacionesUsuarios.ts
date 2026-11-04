import type { Usuario } from "../tipos/usuario";

const SUCURSALES_TASTY = new Set([
  "Tasty 1",
  "Tasty 2",
  "Tasty 3",
  "Tasty 4",
  "Tasty 5",
]);

const ALIAS_SUCURSALES_TASTY: Record<string, string> = {
  "Tasty Centro": "Tasty 1",
  "Tasty Norte": "Tasty 2",
  "Tasty Sur": "Tasty 3",
  "Tasty Plaza": "Tasty 4",
  "Tasty Express": "Tasty 5",
};

export function normalizarNombreBodega(nombreBodega: string) {
  const nombre = nombreBodega.trim();
  return ALIAS_SUCURSALES_TASTY[nombre] || nombre;
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function obtenerAsignacionesUsuario(usuario: Usuario) {
  return Array.from(
    new Set(
      [...(usuario.bodegasAsignadas || []), usuario.bodegaAsignada || ""]
        .map((bodega) => normalizarNombreBodega(bodega))
        .filter(Boolean)
    )
  );
}

export function esSucursalTasty(nombreBodega: string) {
  return SUCURSALES_TASTY.has(normalizarNombreBodega(nombreBodega));
}

export function obtenerSupervisoresBodega(
  usuarios: Usuario[],
  nombreBodega: string
) {
  const asignacionBuscada = esSucursalTasty(nombreBodega)
    ? "Gastronomía Tasty"
    : nombreBodega;

  return usuarios.filter(
    (usuario) =>
      usuario.estado === "activo" &&
      usuario.rol === "supervisor" &&
      obtenerAsignacionesUsuario(usuario).some(
        (bodega) => normalizar(bodega) === normalizar(asignacionBuscada)
      )
  );
}

export function obtenerResponsablesSucursal(
  usuarios: Usuario[],
  nombreSucursal: string
) {
  if (!esSucursalTasty(nombreSucursal)) return [];

  return usuarios.filter(
    (usuario) =>
      usuario.estado === "activo" &&
      usuario.rol === "responsable" &&
      obtenerAsignacionesUsuario(usuario).some(
        (bodega) => normalizar(bodega) === normalizar(nombreSucursal)
      )
  );
}

export function formatearNombresUsuarios(
  usuarios: Usuario[],
  textoVacio: string
) {
  const nombres = Array.from(
    new Set(
      usuarios
        .map((usuario) => usuario.nombre.trim())
        .filter(Boolean)
    )
  );

  return nombres.length > 0 ? nombres.join(", ") : textoVacio;
}

export function obtenerSupervisorBodega(
  usuarios: Usuario[],
  nombreBodega: string
) {
  return obtenerSupervisoresBodega(usuarios, nombreBodega)[0];
}

export function obtenerResponsableSucursal(
  usuarios: Usuario[],
  nombreSucursal: string
) {
  return obtenerResponsablesSucursal(usuarios, nombreSucursal)[0];
}

export function obtenerCustodioAsignado(
  usuarios: Usuario[],
  nombreBodega: string
) {
  if (nombreBodega === "Inventario General" || nombreBodega === "General") {
    return "Administrador General";
  }

  if (esSucursalTasty(nombreBodega)) {
    return formatearNombresUsuarios(
      obtenerResponsablesSucursal(usuarios, nombreBodega),
      "Sin responsable asignado"
    );
  }

  return formatearNombresUsuarios(
    obtenerSupervisoresBodega(usuarios, nombreBodega),
    "Sin supervisor asignado"
  );
}

export function obtenerEtiquetaAsignacion(nombreBodega: string) {
  return esSucursalTasty(nombreBodega) ? "Responsable" : "Supervisor";
}
