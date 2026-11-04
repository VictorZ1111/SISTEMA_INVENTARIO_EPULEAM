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
  CategoriasService,
  type CategoriaPublica,
} from "./categorias.service";
import { ActualizarCategoriaDto } from "./dto/actualizar-categoria.dto";
import { CambiarEstadoCategoriaDto } from "./dto/cambiar-estado-categoria.dto";
import { CrearCategoriaDto } from "./dto/crear-categoria.dto";

@Controller("categorias")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriasController {
  constructor(
    private readonly categoriasService: CategoriasService,
  ) {}

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listar(): Promise<CategoriaPublica[]> {
    return this.categoriasService.listar();
  }

  @Get("activas")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarActivas(): Promise<CategoriaPublica[]> {
    return this.categoriasService.listarActivas();
  }

  @Get(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  buscarPorId(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<CategoriaPublica> {
    return this.categoriasService.buscarPorId(id);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  crear(
    @Body() dto: CrearCategoriaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<CategoriaPublica> {
    return this.categoriasService.crear(dto, usuario);
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR)
  actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ActualizarCategoriaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<CategoriaPublica> {
    return this.categoriasService.actualizar(id, dto, usuario);
  }

  @Patch(":id/estado")
  @Roles(RolUsuario.ADMINISTRADOR)
  cambiarEstado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CambiarEstadoCategoriaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<CategoriaPublica> {
    return this.categoriasService.cambiarEstado(id, dto.estado, usuario);
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR)
  eliminar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<{ message: string }> {
    return this.categoriasService.eliminar(id, usuario);
  }
}
