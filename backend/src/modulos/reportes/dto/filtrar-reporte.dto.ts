import {
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

import { TipoMovimiento } from "../../movimientos/enums/tipo-movimiento.enum";
import { TipoProducto } from "../../productos/enums/tipo-producto.enum";

export enum TipoPeriodoReporte {
  DIA = "dia",
  MES = "mes",
  ANIO = "anio",
  RANGO = "rango",
}

export class FiltrarReporteDto {
  @IsOptional()
  @IsEnum(TipoPeriodoReporte, {
    message: "El periodo del reporte no es válido.",
  })
  periodo?: TipoPeriodoReporte;

  @IsOptional()
  @IsDateString(
    {},
    {
      message: "La fecha del reporte no es válida.",
    },
  )
  fecha?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: "El mes debe tener formato YYYY-MM.",
  })
  mes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El año debe ser un número entero." })
  @Min(2000, { message: "El año mínimo permitido es 2000." })
  @Max(2100, { message: "El año máximo permitido es 2100." })
  anio?: number;

  @IsOptional()
  @IsDateString(
    {},
    {
      message: "La fecha inicial no es válida.",
    },
  )
  fechaInicio?: string;

  @IsOptional()
  @IsDateString(
    {},
    {
      message: "La fecha final no es válida.",
    },
  )
  fechaFin?: string;

  @IsOptional()
  @IsEnum(TipoProducto, {
    message: "El tipo de bien no es válido.",
  })
  tipoProducto?: TipoProducto;

  @IsOptional()
  @IsUUID("4", {
    message: "La bodega seleccionada no es válida.",
  })
  bodegaId?: string;

  @IsOptional()
  @IsUUID("4", {
    message: "El custodio seleccionado no es válido.",
  })
  custodioId?: string;

  @IsOptional()
  @IsEnum(TipoMovimiento, {
    message: "El tipo de movimiento no es válido.",
  })
  tipoMovimiento?: TipoMovimiento;

  @IsOptional()
  @IsBooleanString({
    message: "El indicador de sucursales debe ser true o false.",
  })
  incluirSucursales?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150, {
    message: "La búsqueda no puede superar 150 caracteres.",
  })
  buscar?: string;
}
