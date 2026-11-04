import { Matches } from "class-validator";

export class RestablecerCodigoDto {
  @Matches(/^[A-Za-z]{2}\d{5}[^A-Za-z0-9]$/, {
    message:
      "El nuevo código debe contener 2 letras, 5 números y 1 carácter especial.",
  })
  nuevoCodigo!: string;

  @Matches(/^[A-Za-z]{2}\d{5}[^A-Za-z0-9]$/, {
    message: "El código de autorización no tiene un formato válido.",
  })
  codigoAdministradorGeneral!: string;
}
