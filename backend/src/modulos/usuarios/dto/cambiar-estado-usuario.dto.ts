import { IsEnum } from "class-validator";

import { EstadoUsuario } from "../enums/estado-usuario.enum";

export class CambiarEstadoUsuarioDto {
  @IsEnum(EstadoUsuario, {
    message: "El estado debe ser activo o inactivo.",
  })
  estado!: EstadoUsuario;
}
