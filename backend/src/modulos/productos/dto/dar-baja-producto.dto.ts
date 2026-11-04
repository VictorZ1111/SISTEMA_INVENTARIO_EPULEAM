import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class DarBajaProductoDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: "La observación no puede superar 255 caracteres.",
  })
  observacion?: string;
}
