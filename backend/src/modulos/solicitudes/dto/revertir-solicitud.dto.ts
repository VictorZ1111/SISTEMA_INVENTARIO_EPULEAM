import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class RevertirSolicitudDto {
  @IsString()
  @IsNotEmpty({
    message: "El motivo de la reversa es obligatorio.",
  })
  @MaxLength(500, {
    message: "El motivo de la reversa no puede superar 500 caracteres.",
  })
  motivo!: string;
}
