import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Usuario } from "../../usuarios/entities/usuario.entity";
import { Solicitud } from "./solicitud.entity";

@Entity({ name: "reversas_solicitud" })
@Index("UQ_REVERSAS_SOLICITUD", ["solicitudId"], {
  unique: true,
})
@Index("IDX_REVERSAS_USUARIO", ["usuarioId"])
@Index("IDX_REVERSAS_FECHA", ["createdAt"])
export class ReversaSolicitud {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "solicitud_id",
    type: "uuid",
  })
  solicitudId!: string;

  @OneToOne(
    () => Solicitud,
    (solicitud) => solicitud.reversa,
    {
      nullable: false,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "solicitud_id" })
  solicitud!: Solicitud;

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
    length: 500,
  })
  motivo!: string;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;
}
