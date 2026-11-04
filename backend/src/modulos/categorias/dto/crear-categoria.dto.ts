import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CrearCategoriaDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre de la categoría es obligatorio." })
  @MinLength(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  })
  @MaxLength(100, {
    message: "El nombre no puede superar 100 caracteres.",
  })
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, {
    message: "La descripción no puede superar 255 caracteres.",
  })
  descripcion?: string;
}
