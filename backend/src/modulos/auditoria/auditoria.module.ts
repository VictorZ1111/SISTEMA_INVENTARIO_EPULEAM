import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuditoriaService } from "./auditoria.service";
import { AuditoriaAdministrativa } from "./entities/auditoria-administrativa.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaAdministrativa])],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
