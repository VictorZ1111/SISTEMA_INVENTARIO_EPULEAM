import {
  ArrayUnique,
  IsArray,
  IsUUID,
} from "class-validator";

export class ReemplazarAsignacionesDto {
  @IsArray({
    message: "Las bodegas deben enviarse en una lista.",
  })
  @ArrayUnique({
    message: "No se pueden repetir bodegas en la asignación.",
  })
  @IsUUID("4", {
    each: true,
    message: "Una de las bodegas seleccionadas no es válida.",
  })
  bodegaIds!: string[];
}
