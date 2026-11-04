import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

import { AtenderSolicitudDetalleDto } from "./atender-solicitud-detalle.dto";

export class AtenderSolicitudDto {
  @IsArray({
    message: "Los detalles de atención deben enviarse en una lista.",
  })
  @ArrayMinSize(1, {
    message: "Debe atenderse al menos un producto.",
  })
  @ValidateNested({ each: true })
  @Type(() => AtenderSolicitudDetalleDto)
  detalles!: AtenderSolicitudDetalleDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: "La observación no puede superar 500 caracteres.",
  })
  observacionAtencion?: string;
}
