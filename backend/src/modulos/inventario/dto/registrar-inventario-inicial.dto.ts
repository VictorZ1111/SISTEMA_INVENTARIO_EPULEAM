import {
  IsInt,
  IsUUID,
  Min,
} from "class-validator";

export class RegistrarInventarioInicialDto {
  @IsUUID("4", {
    message: "El producto seleccionado no es válido.",
  })
  productoId!: string;

  @IsUUID("4", {
    message: "La bodega seleccionada no es válida.",
  })
  bodegaId!: string;

  @IsInt({
    message: "La cantidad debe ser un número entero.",
  })
  @Min(0, {
    message: "La cantidad no puede ser negativa.",
  })
  cantidad!: number;
}
