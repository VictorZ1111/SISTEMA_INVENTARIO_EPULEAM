import {
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import { FiltrarReporteDto } from "./dto/filtrar-reporte.dto";
import {
  ReporteGeneralPublico,
  ReporteInventarioPublico,
  ReporteMovimientosPublico,
  ReportesService,
} from "./reportes.service";

@Controller("reportes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get("inventario")
  inventario(
    @Query() filtros: FiltrarReporteDto,
  ): Promise<ReporteInventarioPublico> {
    return this.reportesService.generarInventario(filtros);
  }

  @Get("movimientos")
  movimientos(
    @Query() filtros: FiltrarReporteDto,
  ): Promise<ReporteMovimientosPublico> {
    return this.reportesService.generarMovimientos(filtros);
  }

  @Get("general")
  general(
    @Query() filtros: FiltrarReporteDto,
  ): Promise<ReporteGeneralPublico> {
    return this.reportesService.generarGeneral(filtros);
  }
}
