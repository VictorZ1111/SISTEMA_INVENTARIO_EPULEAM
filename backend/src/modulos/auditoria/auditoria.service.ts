import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditoriaAdministrativa } from "./entities/auditoria-administrativa.entity";

export interface RegistrarAuditoriaDto {
  usuarioId: string;
  modulo: string;
  accion: string;
  registroId: string;
  descripcion: string;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(AuditoriaAdministrativa)
    private readonly auditoriasRepository: Repository<AuditoriaAdministrativa>,
  ) {}

  async registrar(dto: RegistrarAuditoriaDto): Promise<void> {
    const auditoria = this.auditoriasRepository.create({
      usuarioId: dto.usuarioId,
      modulo: dto.modulo,
      accion: dto.accion,
      registroId: dto.registroId,
      descripcion: dto.descripcion,
    });

    await this.auditoriasRepository.save(auditoria);
  }
}
