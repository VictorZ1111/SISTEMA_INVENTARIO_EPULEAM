import { IsEnum } from "class-validator";

import { EstadoProducto } from "../enums/estado-producto.enum";

export class CambiarEstadoProductoDto {
  @IsEnum(EstadoProducto, {
    message: "El estado debe ser activo o inactivo.",
  })
  estado!: EstadoProducto;
}
