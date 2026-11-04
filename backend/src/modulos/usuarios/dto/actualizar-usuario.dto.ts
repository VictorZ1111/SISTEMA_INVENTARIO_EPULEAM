import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { RolUsuario } from "../enums/rol-usuario.enum";

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "El nombre debe tener al menos 3 caracteres." })
  @MaxLength(120, { message: "El nombre no puede superar 120 caracteres." })
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "El teléfono no puede superar 20 caracteres." })
  telefono?: string;

  @IsOptional()
  @IsEnum(RolUsuario, { message: "El rol seleccionado no es válido." })
  rol?: RolUsuario;
}
