import { IsEmail, Matches } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "El correo ingresado no es válido." })
  correo!: string;

  @Matches(/^[A-Za-z]{2}\d{5}[^A-Za-z0-9]$/, {
    message:
      "El código debe contener 2 letras, 5 números y 1 carácter especial.",
  })
  codigoAcceso!: string;
}
