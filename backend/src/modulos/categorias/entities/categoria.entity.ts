import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { EstadoCategoria } from "../enums/estado-categoria.enum";

@Entity({ name: "categorias" })
@Index("UQ_CATEGORIAS_NOMBRE", ["nombre"], { unique: true })
export class Categoria {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  nombre!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  descripcion!: string | null;

  @Column({
    type: "enum",
    enum: EstadoCategoria,
    enumName: "estado_categoria_enum",
    default: EstadoCategoria.ACTIVA,
  })
  estado!: EstadoCategoria;

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
