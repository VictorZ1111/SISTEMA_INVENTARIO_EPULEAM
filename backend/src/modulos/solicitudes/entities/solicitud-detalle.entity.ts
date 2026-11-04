import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { Producto } from "../../productos/entities/producto.entity";
import { Solicitud } from "./solicitud.entity";

@Entity({ name: "solicitud_detalles" })
@Unique("UQ_SOLICITUD_DETALLE_PRODUCTO", [
  "solicitudId",
  "productoId",
])
@Index("IDX_SOLICITUD_DETALLES_SOLICITUD", ["solicitudId"])
@Index("IDX_SOLICITUD_DETALLES_PRODUCTO", ["productoId"])
@Check(
  "CHK_SOLICITUD_DETALLE_CANTIDADES",
  `"cantidad_solicitada" > 0
   AND "cantidad_entregada" >= 0
   AND "cantidad_rechazada" >= 0
   AND "cantidad_pendiente" >= 0
   AND ("cantidad_entregada" + "cantidad_rechazada" + "cantidad_pendiente") = "cantidad_solicitada"`,
)
export class SolicitudDetalle {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "solicitud_id",
    type: "uuid",
  })
  solicitudId!: string;

  @ManyToOne(
    () => Solicitud,
    (solicitud) => solicitud.detalles,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "solicitud_id" })
  solicitud!: Solicitud;

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
    name: "cantidad_solicitada",
    type: "integer",
  })
  cantidadSolicitada!: number;

  @Column({
    name: "cantidad_entregada",
    type: "integer",
    default: 0,
  })
  cantidadEntregada!: number;

  @Column({
    name: "cantidad_rechazada",
    type: "integer",
    default: 0,
  })
  cantidadRechazada!: number;

  @Column({
    name: "cantidad_pendiente",
    type: "integer",
  })
  cantidadPendiente!: number;
}
