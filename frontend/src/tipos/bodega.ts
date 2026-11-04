export type TipoBodega = "inventario_general" | "principal" | "sucursal";

export interface Bodega {
  id: string | number;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  responsable: string;
  estado: "activa" | "inactiva";
  stockTotal: number;
  tipo?: TipoBodega;
  esSistema?: boolean;
  bodegaPadreId?: string | null;
  bodegaPadre?: {
    id: string;
    nombre: string;
  } | null;
}
