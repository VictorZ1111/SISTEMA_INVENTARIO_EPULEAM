import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuditoriaModule } from "../auditoria/auditoria.module";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { Usuario } from "../usuarios/entities/usuario.entity";
import { AsignacionesController } from "./asignaciones.controller";
import { AsignacionesService } from "./asignaciones.service";
import { UsuarioBodega } from "./entities/usuario-bodega.entity";

@Module({
  imports: [
    AuditoriaModule,
    TypeOrmModule.forFeature([
      UsuarioBodega,
      Usuario,
      Bodega,
    ]),
  ],
  controllers: [AsignacionesController],
  providers: [
    AsignacionesService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    TypeOrmModule,
    AsignacionesService,
  ],
})
export class AsignacionesModule {}
