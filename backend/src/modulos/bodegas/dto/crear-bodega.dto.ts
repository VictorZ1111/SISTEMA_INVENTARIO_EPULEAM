import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

import { TipoBodega } from "../enums/tipo-bodega.enum";

export class CrearBodegaDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre de la bodega es obligatorio." })
  @MinLength(3, {
    message: "El nombre debe tener al menos 3 caracteres.",
  })
  @MaxLength(120, {
    message: "El nombre no puede superar 120 caracteres.",
  })
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: "La descripción no puede superar 255 caracteres.",
  })
  descripcion?: string;

  @IsEnum(TipoBodega, {
    message: "El tipo de bodega seleccionado no es válido.",
  })
  tipo!: TipoBodega;

  @IsOptional()
  @IsUUID("4", {
    message: "La bodega padre seleccionada no es válida.",
  })
  bodegaPadreId?: string;
}
