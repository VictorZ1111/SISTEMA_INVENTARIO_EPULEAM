import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

import { Bodega } from "../../bodegas/entities/bodega.entity";
import { Usuario } from "../../usuarios/entities/usuario.entity";
import { TipoAsignacion } from "../enums/tipo-asignacion.enum";

@Entity({ name: "usuario_bodega" })
@Index(
  "UQ_USUARIO_BODEGA_TIPO",
  ["usuarioId", "bodegaId", "tipoAsignacion"],
  { unique: true },
)
export class UsuarioBodega {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "usuario_id", type: "uuid" })
  usuarioId!: string;

  @Column({ name: "bodega_id", type: "uuid" })
  bodegaId!: string;

  @Column({
    name: "tipo_asignacion",
    type: "enum",
    enum: TipoAsignacion,
    enumName: "tipo_asignacion_enum",
  })
  tipoAsignacion!: TipoAsignacion;

  @ManyToOne(
    () => Usuario,
    (usuario) => usuario.asignaciones,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "usuario_id" })
  usuario!: Usuario;

  @ManyToOne(
    () => Bodega,
    (bodega) => bodega.asignaciones,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "bodega_id" })
  bodega!: Bodega;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;
}
