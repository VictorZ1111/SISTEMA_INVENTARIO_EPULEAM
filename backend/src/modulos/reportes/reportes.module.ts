import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsuarioBodega } from "../asignaciones/entities/usuario-bodega.entity";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { Existencia } from "../inventario/entities/existencia.entity";
import { Movimiento } from "../movimientos/entities/movimiento.entity";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Existencia,
      Movimiento,
      Bodega,
      UsuarioBodega,
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
