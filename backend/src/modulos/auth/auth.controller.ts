import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";

import {
  AuthService,
  type RespuestaInicioSesion,
} from "./auth.service";
import { UsuarioActual } from "./decorators/usuario-actual.decorator";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import type { UsuarioAutenticado } from "./interfaces/usuario-autenticado.interface";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  iniciarSesion(
    @Body() loginDto: LoginDto,
  ): Promise<RespuestaInicioSesion> {
    return this.authService.iniciarSesion(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("perfil")
  obtenerPerfil(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): UsuarioAutenticado {
    return usuario;
  }
}
