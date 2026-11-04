import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Usuario } from "../../usuarios/entities/usuario.entity";

@Entity({ name: "auditorias_administrativas" })
@Index("IDX_AUDITORIAS_ADMIN_MODULO", ["modulo"])
@Index("IDX_AUDITORIAS_ADMIN_REGISTRO", ["registroId"])
@Index("IDX_AUDITORIAS_ADMIN_USUARIO", ["usuarioId"])
@Index("IDX_AUDITORIAS_ADMIN_FECHA", ["createdAt"])
export class AuditoriaAdministrativa {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "usuario_id",
    type: "uuid",
  })
  usuarioId!: string;

  @ManyToOne(
    () => Usuario,
    {
      nullable: false,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "usuario_id" })
  usuario!: Usuario;

  @Column({
    type: "varchar",
    length: 50,
  })
  modulo!: string;

  @Column({
    type: "varchar",
    length: 50,
  })
  accion!: string;

  @Column({
    name: "registro_id",
    type: "uuid",
  })
  registroId!: string;

  @Column({
    type: "varchar",
    length: 255,
  })
  descripcion!: string;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;
}
