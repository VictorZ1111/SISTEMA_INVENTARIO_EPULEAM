import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Categoria } from "../../categorias/entities/categoria.entity";
import { AtributoProducto } from "../enums/atributo-producto.enum";
import { EstadoBienProducto } from "../enums/estado-bien-producto.enum";
import { EstadoProducto } from "../enums/estado-producto.enum";
import { TipoProducto } from "../enums/tipo-producto.enum";

@Entity({ name: "productos" })
@Index("UQ_PRODUCTOS_CODIGO", ["codigo"], { unique: true })
export class Producto {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 40 })
  codigo!: string;

  /**
   * En el frontend este valor corresponde a la descripción principal del bien.
   */
  @Column({ type: "varchar", length: 150 })
  nombre!: string;

  /**
   * Descripción técnica adicional usada por el backend anterior.
   */
  @Column({ type: "varchar", length: 500, nullable: true })
  descripcion!: string | null;

  @Column({
    name: "categoria_id",
    type: "uuid",
  })
  categoriaId!: string;

  @ManyToOne(
    () => Categoria,
    {
      nullable: false,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "categoria_id" })
  categoria!: Categoria;

  @Column({
    name: "tipo_producto",
    type: "enum",
    enum: TipoProducto,
    enumName: "tipo_producto_enum",
  })
  tipoProducto!: TipoProducto;

  @Column({
    type: "enum",
    enum: AtributoProducto,
    enumName: "atributo_producto_enum",
    nullable: true,
  })
  atributo!: AtributoProducto | null;

  @Column({
    type: "varchar",
    length: 120,
    default: "S/N",
  })
  serie!: string;

  @Column({
    type: "varchar",
    length: 120,
    default: "No aplica",
  })
  modelo!: string;

  @Column({
    type: "varchar",
    length: 120,
    default: "S/M",
  })
  marca!: string;

  @Column({
    type: "varchar",
    length: 120,
    default: "No especifica",
  })
  material!: string;

  @Column({
    type: "varchar",
    length: 80,
    default: "No especifica",
  })
  color!: string;

  @Column({
    type: "varchar",
    length: 120,
    default: "No especifica",
  })
  dimensiones!: string;

  @Column({
    name: "estado_bien",
    type: "enum",
    enum: EstadoBienProducto,
    enumName: "estado_bien_producto_enum",
    default: EstadoBienProducto.BUENO,
  })
  estadoBien!: EstadoBienProducto;

  @Column({
    type: "varchar",
    length: 150,
    nullable: true,
  })
  ubicacion!: string | null;

  @Column({
    name: "custodio_actual",
    type: "varchar",
    length: 120,
    nullable: true,
  })
  custodioActual!: string | null;

  @Column({
    type: "varchar",
    length: 150,
    nullable: true,
  })
  procedencia!: string | null;

  @Column({
    name: "codigo_uleam",
    type: "varchar",
    length: 60,
    nullable: true,
  })
  codigoUleam!: string | null;

  @Column({
    type: "varchar",
    length: 60,
    default: "Unidad",
  })
  unidad!: string;

  @Column({
    type: "varchar",
    length: 500,
    nullable: true,
  })
  observacion!: string | null;

  @Column({
    name: "fecha_registro",
    type: "date",
    default: () => "CURRENT_DATE",
  })
  fechaRegistro!: string;

  @Column({
    type: "enum",
    enum: EstadoProducto,
    enumName: "estado_producto_enum",
    default: EstadoProducto.ACTIVO,
  })
  estado!: EstadoProducto;

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
