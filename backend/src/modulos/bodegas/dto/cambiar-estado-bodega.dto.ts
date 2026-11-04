import { IsEnum } from "class-validator";

import { EstadoBodega } from "../enums/estado-bodega.enum";

export class CambiarEstadoBodegaDto {
  @IsEnum(EstadoBodega, {
    message: "El estado debe ser activa o inactiva.",
  })
  estado!: EstadoBodega;
}
