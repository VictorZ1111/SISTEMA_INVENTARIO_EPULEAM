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
import { FiltrarMovimientosDto } from "./dto/filtrar-movimientos.dto";
import { RegistrarAjusteDto } from "./dto/registrar-ajuste.dto";
import { RegistrarEntradaDto } from "./dto/registrar-entrada.dto";
import { RegistrarSalidaDto } from "./dto/registrar-salida.dto";
import { RegistrarTransferenciaDto } from "./dto/registrar-transferencia.dto";
import { RevertirMovimientoDto } from "./dto/revertir-movimiento.dto";
import {
  MovimientosService,
  type MovimientoPublico,
} from "./movimientos.service";
import { ReversionesMovimientosService } from "./reversiones-movimientos.service";

@Controller("movimientos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosController {
  constructor(
    private readonly movimientosService: MovimientosService,
    private readonly reversionesService: ReversionesMovimientosService,
  ) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  listar(
    @Query() filtros: FiltrarMovimientosDto,
  ): Promise<MovimientoPublico[]> {
    return this.movimientosService.listar(filtros);
  }

  @Get("mios")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
    RolUsuario.RESPONSABLE,
  )
  listarMios(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico[]> {
    return this.movimientosService.listarMios(usuario);
  }

  @Get(":id")
  @Roles(RolUsuario.ADMINISTRADOR)
  buscarPorId(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<MovimientoPublico> {
    return this.movimientosService.buscarPorId(id);
  }

  @Post("entrada")
  @Roles(RolUsuario.ADMINISTRADOR)
  registrarEntrada(
    @Body() dto: RegistrarEntradaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico> {
    return this.movimientosService.registrarEntrada(
      dto,
      usuario,
    );
  }

  @Post("transferencia")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
  )
  registrarTransferencia(
    @Body() dto: RegistrarTransferenciaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico> {
    return this.movimientosService.registrarTransferencia(
      dto,
      usuario,
    );
  }

  @Post("salida")
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.SUPERVISOR,
  )
  registrarSalida(
    @Body() dto: RegistrarSalidaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico> {
    return this.movimientosService.registrarSalida(
      dto,
      usuario,
    );
  }

  @Post(":id/revertir")
  @Roles(RolUsuario.ADMINISTRADOR)
  async revertir(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: RevertirMovimientoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico> {
    const movimientoId = await this.reversionesService.revertir(
      id,
      dto,
      usuario,
    );

    return this.movimientosService.buscarPorId(movimientoId);
  }

  @Post("ajuste")
  @Roles(RolUsuario.ADMINISTRADOR)
  registrarAjuste(
    @Body() dto: RegistrarAjusteDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico> {
    return this.movimientosService.registrarAjuste(
      dto,
      usuario,
    );
  }
}
