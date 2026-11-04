import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class RegistrarSalidaDto {
  @IsUUID("4", {
    message: "El producto seleccionado no es válido.",
  })
  productoId!: string;

  @IsUUID("4", {
    message: "La bodega seleccionada no es válida.",
  })
  bodegaOrigenId!: string;

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
