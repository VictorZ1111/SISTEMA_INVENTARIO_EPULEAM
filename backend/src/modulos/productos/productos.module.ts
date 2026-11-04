import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Categoria } from "../categorias/entities/categoria.entity";
import { Existencia } from "../inventario/entities/existencia.entity";
import { Movimiento } from "../movimientos/entities/movimiento.entity";
import { Producto } from "./entities/producto.entity";
import { ProductosController } from "./productos.controller";
import { ProductosService } from "./productos.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Producto,
      Categoria,
      Existencia,
      Movimiento,
    ]),
  ],
  controllers: [ProductosController],
  providers: [
    ProductosService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    TypeOrmModule,
    ProductosService,
  ],
})
export class ProductosModule {}
