import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuditoriaModule } from "../auditoria/auditoria.module";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { BodegasController } from "./bodegas.controller";
import { BodegasService } from "./bodegas.service";
import { Bodega } from "./entities/bodega.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Bodega]), AuditoriaModule],
  controllers: [BodegasController],
  providers: [
    BodegasService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [TypeOrmModule, BodegasService],
})
export class BodegasModule {}
