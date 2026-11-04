import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsuarioBodega } from "../asignaciones/entities/usuario-bodega.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { Producto } from "../productos/entities/producto.entity";
import { Existencia } from "./entities/existencia.entity";
import { InventarioController } from "./inventario.controller";
import { InventarioService } from "./inventario.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Existencia,
      Producto,
      Bodega,
      UsuarioBodega,
    ]),
  ],
  controllers: [InventarioController],
  providers: [
    InventarioService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    TypeOrmModule,
    InventarioService,
  ],
})
export class InventarioModule {}
