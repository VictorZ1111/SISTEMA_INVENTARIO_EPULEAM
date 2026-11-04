import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class RechazarSolicitudDto {
  @IsString()
  @IsNotEmpty({
    message: "El motivo del rechazo es obligatorio.",
  })
  @MaxLength(500, {
    message: "El motivo del rechazo no puede superar 500 caracteres.",
  })
  observacionAtencion!: string;
}
