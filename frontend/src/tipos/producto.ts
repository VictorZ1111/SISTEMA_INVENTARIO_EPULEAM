export type EstadoProducto = "activo" | "inactivo";

export type EstadoBien =
  | "bueno"
  | "regular"
  | "malo";

export type TipoProducto =
  | "consumible"
  | "no_consumible";

export type EmpresaBien = "BLD" | "BCA";

export interface Producto {
  id: string | number;

  codigo: string;
  descripcion: string;
  cantidad: number;

  tipoProducto: TipoProducto;
  empresa?: EmpresaBien;

  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;

  estadoBien: EstadoBien;

  ubicacion: string;
  custodioActual: string;
  procedencia: string;
  codigoUleam: string;

  categoria: string;
  /** UUID real de la categoría en PostgreSQL. */
  categoriaId?: string;
  unidad: string;

  observacion?: string;

  estado: EstadoProducto;
  fechaRegistro: string;
}