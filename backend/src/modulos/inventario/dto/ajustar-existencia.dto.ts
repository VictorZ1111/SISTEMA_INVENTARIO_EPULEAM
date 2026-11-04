import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class AjustarExistenciaDto {
  @IsInt({
    message: "La nueva cantidad debe ser un número entero.",
  })
  @Min(0, {
    message: "La nueva cantidad no puede ser negativa.",
  })
  cantidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: "La observación no puede superar 255 caracteres.",
  })
  observacion?: string;
}
