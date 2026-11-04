import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { Roles } from "../auth/decorators/roles.decorator";
import { UsuarioActual } from "../auth/decorators/usuario-actual.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ActualizarUsuarioDto } from "./dto/actualizar-usuario.dto";
import { CambiarEstadoUsuarioDto } from "./dto/cambiar-estado-usuario.dto";
import { CrearUsuarioDto } from "./dto/crear-usuario.dto";
import { RestablecerCodigoDto } from "./dto/restablecer-codigo.dto";
import { RolUsuario } from "./enums/rol-usuario.enum";
import {
  UsuariosService,
  type UsuarioPublico,
} from "./usuarios.service";

@Controller("usuarios")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar(): Promise<UsuarioPublico[]> {
    return this.usuariosService.listar();
  }

  @Get(":id")
  buscarPorId(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<UsuarioPublico> {
    return this.usuariosService.buscarPublicoPorId(id);
  }

  @Post()
  crear(
    @Body() dto: CrearUsuarioDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<UsuarioPublico> {
    return this.usuariosService.crear(dto, usuario);
  }

  @Patch(":id")
  actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<UsuarioPublico> {
    return this.usuariosService.actualizar(id, dto, usuario);
  }

  @Patch(":id/estado")
  cambiarEstado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CambiarEstadoUsuarioDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<UsuarioPublico> {
    return this.usuariosService.cambiarEstado(id, dto.estado, usuario);
  }

  @Patch(":id/codigo")
  restablecerCodigo(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: RestablecerCodigoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<{ message: string }> {
    return this.usuariosService.restablecerCodigo(
      id,
      dto.nuevoCodigo,
      dto.codigoAdministradorGeneral,
      usuario,
    );
  }

  @Delete(":id")
  eliminar(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string }> {
    return this.usuariosService.eliminar(id);
  }
}
