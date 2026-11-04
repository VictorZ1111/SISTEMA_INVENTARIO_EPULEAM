import {
  IsInt,
  IsUUID,
  Min,
} from "class-validator";

export class CrearSolicitudDetalleDto {
  @IsUUID("4", {
    message: "Uno de los productos seleccionados no es válido.",
  })
  productoId!: string;

  @IsInt({
    message: "La cantidad solicitada debe ser un número entero.",
  })
  @Min(1, {
    message: "La cantidad solicitada debe ser mayor que cero.",
  })
  cantidadSolicitada!: number;
}
