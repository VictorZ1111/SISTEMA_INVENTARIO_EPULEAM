import { IsEnum } from "class-validator";

import { EstadoCategoria } from "../enums/estado-categoria.enum";

export class CambiarEstadoCategoriaDto {
  @IsEnum(EstadoCategoria, {
    message: "El estado debe ser activa o inactiva.",
  })
  estado!: EstadoCategoria;
}
