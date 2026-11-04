import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuditoriaModule } from "../auditoria/auditoria.module";
import { Producto } from "../productos/entities/producto.entity";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CategoriasController } from "./categorias.controller";
import { CategoriasService } from "./categorias.service";
import { Categoria } from "./entities/categoria.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Categoria, Producto]), AuditoriaModule],
  controllers: [CategoriasController],
  providers: [
    CategoriasService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    TypeOrmModule,
    CategoriasService,
  ],
})
export class CategoriasModule {}
