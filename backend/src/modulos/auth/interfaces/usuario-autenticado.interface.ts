import { EstadoUsuario } from "../../usuarios/enums/estado-usuario.enum";
import { RolUsuario } from "../../usuarios/enums/rol-usuario.enum";

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: RolUsuario;
  estado: EstadoUsuario;
  esAdministradorGeneral: boolean;
}
