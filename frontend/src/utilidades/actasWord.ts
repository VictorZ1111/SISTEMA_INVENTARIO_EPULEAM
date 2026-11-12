/**
 * Generación de actas Word a partir de las plantillas maestras aprobadas.
 * La maquetación, el logotipo y las franjas son los originales del DOCX.
 * Solo se modifican textos y celdas vinculados a datos existentes.
 * No ejecuta escrituras en el backend ni modifica inventarios.
 */
import JSZip from "../vendor/jszip.min.js";
import plantillaEntrega from "../assets/plantillas/acta-entrega-recepcion.docx?url";
import plantillaRecepcion from "../assets/plantillas/acta-recepcion-interna.docx?url";

export interface DatosActaWord {
  id: string;
  tipo: "entrega" | "recepcion";
  fecha: string;
  codigo: string | null;
  bien: string;
  cantidad: number;
  origen: string;
  destino: string;
  observacion: string;
  revertido: boolean;
}

interface ArchivoZip { async(tipo: "string"): Promise<string> }
interface ArchivoDocx {
  file(nombre: string): ArchivoZip | null;
  file(nombre: string, contenido: string): ArchivoDocx;
  generateAsync(opciones: { type: "uint8array"; compression: "DEFLATE" }): Promise<Uint8Array>;
}
interface LectorZip { loadAsync(contenido: ArrayBuffer): Promise<ArchivoDocx> }

const NAMESPACE_DOCX = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const TIPO_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function escaparXml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function desescaparXml(texto: string): string {
  return texto.replace(/&#(x[0-9a-f]+|\d+);|&(?:amp|lt|gt|quot|apos);/gi, (coincidencia) => {
    switch (coincidencia) {
      case "&amp;": return "&";
      case "&lt;": return "<";
      case "&gt;": return ">";
      case "&quot;": return '"';
      case "&apos;": return "'";
      default: {
        const valor = coincidencia.slice(2, -1);
        const numero = valor.startsWith("x") ? parseInt(valor.slice(1), 16) : parseInt(valor, 10);
        return Number.isFinite(numero) ? String.fromCodePoint(numero) : coincidencia;
      }
    }
  });
}

/** Reemplaza solo el contenido de w:t; así preserva runs, resaltados y estilos. */
function reemplazarNodosTexto(xml: string, reemplazar: (texto: string) => string | undefined): string {
  return xml.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (coincidencia, apertura: string, contenido: string, cierre: string) => {
    const original = desescaparXml(contenido);
    const nuevo = reemplazar(original);
    return nuevo === undefined ? coincidencia : apertura + escaparXml(nuevo) + cierre;
  });
}

function fechaDocumento(valor: string): { dia: string; mes: string; anio: string } {
  const fecha = new Date(valor);
  if (!Number.isFinite(fecha.getTime())) return { dia: "[Día]", mes: "[Mes]", anio: "[Año]" };
  const opciones = { timeZone: "America/Guayaquil" };
  const dia = new Intl.DateTimeFormat("es-EC", { ...opciones, day: "numeric" }).format(fecha);
  const mes = new Intl.DateTimeFormat("es-EC", { ...opciones, month: "long" }).format(fecha);
  const anio = new Intl.DateTimeFormat("es-EC", { ...opciones, year: "numeric" }).format(fecha);
  return { dia, mes, anio };
}

