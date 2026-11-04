import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class RegistrarTransferenciaDto {
  @IsUUID("4", {
    message: "El producto seleccionado no es válido.",
  })
  productoId!: string;

  @IsUUID("4", {
    message: "La bodega de origen no es válida.",
  })
  bodegaOrigenId!: string;

  @IsUUID("4", {
    message: "La bodega de destino no es válida.",
  })
  bodegaDestinoId!: string;

  @IsInt({
    message: "La cantidad debe ser un número entero.",
  })
  @Min(1, {
    message: "La cantidad debe ser mayor que cero.",
  })
  cantidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: "La observación no puede superar 255 caracteres.",
  })
  observacion?: string;
}
