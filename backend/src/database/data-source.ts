import "dotenv/config";

import { DataSource } from "typeorm";

import { UsuarioBodega } from "../modulos/asignaciones/entities/usuario-bodega.entity";
import { AuditoriaAdministrativa } from "../modulos/auditoria/entities/auditoria-administrativa.entity";
import { Bodega } from "../modulos/bodegas/entities/bodega.entity";
import { Categoria } from "../modulos/categorias/entities/categoria.entity";
import { Existencia } from "../modulos/inventario/entities/existencia.entity";
import { Movimiento } from "../modulos/movimientos/entities/movimiento.entity";
import { Producto } from "../modulos/productos/entities/producto.entity";
import { ReversaSolicitud } from "../modulos/solicitudes/entities/reversa-solicitud.entity";
import { SolicitudDetalle } from "../modulos/solicitudes/entities/solicitud-detalle.entity";
import { Solicitud } from "../modulos/solicitudes/entities/solicitud.entity";
import { Usuario } from "../modulos/usuarios/entities/usuario.entity";

function obtenerVariable(nombre: string): string {
  const valor = process.env[nombre];

  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}.`);
  }

  return valor;
}

const dataSource = new DataSource({
  type: "postgres",
  host: obtenerVariable("DB_HOST"),
  port: Number(process.env.DB_PORT ?? 5432),
  username: obtenerVariable("DB_USERNAME"),
  password: obtenerVariable("DB_PASSWORD"),
  database: obtenerVariable("DB_DATABASE"),

  entities: [
    Usuario,
    AuditoriaAdministrativa,
    Bodega,
    UsuarioBodega,
    Categoria,
    Producto,
    Existencia,
    Movimiento,
    Solicitud,
    SolicitudDetalle,
    ReversaSolicitud,
  ],
  migrations: ["src/database/migrations/*{.ts,.js}"],

  synchronize: false,
  migrationsRun: false,
  logging: ["error", "warn"],
});

export default dataSource;
