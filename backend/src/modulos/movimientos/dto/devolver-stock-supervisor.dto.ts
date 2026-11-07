import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class DevolverStockSupervisorDto {
  @IsUUID("4", {
    message: "El producto seleccionado no es válido.",
  })
  productoId!: string;

  @IsUUID("4", {
    message: "El stock seleccionado no es válido.",
  })
  bodegaStockId!: string;

  @IsInt({
    message: "La cantidad a devolver debe ser un número entero.",
  })
  @Min(1, {
    message: "La cantidad a devolver debe ser mayor que cero.",
  })
  cantidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: "La observación no puede superar 255 caracteres.",
  })
  observacion?: string;
}
