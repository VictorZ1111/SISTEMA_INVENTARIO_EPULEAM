import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from "@nestjs/common";

import { Roles } from "../auth/decorators/roles.decorator";
import { UsuarioActual } from "../auth/decorators/usuario-actual.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import {
  AsignacionesService,
  type AsignacionDirectorioPublica,
  type AsignacionPublica,
  type AsignacionesUsuarioPublicas,
} from "./asignaciones.service";
import { ReemplazarAsignacionesDto } from "./dto/reemplazar-asignaciones.dto";

@Controller("asignaciones")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignacionesController {
  constructor(
    private readonly asignacionesService: AsignacionesService,
  ) {}

  @Get("mias")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarMias(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<AsignacionesUsuarioPublicas> {
    return this.asignacionesService.listarPorUsuario(
      usuario.id,
    );
  }

  @Get("directorio")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarDirectorio(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<AsignacionDirectorioPublica[]> {
    return this.asignacionesService.listarDirectorio(usuario);
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  listarTodas(): Promise<AsignacionPublica[]> {
    return this.asignacionesService.listarTodas();
  }

  @Get("usuario/:usuarioId")
  @Roles(RolUsuario.ADMINISTRADOR)
  listarPorUsuario(
    @Param("usuarioId", new ParseUUIDPipe())
    usuarioId: string,
  ): Promise<AsignacionesUsuarioPublicas> {
    return this.asignacionesService.listarPorUsuario(
      usuarioId,
    );
  }

  @Put("usuario/:usuarioId")
  @Roles(RolUsuario.ADMINISTRADOR)
  reemplazarAsignaciones(
    @Param("usuarioId", new ParseUUIDPipe())
    usuarioId: string,
    @Body() dto: ReemplazarAsignacionesDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<AsignacionesUsuarioPublicas> {
    return this.asignacionesService.reemplazarAsignaciones(
      usuarioId,
      dto.bodegaIds,
      usuario,
    );
  }

  @Delete("usuario/:usuarioId")
  @Roles(RolUsuario.ADMINISTRADOR)
  eliminarAsignaciones(
    @Param("usuarioId", new ParseUUIDPipe())
    usuarioId: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<{ message: string }> {
    return this.asignacionesService.eliminarAsignaciones(
      usuarioId,
      usuario,
    );
  }
}
