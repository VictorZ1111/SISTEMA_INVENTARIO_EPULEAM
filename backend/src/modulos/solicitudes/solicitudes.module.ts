import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsuarioBodega } from "../asignaciones/entities/usuario-bodega.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { Producto } from "../productos/entities/producto.entity";
import { ReversaSolicitud } from "./entities/reversa-solicitud.entity";
import { SolicitudDetalle } from "./entities/solicitud-detalle.entity";
import { Solicitud } from "./entities/solicitud.entity";
import { SolicitudesController } from "./solicitudes.controller";
import { SolicitudesService } from "./solicitudes.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Solicitud,
      SolicitudDetalle,
      ReversaSolicitud,
      Producto,
      Bodega,
      UsuarioBodega,
    ]),
  ],
  controllers: [SolicitudesController],
  providers: [
    SolicitudesService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    TypeOrmModule,
    SolicitudesService,
  ],
})
export class SolicitudesModule {}
