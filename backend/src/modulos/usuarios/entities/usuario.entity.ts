import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { UsuarioBodega } from "../../asignaciones/entities/usuario-bodega.entity";
import { EstadoUsuario } from "../enums/estado-usuario.enum";
import type { HorarioSemanal } from "../horarios-acceso";
import { RolUsuario } from "../enums/rol-usuario.enum";

@Entity({ name: "usuarios" })
@Index("IDX_USUARIOS_CORREO_ROL", ["correo", "rol"])
@Index("UQ_USUARIOS_CODIGO_BUSQUEDA", ["codigoAccesoBusqueda"], {
  unique: true,
})
export class Usuario {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120 })
  nombre!: string;

  @Column({ type: "varchar", length: 150 })
  correo!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  telefono!: string | null;

  /**
   * Hash seguro del código de acceso. Nunca debe devolverse en respuestas.
   */
  @Column({
    name: "codigo_acceso_hash",
    type: "varchar",
    length: 255,
    select: false,
  })
  codigoAccesoHash!: string;

  /**
   * Huella determinista para localizar el usuario y evitar códigos repetidos.
   * No contiene el código original.
   */
  @Column({
    name: "codigo_acceso_busqueda",
    type: "char",
    length: 64,
    select: false,
  })
  codigoAccesoBusqueda!: string;

  @Column({
    type: "enum",
    enum: RolUsuario,
    enumName: "rol_usuario_enum",
  })
  rol!: RolUsuario;

  @Column({
    type: "enum",
    enum: EstadoUsuario,
    enumName: "estado_usuario_enum",
    default: EstadoUsuario.ACTIVO,
  })
  estado!: EstadoUsuario;

  @Column({
    name: "es_administrador_general",
    type: "boolean",
    default: false,
  })
  esAdministradorGeneral!: boolean;

  @Column({ name: "horario_acceso", type: "jsonb", nullable: true, default: null })
  horarioAcceso!: HorarioSemanal;

  @Column({ name: "acceso_temporal_permitido", type: "boolean", nullable: true, default: null })
  accesoTemporalPermitido!: boolean | null;

  @Column({ name: "acceso_temporal_hasta", type: "timestamptz", nullable: true, default: null })
  accesoTemporalHasta!: Date | null;

  @OneToMany(
    () => UsuarioBodega,
    (asignacion) => asignacion.usuario,
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
