import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsuarioBodega } from "../asignaciones/entities/usuario-bodega.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { Existencia } from "../inventario/entities/existencia.entity";
import { Producto } from "../productos/entities/producto.entity";
import { Movimiento } from "./entities/movimiento.entity";
import { MovimientosController } from "./movimientos.controller";
import { MovimientosService } from "./movimientos.service";
import { ReversionesMovimientosService } from "./reversiones-movimientos.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Movimiento,
      Producto,
      Bodega,
      Existencia,
      UsuarioBodega,
    ]),
  ],
  controllers: [MovimientosController],
  providers: [
    MovimientosService,
    ReversionesMovimientosService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    TypeOrmModule,
    MovimientosService,
    ReversionesMovimientosService,
  ],
})
export class MovimientosModule {}