function reemplazarTextosDocumentales(xml: string, datos: DatosActaWord): string {
  const { dia, mes, anio } = fechaDocumento(datos.fecha);
  const origen = datos.origen?.trim() || "[Origen por completar]";
  const destino = datos.destino?.trim() || "[Destino por completar]";
  let posicionArea = 0;
  let posicionDependenciaRecepcion = 0;
  const texto = reemplazarNodosTexto(xml, (fragmento) => {
    const valores: Record<string, string> = {
      "[Ciudad]": "Manta",
      "[Día]": dia,
      "[Mes]": mes,
      "[Año]": anio,
    };
    if (fragmento in valores) return valores[fragmento];
    if (fragmento === "[Área / Bodega / Sucursal]") {
      const indice = posicionArea++;
      return indice === 2 ? destino : origen;
    }
    if (datos.tipo === "recepcion") {
      // Los cargos, firmantes, objetivo y estado de entrega son campos pendientes
      // de validación institucional: conservar exactamente el texto de la plantilla.
      if (fragmento === "[Dependencia]") return posicionDependenciaRecepcion++ === 0 ? origen : destino;
    }
    return undefined;
  });
  // El número oficial se deja por asignar. Solo cambia el año según el movimiento.
  return texto.replace(/No\. ____-2026/g, `No. ____-${anio === "[Año]" ? "2026" : anio}`);
}

/** Actualiza una celda de una tabla sin perder sus bordes, fuentes ni estilos. */
function escribirCelda(celda: string, nuevoTexto: string): string {
  let escrito = false;
  return reemplazarNodosTexto(celda, () => {
    if (escrito) return "";
    escrito = true;
    return nuevoTexto;
  });
}

function rellenarFilasDeBienes(xml: string, datos: DatosActaWord): string {
  let tablaVigente = 0;
  return xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (tabla) => {
    // La primera tabla en entrega contiene el número del acta, no los bienes.
    const indiceTabla = tablaVigente++;
    const tablaBienes = datos.tipo === "entrega" ? indiceTabla === 1 : indiceTabla === 0;
    if (!tablaBienes) return tabla;
    let indiceFila = 0;
    return tabla.replace(/<w:tr[\s\S]*?<\/w:tr>/g, (fila) => {
      const i = indiceFila++;
      if (i === 0) return fila; // encabezados
      const columnas = datos.tipo === "entrega"
        ? i === 1 ? ["1", datos.bien, String(datos.cantidad)] : [String(i), "", ""]
        : i === 1 ? ["1", datos.codigo || "[Código por completar]", datos.bien, String(datos.cantidad), "", "", "", "", "", datos.destino, ""]
          : [String(i), "", "", "", "", "", "", "", "", "", ""];
      let columna = 0;
      return fila.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (celda) => escribirCelda(celda, columnas[columna++] ?? ""));
    });
  });
}

export async function crearActaWord(datos: DatosActaWord, bytesPlantilla?: ArrayBuffer): Promise<Uint8Array> {
  const cargadorZip: LectorZip = JSZip;
  const plantilla = datos.tipo === "recepcion" ? plantillaRecepcion : plantillaEntrega;
  let contenido: ArrayBuffer;
  if (bytesPlantilla) contenido = bytesPlantilla;
  else {
    const respuesta = await fetch(plantilla);
    if (!respuesta.ok) throw new Error("No se pudo cargar la plantilla institucional.");
    contenido = await respuesta.arrayBuffer();
  }
  const zip = await cargadorZip.loadAsync(contenido);
  const parte = zip.file("word/document.xml");
  if (!parte) throw new Error("La plantilla Word no contiene su documento principal.");
  const original = await parte.async("string");
  if (!original.includes(NAMESPACE_DOCX)) throw new Error("El formato de la plantilla Word no es compatible.");
  const documento = rellenarFilasDeBienes(reemplazarTextosDocumentales(original, datos), datos);
  zip.file("word/document.xml", documento);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function descargarActaWord(datos: DatosActaWord): Promise<void> {
  const docx = await crearActaWord(datos);
  const referencia = datos.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 28);
  const clase = datos.tipo === "recepcion" ? "Recepcion_Interna" : "Entrega_Recepcion";
  const nombre = `${datos.revertido ? "REVERTIDA_" : ""}Acta_${clase}_${referencia}.docx`;
  const url = URL.createObjectURL(new Blob([docx as BlobPart], { type: TIPO_DOCX }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
