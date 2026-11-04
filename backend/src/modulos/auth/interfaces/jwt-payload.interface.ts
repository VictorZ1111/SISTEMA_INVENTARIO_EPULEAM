import { RolUsuario } from "../../usuarios/enums/rol-usuario.enum";

export interface JwtPayload {
  sub: string;
  rol: RolUsuario;
  esAdministradorGeneral: boolean;
}
