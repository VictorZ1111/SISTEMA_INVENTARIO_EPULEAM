/**
 * Actas formales EP ULEAM a partir de movimientos reales.
 * Recepción interna y entrega-recepción tienen redacción institucional
 * completa; los reportes conservan sus propios formatos y tablas.
 */
import { crearPdfConComandos, descargarBytesPdf } from "./pdfInstitucional";
import { construirComandosActa } from "./plantillasActasPdf";

export interface DatosActaPdf {
  id: string;
  tipo: "recepcion" | "entrega";
  fecha: string;
  codigo: string | null;
  bien: string;
  cantidad: number;
  origen: string;
  destino: string;
  registradoPor: string;
  observacion: string;
  revertido: boolean;
}

/** PDF A4 listo para descarga; permite pruebas sin servidor con JPEG de ejemplo. */
export async function crearDocumentoActaPdf(datos: DatosActaPdf, jpegParaPrueba?: Uint8Array): Promise<Uint8Array> {
  return crearPdfConComandos(construirComandosActa(datos), jpegParaPrueba);
}

export async function descargarActaPdf(datos: DatosActaPdf): Promise<void> {
  const referencia = datos.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 28);
  const pdf = await crearDocumentoActaPdf(datos);
  descargarBytesPdf(pdf, `Acta_${datos.tipo === "recepcion" ? "Recepcion_Interna" : "Entrega_Recepcion"}_${referencia}.pdf`);
}
