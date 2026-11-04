import {
  IsInt,
  IsUUID,
  Min,
} from "class-validator";

export class AtenderSolicitudDetalleDto {
  @IsUUID("4", {
    message: "El detalle de solicitud seleccionado no es válido.",
  })
  detalleId!: string;

  @IsInt({
    message: "La cantidad entregada debe ser un número entero.",
  })
  @Min(0, {
    message: "La cantidad entregada no puede ser negativa.",
  })
  cantidadEntregada!: number;

  @IsInt({
    message: "La cantidad rechazada debe ser un número entero.",
  })
  @Min(0, {
    message: "La cantidad rechazada no puede ser negativa.",
  })
  cantidadRechazada!: number;
}
