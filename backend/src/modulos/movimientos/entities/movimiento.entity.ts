import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Bodega } from "../../bodegas/entities/bodega.entity";
import { Producto } from "../../productos/entities/producto.entity";
import { SolicitudDetalle } from "../../solicitudes/entities/solicitud-detalle.entity";
import { Solicitud } from "../../solicitudes/entities/solicitud.entity";
import { Usuario } from "../../usuarios/entities/usuario.entity";
import { TipoMovimiento } from "../enums/tipo-movimiento.enum";

@Entity({ name: "movimientos" })
@Index("IDX_MOVIMIENTOS_PRODUCTO", ["productoId"])
@Index("IDX_MOVIMIENTOS_BODEGA_ORIGEN", ["bodegaOrigenId"])
@Index("IDX_MOVIMIENTOS_BODEGA_DESTINO", ["bodegaDestinoId"])
@Index("IDX_MOVIMIENTOS_USUARIO", ["usuarioId"])
@Index("IDX_MOVIMIENTOS_TIPO", ["tipo"])
@Index("IDX_MOVIMIENTOS_FECHA", ["createdAt"])
@Index("IDX_MOVIMIENTOS_SOLICITUD", ["solicitudId"])
@Index("UQ_MOVIMIENTOS_ORIGINAL", ["movimientoOriginalId"], { unique: true })
export class Movimiento {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "enum",
    enum: TipoMovimiento,
    enumName: "tipo_movimiento_enum",
  })
  tipo!: TipoMovimiento;

  @Column({
    name: "producto_id",
    type: "uuid",
    nullable: true,
  })
  productoId!: string | null;

  @ManyToOne(
    () => Producto,
    {
      nullable: true,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "producto_id" })
  producto!: Producto | null;

  @Column({
    name: "bodega_origen_id",
    type: "uuid",
    nullable: true,
  })
  bodegaOrigenId!: string | null;

  @ManyToOne(
    () => Bodega,
    {
      nullable: true,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "bodega_origen_id" })
  bodegaOrigen!: Bodega | null;

  @Column({
    name: "bodega_destino_id",
    type: "uuid",
    nullable: true,
  })
  bodegaDestinoId!: string | null;

  @ManyToOne(
    () => Bodega,
    {
      nullable: true,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "bodega_destino_id" })
  bodegaDestino!: Bodega | null;

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
    name: "solicitud_id",
    type: "uuid",
    nullable: true,
  })
  solicitudId!: string | null;

  @ManyToOne(
    () => Solicitud,
    {
      nullable: true,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "solicitud_id" })
  solicitud!: Solicitud | null;

  @Column({
    name: "solicitud_detalle_id",
    type: "uuid",
    nullable: true,
  })
  solicitudDetalleId!: string | null;

  @ManyToOne(
    () => SolicitudDetalle,
    {
      nullable: true,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "solicitud_detalle_id" })
  solicitudDetalle!: SolicitudDetalle | null;

  @Column({
    name: "movimiento_original_id",
    type: "uuid",
    nullable: true,
  })
  movimientoOriginalId!: string | null;

  @ManyToOne(
    () => Movimiento,
    {
      nullable: true,
      onDelete: "RESTRICT",
    },
  )
  @JoinColumn({ name: "movimiento_original_id" })
  movimientoOriginal!: Movimiento | null;

  @Column({
    type: "varchar",
    length: 50,
    nullable: true,
  })
  modulo!: string | null;

  @Column({
    type: "varchar",
    length: 50,
    nullable: true,
  })
  accion!: string | null;

  @Column({
    name: "registro_id",
    type: "uuid",
    nullable: true,
  })
  registroId!: string | null;

  @Column({
    type: "integer",
  })
  cantidad!: number;

  @Column({
    name: "cantidad_anterior",
    type: "integer",
    nullable: true,
  })
  cantidadAnterior!: number | null;

  @Column({
    name: "cantidad_nueva",
    type: "integer",
    nullable: true,
  })
  cantidadNueva!: number | null;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
  })
  observacion!: string | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt!: Date;
}
