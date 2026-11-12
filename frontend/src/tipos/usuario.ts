import type { HorarioSemanal } from "./horarioAcceso";

export type RolUsuario = "admin" | "responsable" | "supervisor";

export type EstadoUsuario = "activo" | "inactivo";

export interface Usuario {
  id: string | number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  estado: EstadoUsuario;

  telefono?: string;
  cargo?: string;
  bodegaAsignada?: string;
  bodegasAsignadas?: string[];
  codigoAcceso?: string;
  contrasena?: string;
  esAdministradorGeneral?: boolean;
  horarioAcceso?: HorarioSemanal;
  accesoTemporalPermitido?: boolean | null;
  accesoTemporalHasta?: string | null;
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  telefono?: string;
  cargo?: string;
  bodegaAsignada?: string;
  bodegasAsignadas?: string[];
  esAdministradorGeneral?: boolean;
  horarioAcceso?: HorarioSemanal;
}
