import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

import { EstadoProducto } from "../enums/estado-producto.enum";
import { TipoProducto } from "../enums/tipo-producto.enum";

export class FiltrarProductosDto {
  @IsOptional()
  @IsString()
  @MaxLength(150, {
    message: "La búsqueda no puede superar 150 caracteres.",
  })
  buscar?: string;

  @IsOptional()
  @IsUUID("4", {
    message: "La categoría seleccionada no es válida.",
  })
  categoriaId?: string;

  @IsOptional()
  @IsEnum(TipoProducto, {
    message:
      "El tipo de producto debe ser consumible o no_consumible.",
  })
  tipoProducto?: TipoProducto;

  @IsOptional()
  @IsEnum(EstadoProducto, {
    message: "El estado debe ser activo o inactivo.",
  })
  estado?: EstadoProducto;
}
