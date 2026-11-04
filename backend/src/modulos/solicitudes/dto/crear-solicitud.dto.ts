import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

import { CrearSolicitudDetalleDto } from "./crear-solicitud-detalle.dto";

export class CrearSolicitudDto {
  @IsUUID("4", {
    message: "La bodega solicitante seleccionada no es válida.",
  })
  bodegaSolicitanteId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: "La observación no puede superar 500 caracteres.",
  })
  observacionSolicitante?: string;

  @IsArray({
    message: "Los productos deben enviarse en una lista.",
  })
  @ArrayMinSize(1, {
    message: "La solicitud debe contener al menos un producto.",
  })
  @ValidateNested({ each: true })
  @Type(() => CrearSolicitudDetalleDto)
  detalles!: CrearSolicitudDetalleDto[];
}
