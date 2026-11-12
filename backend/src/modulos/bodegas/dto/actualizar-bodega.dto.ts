import {
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

import { TipoBodega } from "../enums/tipo-bodega.enum";

export class ActualizarBodegaDto {
  @IsString()
  @IsNotEmpty({ message: "Ingresa el código del Administrador General para editar la bodega." })
  @MaxLength(100)
  codigoAdministradorGeneral!: string;

  @IsOptional()
  @IsString()
  @MinLength(3, {
    message: "El nombre debe tener al menos 3 caracteres.",
  })
  @MaxLength(120, {
    message: "El nombre no puede superar 120 caracteres.",
  })
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: "La descripción no puede superar 255 caracteres.",
  })
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoBodega, {
    message: "El tipo de bodega seleccionado no es válido.",
  })
  tipo?: TipoBodega;

  @IsOptional()
  @IsUUID("4", {
    message: "La bodega padre seleccionada no es válida.",
  })
  bodegaPadreId?: string | null;
}
