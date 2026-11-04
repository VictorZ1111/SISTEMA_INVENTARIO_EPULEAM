import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

import { TipoMovimiento } from "../enums/tipo-movimiento.enum";

export class FiltrarMovimientosDto {
  @IsOptional()
  @IsEnum(TipoMovimiento, {
    message: "El tipo de movimiento no es válido.",
  })
  tipo?: TipoMovimiento;

  @IsOptional()
  @IsUUID("4", {
    message: "El producto seleccionado no es válido.",
  })
  productoId?: string;

  @IsOptional()
  @IsUUID("4", {
    message: "La bodega seleccionada no es válida.",
  })
  bodegaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150, {
    message: "La búsqueda no puede superar 150 caracteres.",
  })
  buscar?: string;
}
