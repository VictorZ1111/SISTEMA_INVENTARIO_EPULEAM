import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuditoriaModule } from "../auditoria/auditoria.module";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { Existencia } from "../inventario/entities/existencia.entity";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Usuario } from "./entities/usuario.entity";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "./usuarios.service";

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Bodega, Existencia]), AuditoriaModule],
  controllers: [UsuariosController],
  providers: [
    UsuariosService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [TypeOrmModule, UsuariosService],
})
export class UsuariosModule {}
