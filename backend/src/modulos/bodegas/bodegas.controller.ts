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
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import {
  BodegasService,
  type BodegaPublica,
} from "./bodegas.service";
import { ActualizarBodegaDto } from "./dto/actualizar-bodega.dto";
import { CambiarEstadoBodegaDto } from "./dto/cambiar-estado-bodega.dto";
import { CrearBodegaDto } from "./dto/crear-bodega.dto";

@Controller("bodegas")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BodegasController {
  constructor(private readonly bodegasService: BodegasService) {}

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listar(): Promise<BodegaPublica[]> {
    return this.bodegasService.listar();
  }

  @Get("activas")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarActivas(): Promise<BodegaPublica[]> {
    return this.bodegasService.listarActivas();
  }

  @Get(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  buscarPorId(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<BodegaPublica> {
    return this.bodegasService.buscarPublicaPorId(id);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  crear(
    @Body() dto: CrearBodegaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<BodegaPublica> {
    return this.bodegasService.crear(dto, usuario);
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR)
  actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ActualizarBodegaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<BodegaPublica> {
    return this.bodegasService.actualizar(id, dto, usuario);
  }

  @Patch(":id/estado")
  @Roles(RolUsuario.ADMINISTRADOR)
  cambiarEstado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CambiarEstadoBodegaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<BodegaPublica> {
    return this.bodegasService.cambiarEstado(id, dto.estado, usuario);
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR)
  eliminar(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<{ message: string }> {
    return this.bodegasService.eliminar(id);
  }
}
