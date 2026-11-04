import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { UsuarioBodega } from "../../asignaciones/entities/usuario-bodega.entity";
import { EstadoBodega } from "../enums/estado-bodega.enum";
import { TipoBodega } from "../enums/tipo-bodega.enum";

@Entity({ name: "bodegas" })
@Index("UQ_BODEGAS_NOMBRE", ["nombre"], { unique: true })
export class Bodega {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120 })
  nombre!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  descripcion!: string | null;

  @Column({
    type: "enum",
    enum: TipoBodega,
    enumName: "tipo_bodega_enum",
  })
  tipo!: TipoBodega;

  @Column({
    type: "enum",
    enum: EstadoBodega,
    enumName: "estado_bodega_enum",
    default: EstadoBodega.ACTIVA,
  })
  estado!: EstadoBodega;

  @Column({
    name: "es_sistema",
    type: "boolean",
    default: false,
  })
  esSistema!: boolean;

  @Column({
    name: "bodega_padre_id",
    type: "uuid",
    nullable: true,
  })
  bodegaPadreId!: string | null;

  @ManyToOne(
    () => Bodega,
    (bodega) => bodega.sucursales,
    {
      nullable: true,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "bodega_padre_id" })
  bodegaPadre!: Bodega | null;

  @OneToMany(
    () => Bodega,
    (bodega) => bodega.bodegaPadre,
  )
  sucursales!: Bodega[];

  @OneToMany(
    () => UsuarioBodega,
    (asignacion) => asignacion.bodega,
  )
  asignaciones!: UsuarioBodega[];

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
