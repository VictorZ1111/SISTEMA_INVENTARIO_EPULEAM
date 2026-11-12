/** Mensajes internos de carga: no modifican los datos ni los contratos de API. */
export const EVENTO_CARGA_API = "epuleam:carga-api";

export interface EventoCargaApi {
  tipo: "inicio" | "fin";
  id: number;
  metodo?: string;
  ruta?: string;
}

let ultimoId = 0;

export function registrarInicioCarga(metodo = "GET", ruta = ""): number {
  const id = ++ultimoId;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<EventoCargaApi>(EVENTO_CARGA_API, {
      detail: { tipo: "inicio", id, metodo: metodo.toUpperCase(), ruta },
    }));
  }
  return id;
}

export function registrarFinCarga(id?: number) {
  if (id === undefined || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<EventoCargaApi>(EVENTO_CARGA_API, {
    detail: { tipo: "fin", id },
  }));
}
