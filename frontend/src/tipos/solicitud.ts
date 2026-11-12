export type TipoSolicitud = "producto" | "cambio";

export type EstadoSolicitud =
  | "pendiente"
  | "parcial"
  | "aprobada"
  | "rechazada"
  | "atendida";

export interface ItemSolicitud {
  id?: string;
  productoId?: string | number;
  productoSolicitado: string;
  cantidad: number;
  cantidadEntregada?: number;
  cantidadRechazada?: number;
  cantidadPendiente?: number;
}

export interface EntregaSolicitud {
  cantidadRechazada?: number;
  itemId?: string;
  productoId?: string | number;
  productoSolicitado: string;
  cantidad: number;
}

export interface ResultadoAtencionSolicitud {
  exito: boolean;
  estado?: EstadoSolicitud;
  mensaje: string;
  entregasRealizadas?: number;
}

export interface Solicitud {
  id: string | number;
  codigo?: string;
  /** Si existe, esta solicitud de Supervisor abastece un pedido de Responsable. */
  solicitudOrigenId?: string | null;

  tipo: TipoSolicitud;
  solicitante: string;
  bodega: string;

  productoId?: string | number;
  productoSolicitado: string;
  cantidad: number;
  cantidadEntregada?: number;
  unidad: string;

  descripcion: string;
  estado: EstadoSolicitud;
  fecha: string;
  createdAt?: string;
  updatedAt?: string;
  atendidaAt?: string | null;
  reversada?: boolean;

  items?: ItemSolicitud[];
  cantidadRechazada?: number;
  pendientesRechazados?: boolean;
  observacionAdmin?: string;
}
