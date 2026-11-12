import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class AbastecimientoDetalleDto {
  @IsUUID("4")
  detalleId!: string;

  @IsInt()
  @Min(1)
  cantidadSolicitada!: number;
}

export class SolicitarAbastecimientoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AbastecimientoDetalleDto)
  detalles!: AbastecimientoDetalleDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacionSolicitante?: string;
}
