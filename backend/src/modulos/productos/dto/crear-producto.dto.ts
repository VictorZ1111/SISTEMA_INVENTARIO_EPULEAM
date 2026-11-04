import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { AtributoProducto } from "../enums/atributo-producto.enum";
import { EstadoBienProducto } from "../enums/estado-bien-producto.enum";
import { EstadoProducto } from "../enums/estado-producto.enum";
import { TipoProducto } from "../enums/tipo-producto.enum";

export class CrearProductoDto {
  @IsString()
  @IsNotEmpty({ message: "El código del producto es obligatorio." })
  @MinLength(2, {
    message: "El código debe tener al menos 2 caracteres.",
  })
  @MaxLength(40, {
    message: "El código no puede superar 40 caracteres.",
  })
  @Matches(/^[A-Za-z0-9._/-]+$/, {
    message:
      "El código solo puede contener letras, números, puntos, guiones, barras y guion bajo.",
  })
  codigo!: string;

  @IsOptional()
  @IsString()
  @MinLength(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  })
  @MaxLength(150, {
    message: "El nombre no puede superar 150 caracteres.",
  })
  nombre?: string;

  /**
   * Campo usado por el frontend como descripción principal del bien.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: "La descripción no puede superar 500 caracteres.",
  })
  descripcion?: string;

  @IsUUID("4", {
    message: "La categoría seleccionada no es válida.",
  })
  categoriaId!: string;

  @IsEnum(TipoProducto, {
    message:
      "El tipo de producto debe ser consumible o no_consumible.",
  })
  tipoProducto!: TipoProducto;

  @IsOptional()
  @IsEnum(AtributoProducto, {
    message: "El atributo debe ser BLD o BCA.",
  })
  atributo?: AtributoProducto | null;

  @IsOptional()
  @IsEnum(AtributoProducto, {
    message: "La empresa debe ser BLD o BCA.",
  })
  empresa?: AtributoProducto | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  marca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  material?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dimensiones?: string;

  @IsOptional()
  @IsEnum(EstadoBienProducto, {
    message: "El estado del bien debe ser bueno, regular o malo.",
  })
  estadoBien?: EstadoBienProducto;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  ubicacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  custodioActual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  procedencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  codigoUleam?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  unidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @IsOptional()
  @IsDateString({}, {
    message: "La fecha de registro no es válida.",
  })
  fechaRegistro?: string;

  @IsOptional()
  @IsInt({
    message: "La cantidad debe ser un número entero.",
  })
  @Min(0, {
    message: "La cantidad no puede ser negativa.",
  })
  cantidad?: number;

  @IsOptional()
  @IsEnum(EstadoProducto, {
    message: "El estado debe ser activo o inactivo.",
  })
  estado?: EstadoProducto;

}
