import type { Movimiento } from "../tipos/movimiento";
import { descargarPdfInstitucional } from "./pdfInstitucional";

const NOMBRES_TIPO: Record<Movimiento["tipo"], string> = {
  entrada: "Entrada", transferencia: "Transferencia", modificacion: "Modificación",
  baja: "Baja", salida: "Salida", ajuste: "Ajuste", devolucion: "Devolución",
};

/**
 * Genera el PDF individual con los datos REALES del movimiento.
 * No altera existencias, no crea operaciones ni atribuye firmas.
 */
export async function generarReporteMovimientoPdf(movimiento: Movimiento): Promise<void> {
  const referencia = String(movimiento.id);
  const nombreSeguro = referencia.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
  try {
    await descargarPdfInstitucional({
    titulo: "REPORTE DE MOVIMIENTO",
    referencia,
    fecha: movimiento.fecha || movimiento.createdAt || "No registrada",
    tipoDocumento: `Tipo: ${NOMBRES_TIPO[movimiento.tipo] || movimiento.tipo}`,
    campos: [
      { etiqueta: "Código del bien", valor: movimiento.codigoProducto || "No registrado" },
      { etiqueta: "Bien", valor: movimiento.producto },
      { etiqueta: "Origen", valor: movimiento.origen },
      { etiqueta: "Destino", valor: movimiento.destino },
      { etiqueta: "Registrado por", valor: movimiento.usuario },
      { etiqueta: "Documento de referencia", valor: movimiento.documento || "No registrado" },
    ],
    tabla: {
      columnas: ["Tipo de movimiento", "Bien o material", "Cantidad"],
      anchos: [1.5, 2.7, 0.8],
      filas: [[NOMBRES_TIPO[movimiento.tipo] || movimiento.tipo, movimiento.producto, movimiento.cantidad]],
    },
    observacion: movimiento.observacion || "Sin observación registrada.",
    firmaEntrega: "Registro por validar",
    firmaRecibe: "Recepción por validar",
  }, `movimiento-${nombreSeguro}.pdf`);
  } catch {
    window.alert("No se pudo generar el reporte PDF del movimiento. Inténtalo nuevamente.");
  }
}
