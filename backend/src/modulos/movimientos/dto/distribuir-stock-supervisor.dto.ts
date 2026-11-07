import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class DistribuirStockSupervisorDto {
  @IsUUID("4", {
    message: "El producto seleccionado no es válido.",
  })
  productoId!: string;

  @IsUUID("4", {
    message: "El stock seleccionado no es válido.",
  })
  bodegaStockId!: string;

  @IsArray({
    message: "Debes seleccionar al menos una bodega destino.",
  })
  @ArrayNotEmpty({
    message: "Debes seleccionar al menos una bodega destino.",
  })
  @ArrayUnique({
    message: "No puedes seleccionar la misma bodega más de una vez.",
  })
  @IsUUID("4", {
    each: true,
    message: "Una de las bodegas destino no es válida.",
  })
  bodegaDestinoIds!: string[];

  @IsInt({
    message: "La cantidad total debe ser un número entero.",
  })
  @Min(1, {
    message: "La cantidad total debe ser mayor que cero.",
  })
  cantidadTotal!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: "La observación no puede superar 255 caracteres.",
  })
  observacion?: string;
}
