import {
  createParamDecorator,
  ExecutionContext,
} from "@nestjs/common";
import { Request } from "express";

import { UsuarioAutenticado } from "../interfaces/usuario-autenticado.interface";

interface RequestConUsuario extends Request {
  user: UsuarioAutenticado;
}

export const UsuarioActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado => {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    return request.user;
  },
);
