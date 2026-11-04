import {
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class RegistrarAjusteDto {
  @IsUUID("4", {
    message: "El producto seleccionado no es válido.",
  })
  productoId!: string;

  @IsUUID("4", {
    message: "La bodega seleccionada no es válida.",
  })
  bodegaId!: string;

  @IsInt({
    message: "La nueva cantidad debe ser un número entero.",
  })
  @Min(0, {
    message: "La nueva cantidad no puede ser negativa.",
  })
  cantidadNueva!: number;

  @IsString()
  @MaxLength(255, {
    message: "La observación no puede superar 255 caracteres.",
  })
  observacion!: string;
}
