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

export interface RespuestaLoginBackend {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  usuario: UsuarioBackend;
}

export interface AsignacionesBackend {
  asignaciones: Array<{
    bodega: {
      id: string;
      nombre: string;
    };
  }>;
}

export async function obtenerPerfilApi() {
  const { data } = await clienteApi.get<UsuarioBackend>("/auth/perfil");
  return data;
}

export async function iniciarSesionApi(
  correo: string,
  codigoAcceso: string,
) {
  const { data } = await clienteApi.post<RespuestaLoginBackend>("/auth/login", {
    correo,
    codigoAcceso,
  });

  return data;
}

export async function obtenerAsignacionesMiasApi() {
  const { data } = await clienteApi.get<AsignacionesBackend>(
    "/asignaciones/mias",
  );

  return data;
}
