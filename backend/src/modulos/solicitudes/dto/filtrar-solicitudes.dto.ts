import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

import { EstadoSolicitud } from "../enums/estado-solicitud.enum";

export class FiltrarSolicitudesDto {
  @IsOptional()
  @IsEnum(EstadoSolicitud, {
    message: "El estado de solicitud no es válido.",
  })
  estado?: EstadoSolicitud;

  @IsOptional()
  @IsUUID("4", {
    message: "La bodega seleccionada no es válida.",
  })
  bodegaId?: string;

  @IsOptional()
  @IsUUID("4", {
    message: "El usuario seleccionado no es válido.",
  })
  usuarioId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150, {
    message: "La búsqueda no puede superar 150 caracteres.",
  })
  buscar?: string;
}
