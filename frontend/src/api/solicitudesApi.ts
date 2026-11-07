import { clienteApi } from "./clienteApi";

export interface SolicitudBackend {
  id: string;
  codigo: string;
  estado: "pendiente" | "parcial" | "atendida" | "rechazada";
  observacionSolicitante: string | null;
  observacionAtencion: string | null;
  createdAt: string;
  updatedAt: string;
  atendidaAt: string | null;
  usuarioSolicitante: {
    id: string;
    nombre: string;
    correo: string;
    rol: string;
  };
  usuarioAtencion: { id: string; nombre: string; rol: string } | null;
  reversa: { id: string; motivo: string; createdAt: string } | null;
  bodegaSolicitante: { id: string; nombre: string; tipo: string };
  detalles: Array<{
    id: string;
    producto: {
      id: string;
      codigo: string;
      nombre: string;
      tipoProducto: string;
      atributo: string | null;
    };
    cantidadSolicitada: number;
    cantidadEntregada: number;
    cantidadRechazada: number;
    cantidadPendiente: number;
  }>;
}

export interface CrearSolicitudPayload {
  bodegaSolicitanteId: string;
  observacionSolicitante?: string;
  detalles: Array<{
    productoId: string;
    cantidadSolicitada: number;
  }>;
}

export interface AtenderSolicitudPayload {
  detalles: Array<{
    detalleId: string;
    cantidadEntregada: number;
    cantidadRechazada: number;
  }>;
  observacionAtencion?: string;
}

export async function obtenerSolicitudesApi(esAdministrador: boolean) {
  const ruta = esAdministrador ? "/solicitudes" : "/solicitudes/mias";
  const { data } = await clienteApi.get<SolicitudBackend[]>(ruta);
  return data;
}

export async function crearSolicitudApi(payload: CrearSolicitudPayload) {
  await clienteApi.post("/solicitudes", payload);
}

export async function rechazarSolicitudApi(
  id: string,
  observacionAtencion: string,
) {
  const { data } = await clienteApi.post<SolicitudBackend>(
    `/solicitudes/${id}/rechazar`,
    { observacionAtencion },
  );

  return data;
}

export async function atenderSolicitudApi(
  id: string,
  payload: AtenderSolicitudPayload,
) {
  const { data } = await clienteApi.post<SolicitudBackend>(
    `/solicitudes/${id}/atender`,
    payload,
  );

  return data;
}

export async function revertirSolicitudApi(id: string, motivo: string) {
  const { data } = await clienteApi.post<SolicitudBackend>(
    `/solicitudes/${id}/revertir`,
    { motivo },
  );

  return data;
}
