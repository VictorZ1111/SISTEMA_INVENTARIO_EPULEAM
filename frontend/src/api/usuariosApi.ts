import { clienteApi } from "./clienteApi";
import type { EstadoUsuario } from "../tipos/usuario";

export type RolBackend = "administrador" | "supervisor" | "responsable";

export interface UsuarioBackend {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: RolBackend;
  estado: EstadoUsuario;
  esAdministradorGeneral: boolean;
}

export interface BodegaBackend {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: "inventario_general" | "principal" | "sucursal";
  estado: "activa" | "inactiva";
}

export interface AsignacionBackend {
  usuario: { id: string };
  bodega: {
    id: string;
    nombre: string;
  };
}

export interface AsignacionDirectorioBackend {
  usuario: {
    id: string;
    nombre: string;
    rol: RolBackend;
    estado: EstadoUsuario;
  };
  bodega: {
    id: string;
    nombre: string;
  };
}

export interface CrearUsuarioApiPayload {
  nombre: string;
  telefono?: string;
  rol: RolBackend;
  codigoAcceso?: string;
}

export interface EditarUsuarioApiPayload {
  nombre: string;
  telefono: string;
  rol: RolBackend;
}

export async function obtenerUsuariosApi() {
  const { data } = await clienteApi.get<UsuarioBackend[]>("/usuarios");
  return data;
}

export async function obtenerAsignacionesApi() {
  const { data } = await clienteApi.get<AsignacionBackend[]>("/asignaciones");
  return data;
}

export async function obtenerBodegasActivasApi() {
  const { data } = await clienteApi.get<BodegaBackend[]>("/bodegas/activas");
  return data;
}

export async function obtenerDirectorioAsignacionesApi() {
  const { data } =
    await clienteApi.get<AsignacionDirectorioBackend[]>(
      "/asignaciones/directorio",
    );

  return data;
}

export async function crearUsuarioApi(payload: CrearUsuarioApiPayload) {
  const { data } = await clienteApi.post<UsuarioBackend>("/usuarios", payload);
  return data;
}

export async function obtenerUsuarioApi(id: string) {
  const { data } = await clienteApi.get<UsuarioBackend>(`/usuarios/${id}`);
  return data;
}

export async function editarUsuarioApi(
  id: string,
  payload: EditarUsuarioApiPayload,
) {
  const { data } = await clienteApi.patch<UsuarioBackend>(
    `/usuarios/${id}`,
    payload,
  );

  return data;
}

export async function cambiarEstadoUsuarioApi(
  id: string,
  estado: EstadoUsuario,
) {
  const { data } = await clienteApi.patch<UsuarioBackend>(
    `/usuarios/${id}/estado`,
    { estado },
  );

  return data;
}

export async function eliminarUsuarioApi(id: string) {
  await clienteApi.delete(`/usuarios/${id}`);
}

export async function reemplazarAsignacionesUsuarioApi(
  id: string,
  bodegaIds: string[],
) {
  await clienteApi.put(`/asignaciones/usuario/${id}`, { bodegaIds });
}

export async function eliminarAsignacionesUsuarioApi(id: string) {
  await clienteApi.delete(`/asignaciones/usuario/${id}`);
}

export async function restablecerCodigoAccesoApi(
  id: string,
  nuevoCodigo: string,
  codigoAdministradorGeneral: string,
) {
  await clienteApi.patch(`/usuarios/${id}/codigo`, {
    nuevoCodigo,
    codigoAdministradorGeneral,
  });
}
