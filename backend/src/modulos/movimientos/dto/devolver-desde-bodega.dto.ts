import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

/** Devolución de una existencia ubicada en una bodega o sucursal final. */
export class DevolverDesdeBodegaDto {
  @IsUUID("4", { message: "La existencia seleccionada no es válida." })
  existenciaId!: string;

  @IsInt({ message: "La cantidad a devolver debe ser un entero." })
  @Min(1, { message: "Debes devolver al menos una unidad." })
  cantidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "La observación no puede superar los 255 caracteres." })
  observacion?: string;
}
