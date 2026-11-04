import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

import { RolUsuario } from "../enums/rol-usuario.enum";

export class CrearUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre es obligatorio." })
  @MinLength(3, { message: "El nombre debe tener al menos 3 caracteres." })
  @MaxLength(120, { message: "El nombre no puede superar 120 caracteres." })
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "El teléfono no puede superar 20 caracteres." })
  telefono?: string;

  @IsEnum(RolUsuario, { message: "El rol seleccionado no es válido." })
  rol!: RolUsuario;

  @Matches(/^[A-Za-z]{2}\d{5}[^A-Za-z0-9]$/, {
    message:
      "El código debe contener 2 letras, 5 números y 1 carácter especial.",
  })
  codigoAcceso!: string;
}
