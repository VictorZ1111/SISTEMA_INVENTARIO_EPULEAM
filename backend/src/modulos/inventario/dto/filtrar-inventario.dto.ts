import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

import { TipoProducto } from "../../productos/enums/tipo-producto.enum";

export class FiltrarInventarioDto {
  @IsOptional()
  @IsUUID("4", {
    message: "La bodega seleccionada no es válida.",
  })
  bodegaId?: string;

  @IsOptional()
  @IsUUID("4", {
    message: "El producto seleccionado no es válido.",
  })
  productoId?: string;

  @IsOptional()
  @IsUUID("4", {
    message: "La categoría seleccionada no es válida.",
  })
  categoriaId?: string;

  @IsOptional()
  @IsEnum(TipoProducto, {
    message: "El tipo de producto no es válido.",
  })
  tipoProducto?: TipoProducto;

  @IsOptional()
  @IsUUID("4", {
    message: "El custodio seleccionado no es válido.",
  })
  custodioId?: string;

  @IsOptional()
  @IsDateString({}, {
    message: "La fecha inicial no es válida.",
  })
  fechaInicio?: string;

  @IsOptional()
  @IsDateString({}, {
    message: "La fecha final no es válida.",
  })
  fechaFin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150, {
    message: "La búsqueda no puede superar 150 caracteres.",
  })
  buscar?: string;
}
