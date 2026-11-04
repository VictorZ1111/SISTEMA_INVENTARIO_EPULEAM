import {
  Body,
  Controller,
  Delete,
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
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import { ActualizarProductoDto } from "./dto/actualizar-producto.dto";
import { CambiarEstadoProductoDto } from "./dto/cambiar-estado-producto.dto";
import { CrearProductoDto } from "./dto/crear-producto.dto";
import { DarBajaProductoDto } from "./dto/dar-baja-producto.dto";
import { FiltrarProductosDto } from "./dto/filtrar-productos.dto";
import {
  ProductosService,
  type ProductoPublico,
} from "./productos.service";

@Controller("productos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductosController {
  constructor(
    private readonly productosService: ProductosService,
  ) {}

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listar(
    @Query() filtros: FiltrarProductosDto,
  ): Promise<ProductoPublico[]> {
    return this.productosService.listar(filtros);
  }

  @Get("activos")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarActivos(): Promise<ProductoPublico[]> {
    return this.productosService.listarActivos();
  }

  @Get(":id")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  buscarPorId(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ProductoPublico> {
    return this.productosService.buscarPorId(id);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  crear(
    @Body() dto: CrearProductoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ProductoPublico> {
    return this.productosService.crear(dto, usuario);
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR)
  actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ActualizarProductoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ProductoPublico> {
    return this.productosService.actualizar(id, dto, usuario);
  }

  @Patch(":id/estado")
  @Roles(RolUsuario.ADMINISTRADOR)
  cambiarEstado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CambiarEstadoProductoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ProductoPublico> {
    return this.productosService.cambiarEstado(id, dto.estado, usuario);
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR)
  eliminar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DarBajaProductoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<{ message: string }> {
    return this.productosService.eliminar(id, dto, usuario);
  }
}
