import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class RevertirMovimientoDto {
  @IsString()
  @IsNotEmpty({
    message: "El motivo de la reversión es obligatorio.",
  })
  @MaxLength(500, {
    message: "El motivo no puede superar 500 caracteres.",
  })
  motivo!: string;
}
