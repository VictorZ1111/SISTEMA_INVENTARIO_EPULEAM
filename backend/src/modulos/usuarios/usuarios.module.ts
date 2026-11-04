import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuditoriaModule } from "../auditoria/auditoria.module";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Usuario } from "./entities/usuario.entity";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "./usuarios.service";

@Module({
  imports: [TypeOrmModule.forFeature([Usuario]), AuditoriaModule],
  controllers: [UsuariosController],
  providers: [
    UsuariosService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [TypeOrmModule, UsuariosService],
})
export class UsuariosModule {}
