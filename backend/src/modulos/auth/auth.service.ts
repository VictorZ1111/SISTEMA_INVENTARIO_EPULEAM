import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";

import {
  UsuariosService,
  type UsuarioPublico,
} from "../usuarios/usuarios.service";
import { LoginDto } from "./dto/login.dto";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";

export interface RespuestaInicioSesion {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  usuario: UsuarioPublico;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async iniciarSesion(
    loginDto: LoginDto,
  ): Promise<RespuestaInicioSesion> {
    const usuario = await this.usuariosService.buscarParaAutenticacion(
      loginDto.correo,
      loginDto.codigoAcceso,
    );

    if (!usuario?.codigoAccesoHash) {
      throw new UnauthorizedException(
        "El correo o el código de acceso son incorrectos.",
      );
    }

    const codigoValido = await this.usuariosService.compararCodigo(
      loginDto.codigoAcceso,
      usuario.codigoAccesoHash,
    );

    if (!codigoValido) {
      throw new UnauthorizedException(
        "El correo o el código de acceso son incorrectos.",
      );
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      rol: usuario.rol,
      esAdministradorGeneral: usuario.esAdministradorGeneral,
    };

    const expiresIn = this.configService.getOrThrow<string>(
      "JWT_EXPIRES_IN",
    );

    const opcionesFirma: JwtSignOptions = {
      expiresIn: expiresIn as JwtSignOptions["expiresIn"],
    };

    const accessToken = await this.jwtService.signAsync(
      payload,
      opcionesFirma,
    );

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn,
      usuario: this.usuariosService.convertirAPublico(usuario),
    };
  }
}
