import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { Roles } from "../auth/decorators/roles.decorator";
import { UsuarioActual } from "../auth/decorators/usuario-actual.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import { AtenderSolicitudDto } from "./dto/atender-solicitud.dto";
import { CrearSolicitudDto } from "./dto/crear-solicitud.dto";
import { FiltrarSolicitudesDto } from "./dto/filtrar-solicitudes.dto";
import { RechazarSolicitudDto } from "./dto/rechazar-solicitud.dto";
import { RevertirSolicitudDto } from "./dto/revertir-solicitud.dto";
import {
  SolicitudesService,
  type SolicitudPublica,
} from "./solicitudes.service";

@Controller("solicitudes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesController {
  constructor(
    private readonly solicitudesService: SolicitudesService,
  ) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  listar(
    @Query() filtros: FiltrarSolicitudesDto,
  ): Promise<SolicitudPublica[]> {
    return this.solicitudesService.listar(filtros);
  }

  @Get("mias")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarMias(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica[]> {
    return this.solicitudesService.listarMias(usuario);
  }

  @Get(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  buscarPorId(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    return this.solicitudesService.buscarPorId(
      id,
      usuario,
    );
  }

  @Post()
  @Roles(
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  crear(
    @Body() dto: CrearSolicitudDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    return this.solicitudesService.crear(dto, usuario);
  }

  @Post(":id/atender")
  @Roles(RolUsuario.ADMINISTRADOR)
  atender(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AtenderSolicitudDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    return this.solicitudesService.atender(
      id,
      dto,
      usuario,
    );
  }

  @Post(":id/revertir")
  @Roles(RolUsuario.ADMINISTRADOR)
  revertir(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: RevertirSolicitudDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    return this.solicitudesService.revertir(
      id,
      dto,
      usuario,
    );
  }

  @Post(":id/rechazar")
  @Roles(RolUsuario.ADMINISTRADOR)
  rechazar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: RechazarSolicitudDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<SolicitudPublica> {
    return this.solicitudesService.rechazar(
      id,
      dto,
      usuario,
    );
  }
}
