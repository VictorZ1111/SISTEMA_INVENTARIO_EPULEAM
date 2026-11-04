import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { UsuariosService } from "../../usuarios/usuarios.service";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
import { UsuarioAutenticado } from "../interfaces/usuario-autenticado.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usuariosService: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.usuariosService.buscarActivoPorId(payload.sub);

    if (!usuario) {
      throw new UnauthorizedException(
        "La sesión no corresponde a un usuario activo.",
      );
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono,
      rol: usuario.rol,
      estado: usuario.estado,
      esAdministradorGeneral: usuario.esAdministradorGeneral,
    };
  }
}
