import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class EliminarBodegaDto {
  @IsString()
  @IsNotEmpty({ message: "Ingresa el código del Administrador General para continuar." })
  @MaxLength(100)
  codigoAdministradorGeneral!: string;
}
