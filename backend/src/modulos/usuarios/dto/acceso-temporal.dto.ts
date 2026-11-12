import { IsBoolean } from "class-validator";

export class AccesoTemporalDto {
  @IsBoolean({ message: "Indica si deseas permitir o bloquear el acceso durante una hora." })
  permitido!: boolean;
}
