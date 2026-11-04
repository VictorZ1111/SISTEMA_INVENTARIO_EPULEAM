import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

import { Bodega } from "../../bodegas/entities/bodega.entity";
import { Producto } from "../../productos/entities/producto.entity";

@Entity({ name: "existencias" })
@Unique("UQ_EXISTENCIAS_PRODUCTO_BODEGA", [
  "productoId",
  "bodegaId",
])
@Index("IDX_EXISTENCIAS_PRODUCTO", ["productoId"])
@Index("IDX_EXISTENCIAS_BODEGA", ["bodegaId"])
@Check("CHK_EXISTENCIAS_CANTIDAD_NO_NEGATIVA", `"cantidad" >= 0`)
export class Existencia {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "producto_id",
    type: "uuid",
  })
  productoId!: string;

  @ManyToOne(
    () => Producto,
    {
      nullable: false,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "producto_id" })
  producto!: Producto;

  @Column({
    name: "bodega_id",
    type: "uuid",
  })
  bodegaId!: string;

  @ManyToOne(
    () => Bodega,
    {
      nullable: false,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "bodega_id" })
  bodega!: Bodega;

  @Column({
    type: "integer",
    default: 0,
  })
  cantidad!: number;

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
