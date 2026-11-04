import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RolUsuario } from "../../usuarios/enums/rol-usuario.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { UsuarioAutenticado } from "../interfaces/usuario-autenticado.interface";

interface RequestConUsuario {
  user?: UsuarioAutenticado;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rolesPermitidos?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const usuario = request.user;

    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      throw new ForbiddenException(
        "No tienes permisos para realizar esta acción.",
      );
    }

    return true;
  }
}
