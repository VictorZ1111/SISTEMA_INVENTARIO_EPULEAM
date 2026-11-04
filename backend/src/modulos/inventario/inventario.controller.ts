import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AjustarExistenciaDto } from "./dto/ajustar-existencia.dto";
import { FiltrarInventarioDto } from "./dto/filtrar-inventario.dto";
import { RegistrarInventarioInicialDto } from "./dto/registrar-inventario-inicial.dto";
import {
  InventarioService,
  type ExistenciaPublica,
  type InventarioFrontendItem,
} from "./inventario.service";

@Controller("inventario")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventarioController {
  constructor(
    private readonly inventarioService: InventarioService,
  ) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  listar(
    @Query() filtros: FiltrarInventarioDto,
  ): Promise<ExistenciaPublica[]> {
    return this.inventarioService.listar(filtros);
  }

  @Get("frontend")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarFrontend(
    @Query() filtros: FiltrarInventarioDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<InventarioFrontendItem[]> {
    return this.inventarioService.listarFrontend(
      usuario,
      filtros,
    );
  }

  @Get("mio")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarMio(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ExistenciaPublica[]> {
    return this.inventarioService.listarMio(usuario);
  }

  @Get("bodega/:bodegaId")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarPorBodega(
    @Param("bodegaId", new ParseUUIDPipe())
    bodegaId: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ExistenciaPublica[]> {
    return this.inventarioService.listarPorBodega(
      bodegaId,
      usuario,
    );
  }

  @Get(":id")
  @Roles(RolUsuario.ADMINISTRADOR)
  buscarPorId(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ExistenciaPublica> {
    return this.inventarioService.buscarPorId(id);
  }

  @Post("inicial")
  @Roles(RolUsuario.ADMINISTRADOR)
  registrarInicial(
    @Body() dto: RegistrarInventarioInicialDto,
  ): Promise<ExistenciaPublica> {
    return this.inventarioService.registrarInicial(dto);
  }

  @Patch(":id/ajuste")
  @Roles(RolUsuario.ADMINISTRADOR)
  ajustar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AjustarExistenciaDto,
  ): Promise<ExistenciaPublica> {
    return this.inventarioService.ajustar(id, dto);
  }
}
