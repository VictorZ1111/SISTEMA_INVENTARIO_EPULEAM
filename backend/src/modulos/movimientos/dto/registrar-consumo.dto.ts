import { IsInt, IsUUID, Min } from "class-validator";

/** Baja de unidades efectivamente utilizadas; no desactiva el producto maestro. */
export class RegistrarConsumoDto {
  @IsUUID("4", { message: "La existencia seleccionada no es válida." })
  existenciaId!: string;

  @IsInt({ message: "La cantidad utilizada debe ser un número entero." })
  @Min(1, { message: "Debes registrar al menos una unidad utilizada." })
  cantidad!: number;
}
