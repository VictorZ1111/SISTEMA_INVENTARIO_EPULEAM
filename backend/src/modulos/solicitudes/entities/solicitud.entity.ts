import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Bodega } from "../../bodegas/entities/bodega.entity";
import { Usuario } from "../../usuarios/entities/usuario.entity";
import { EstadoSolicitud } from "../enums/estado-solicitud.enum";
import { ReversaSolicitud } from "./reversa-solicitud.entity";
import { SolicitudDetalle } from "./solicitud-detalle.entity";

@Entity({ name: "solicitudes" })
@Index("IDX_SOLICITUDES_USUARIO", ["usuarioSolicitanteId"])
@Index("IDX_SOLICITUDES_BODEGA", ["bodegaSolicitanteId"])
@Index("IDX_SOLICITUDES_ESTADO", ["estado"])
@Index("IDX_SOLICITUDES_FECHA", ["createdAt"])
export class Solicitud {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 40,
    unique: true,
  })
  codigo!: string;

  @Column({
    name: "usuario_solicitante_id",
    type: "uuid",
  })
  usuarioSolicitanteId!: string;

  @ManyToOne(
    () => Usuario,
    {
      nullable: false,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "usuario_solicitante_id" })
  usuarioSolicitante!: Usuario;

  @Column({
    name: "bodega_solicitante_id",
    type: "uuid",
  })
  bodegaSolicitanteId!: string;

  @ManyToOne(
    () => Bodega,
    {
      nullable: false,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "bodega_solicitante_id" })
  bodegaSolicitante!: Bodega;

  @Column({
    type: "enum",
    enum: EstadoSolicitud,
    enumName: "estado_solicitud_enum",
    default: EstadoSolicitud.PENDIENTE,
  })
  estado!: EstadoSolicitud;

  @Column({
    name: "observacion_solicitante",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  observacionSolicitante!: string | null;

  @Column({
    name: "observacion_atencion",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  observacionAtencion!: string | null;

  @Column({
    name: "usuario_atencion_id",
    type: "uuid",
    nullable: true,
  })
  usuarioAtencionId!: string | null;

  @ManyToOne(
    () => Usuario,
    {
      nullable: true,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "usuario_atencion_id" })
  usuarioAtencion!: Usuario | null;

  @Column({
    name: "atendida_at",
    type: "timestamptz",
    nullable: true,
  })
  atendidaAt!: Date | null;

  @OneToOne(
    () => ReversaSolicitud,
    (reversa) => reversa.solicitud,
    {
      nullable: true,
    },
  )
  reversa!: ReversaSolicitud | null;

  @OneToMany(
    () => SolicitudDetalle,
    (detalle) => detalle.solicitud,
    {
      cascade: false,
    },
  )
  detalles!: SolicitudDetalle[];

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamptz",
  })
  updatedAt!: Date;
}
