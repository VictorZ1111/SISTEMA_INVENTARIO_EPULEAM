/**
 * PDF A4 institucional sin nuevas dependencias.
 * Conserva los datos originales y no inventa firmas, custodios ni actas oficiales.
 * Identidad común: logo EP rojo/azul, ULEAM verde, banda superior roja/azul
 * e inferior azul/verde.
 */
import logoDocumento from "../assets/logos/ep-uleam-documentos.jpg";
import encabezadoOriginal from "../assets/logos/encabezado-documentos.jpg";
import pieOriginal from "../assets/logos/franja-inferior-documentos.jpg";

export interface CampoPdfInstitucional {
  etiqueta: string;
  valor: string | number | null | undefined;
}

export interface TablaPdfInstitucional {
  columnas: string[];
  filas: (string | number)[][];
  /** Proporción relativa del ancho de cada columna. */
  anchos?: number[];
}

export interface DatosPdfInstitucional {
  titulo: string;
  referencia?: string;
  fecha?: string;
  tipoDocumento?: string;
  campos: CampoPdfInstitucional[];
  tabla?: TablaPdfInstitucional;
  observacion?: string;
  advertencia?: string;
  firmaEntrega?: string;
  firmaRecibe?: string;
}

const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 45;
const ANCHO_UTIL = ANCHO - 2 * MARGEN;
const LOGO_ANCHO_PX = 748;
const LOGO_ALTO_PX = 486;

function textoPlano(texto: string | number | null | undefined): string {
  return String(texto ?? "No registrado").replace(/[\r\n\t]+/g, " ").trim() || "No registrado";
}

function cadenaPdf(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function codificarWinAnsi(texto: string): Uint8Array {
  const especiales: Record<number, number> = {
    0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
    0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
    0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
    0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
    0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
    0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
  };
  const bytes: number[] = [];
  for (const caracter of texto) {
    const codigo = caracter.codePointAt(0) ?? 63;
    bytes.push(codigo <= 255 ? codigo : especiales[codigo] ?? 63);
  }
  return Uint8Array.from(bytes);
}

function concatenar(partes: Uint8Array[]): Uint8Array {
  const longitud = partes.reduce((acum, parte) => acum + parte.length, 0);
  const resultado = new Uint8Array(longitud);
  let indice = 0;
  for (const parte of partes) {
    resultado.set(parte, indice);
    indice += parte.length;
  }
  return resultado;
}

function recortar(texto: string, maxCaracteres: number): string {
  if (texto.length <= maxCaracteres) return texto;
  return `${texto.slice(0, Math.max(0, maxCaracteres - 3))}...`;
}

function dividir(texto: string, maxCaracteres: number, maxLineas = 3): string[] {
  const palabras = textoPlano(texto).split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    if (actual && `${actual} ${palabra}`.length > maxCaracteres) {
      lineas.push(actual);
      actual = "";
    }
    actual = actual ? `${actual} ${palabra}` : palabra;
    if (actual.length > maxCaracteres) {
      lineas.push(actual.slice(0, maxCaracteres));
      actual = actual.slice(maxCaracteres);
    }
    if (lineas.length >= maxLineas) break;
  }
  if (actual && lineas.length < maxLineas) lineas.push(actual);
  if (!lineas.length) lineas.push("No registrado");
  if (lineas.length >= maxLineas && lineas.join(" ").length < texto.length) {
    lineas[maxLineas - 1] = recortar(lineas[maxLineas - 1], maxCaracteres);
  }
  return lineas;
}

function construirComandos(datos: DatosPdfInstitucional): string {
  const comandos: string[] = [];
  const color = (r: number, g: number, b: number, trazo = false) => {
    comandos.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} ${trazo ? "RG" : "rg"}`);
  };
  const texto = (valor: string, x: number, y: number, tam = 10, negrita = false) => {
    comandos.push(`BT /${negrita ? "F2" : "F1"} ${tam} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${cadenaPdf(textoPlano(valor))}) Tj ET`);
  };
  const rectangulo = (x: number, y: number, w: number, h: number) => {
    comandos.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  };
  const linea = (x1: number, y1: number, x2: number, y2: number) => {
    comandos.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  };

  // MISMAS franjas y logo de la plantilla Word aprobada, sin redibujar curvas.
  comandos.push("q 505 0 0 76.6 45 757 cm /ImCabecera Do Q");
  color(0.114, 0.334, 0.631, true);
  comandos.push("1.1 w");
  linea(MARGEN, 728, ANCHO - MARGEN, 728);

  color(0.083, 0.124, 0.200);
  const titulo = textoPlano(datos.titulo).toUpperCase();
  const tamTitulo = titulo.length > 34 ? 15 : 17;
  const posTitulo = Math.max(49, (ANCHO - titulo.length * tamTitulo * 0.55) / 2);
  texto(titulo, posTitulo, 703, tamTitulo, true);
  if (datos.tipoDocumento) {
    color(0.340, 0.421, 0.515);
    texto(recortar(datos.tipoDocumento, 85), MARGEN, 678, 9);
  }
  if (datos.referencia) {
    color(0.330, 0.407, 0.495);
    texto(recortar(`Referencia: ${textoPlano(datos.referencia)}`, 100), MARGEN, 662, 9);
  }
  if (datos.fecha) {
    color(0.330, 0.407, 0.495);
    texto(recortar(`Fecha: ${textoPlano(datos.fecha)}`, 92), MARGEN, 645, 9);
  }

  // Campos de operación en dos columnas, sin atribuciones de identidad que
  // no estén presentes en el movimiento original.
  let yCampos = datos.fecha ? 613 : 632;
  const campos = datos.campos.slice(0, 12);
  for (let i = 0; i < campos.length; i += 2) {
    const pareja = campos.slice(i, i + 2);
    let altoFila = 45;
    pareja.forEach((campo, indice) => {
      const x = MARGEN + indice * 261;
      color(0.911, 0.947, 0.982);
      rectangulo(x, yCampos - 23, 245, 43);
      color(0.130, 0.320, 0.543);
      texto(recortar(campo.etiqueta, 41), x + 8, yCampos + 6, 8.5, true);
      color(0.080, 0.122, 0.204);
      const lineas = dividir(textoPlano(campo.valor), 46, 2);
      lineas.forEach((fragmento, indiceLinea) => texto(fragmento, x + 8, yCampos - 7 - indiceLinea * 10.5, 8.8));
      altoFila = Math.max(altoFila, 44);
    });
    yCampos -= altoFila + 8;
  }

  // Los documentos actuales corresponden a un movimiento; no agregamos filas
  // ni inventamos cantidades para completar tablas.
  let yTabla = yCampos - 8;
  if (datos.tabla) {
    color(0.065, 0.220, 0.414);
    texto("DETALLE DE BIENES", MARGEN, yTabla, 10.5, true);
    yTabla -= 29;
    const columnas = datos.tabla.columnas;
    const pesos = (datos.tabla.anchos && datos.tabla.anchos.length === columnas.length)
      ? datos.tabla.anchos
      : columnas.map(() => 1);
    const total = pesos.reduce((acum, valor) => acum + valor, 0) || 1;
    const anchuras = pesos.map((peso) => peso / total * ANCHO_UTIL);
    color(0.830, 0.909, 0.975);
    rectangulo(MARGEN, yTabla - 1, ANCHO_UTIL, 23);
    let x = MARGEN;
    columnas.forEach((columna, i) => {
      color(0.065, 0.220, 0.414);
      texto(recortar(columna, Math.max(5, Math.floor(anchuras[i] / 5.2))), x + 5, yTabla + 7, 8, true);
      x += anchuras[i];
    });
    yTabla -= 22;
    datos.tabla.filas.slice(0, 5).forEach((fila, indiceFila) => {
      if (indiceFila % 2 === 0) {
        color(0.972, 0.985, 0.996);
        rectangulo(MARGEN, yTabla - 2, ANCHO_UTIL, 24);
      }
      x = MARGEN;
      fila.slice(0, columnas.length).forEach((valor, indice) => {
        color(0.078, 0.123, 0.206);
        const max = Math.max(5, Math.floor((anchuras[indice] - 12) / 4.5));
        texto(recortar(textoPlano(valor), max), x + 5, yTabla + 8, 8.2);
        x += anchuras[indice];
      });
      color(0.735, 0.821, 0.905, true);
      comandos.push("0.35 w");
      linea(MARGEN, yTabla - 2, ANCHO - MARGEN, yTabla - 2);
      yTabla -= 24;
    });
    yTabla -= 21;
  }

  if (datos.observacion) {
    const yObs = Math.max(260, Math.min(yTabla - 8, 384));
    color(0.065, 0.220, 0.414);
    texto("OBSERVACIÓN", MARGEN, yObs, 10, true);
    color(0.150, 0.207, 0.286);
    dividir(datos.observacion, 103, 4).forEach((fragmento, indice) => {
      texto(fragmento, MARGEN, yObs - 18 - indice * 13, 9);
    });
  }
  if (datos.advertencia) {
    color(0.68, 0.27, 0.10);
    texto(recortar(datos.advertencia, 110), MARGEN, 223, 8.5, true);
  }

  color(0.830, 0.909, 0.975);
  rectangulo(MARGEN, 170, 222, 23);
  rectangulo(ANCHO - MARGEN - 222, 170, 222, 23);
  color(0.065, 0.220, 0.414);
  texto("ENTREGA", MARGEN + 85, 178, 10, true);
  texto("RECIBE", ANCHO - MARGEN - 135, 178, 10, true);
  color(0.310, 0.390, 0.490, true);
  comandos.push("0.8 w");
  linea(MARGEN + 14, 122, MARGEN + 207, 122);
  linea(ANCHO - MARGEN - 207, 122, ANCHO - MARGEN - 14, 122);
  color(0.145, 0.207, 0.300);
  texto(recortar(datos.firmaEntrega || "Nombre y firma pendientes", 42), MARGEN + 17, 107, 8.5);
  texto(recortar(datos.firmaRecibe || "Nombre y firma pendientes", 42), ANCHO - MARGEN - 205, 107, 8.5);
  // Pie gráfico idéntico al Word, ocupando el área inferior A4.
  comandos.push("q 595.28 0 0 84.8 0 0 cm /ImPie Do Q");
  return comandos.join("\n") + "\n";
}

function imagenJpegPdf(bytes: Uint8Array, ancho: number, alto: number): Uint8Array {
  return concatenar([
    codificarWinAnsi(`<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`),
    bytes,
    codificarWinAnsi("\nendstream"),
  ]);
}

function construirPdf(
  flujo: Uint8Array,
  jpeg: Uint8Array,
  franjas?: { encabezado: Uint8Array; pie: Uint8Array },
): Uint8Array {
  // Objetos PDF: catálogo, páginas, fuentes, imagen, página y contenido.
  const objetos: Uint8Array[] = [
    codificarWinAnsi("<< /Type /Catalog /Pages 2 0 R >>"),
    codificarWinAnsi("<< /Type /Pages /Kids [7 0 R] /Count 1 >>"),
    codificarWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
    codificarWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"),
    codificarWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>"),
    concatenar([
      codificarWinAnsi(`<< /Type /XObject /Subtype /Image /Width ${LOGO_ANCHO_PX} /Height ${LOGO_ALTO_PX} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      codificarWinAnsi("\nendstream"),
    ]),
    codificarWinAnsi(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 9 0 R /F5 10 0 R >> /XObject << /ImLogo 6 0 R ${franjas ? "/ImCabecera 11 0 R /ImPie 12 0 R" : ""} >> >> /Contents 8 0 R >>`),
    concatenar([codificarWinAnsi(`<< /Length ${flujo.length} >>\nstream\n`), flujo, codificarWinAnsi("\nendstream")]),
    codificarWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>"),
    codificarWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>"),
  ];
  if (franjas) {
    objetos.push(imagenJpegPdf(franjas.encabezado, 1055, 160));
    objetos.push(imagenJpegPdf(franjas.pie, 1055, 151));
  }
  const partes: Uint8Array[] = [codificarWinAnsi("%PDF-1.4\n%âãÏÓ\n")];
  const posiciones = [0];
  let desplazamiento = partes[0].length;
  objetos.forEach((objeto, indice) => {
    const prefijo = codificarWinAnsi(`${indice + 1} 0 obj\n`);
    const sufijo = codificarWinAnsi("\nendobj\n");
    posiciones.push(desplazamiento);
    partes.push(prefijo, objeto, sufijo);
    desplazamiento += prefijo.length + objeto.length + sufijo.length;
  });
  const inicioXref = desplazamiento;
  partes.push(codificarWinAnsi(`xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`));
  posiciones.slice(1).forEach((pos) => partes.push(codificarWinAnsi(`${String(pos).padStart(10, "0")} 00000 n \n`)));
  partes.push(codificarWinAnsi(`trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`));
  return concatenar(partes);
}

let promesaFranjas: Promise<{ encabezado: Uint8Array; pie: Uint8Array }> | null = null;
async function obtenerFranjas(): Promise<{ encabezado: Uint8Array; pie: Uint8Array }> {
  if (!promesaFranjas) {
    promesaFranjas = Promise.all([encabezadoOriginal, pieOriginal].map(async (ruta) => {
      const respuesta = await fetch(ruta);
      if (!respuesta.ok) throw new Error("No se pudieron cargar las franjas institucionales.");
      return new Uint8Array(await respuesta.arrayBuffer());
    })).then(([encabezado, pie]) => ({ encabezado, pie })).catch((error: unknown) => {
      promesaFranjas = null;
      throw error;
    });
  }
  return promesaFranjas;
}

let promesaLogo: Promise<Uint8Array> | null = null;
async function obtenerJpeg(): Promise<Uint8Array> {
  if (!promesaLogo) {
    promesaLogo = fetch(logoDocumento).then(async (respuesta) => {
      if (!respuesta.ok) throw new Error("No se pudo cargar el logotipo institucional.");
      return new Uint8Array(await respuesta.arrayBuffer());
    }).catch((error: unknown) => {
      promesaLogo = null;
      throw error;
    });
  }
  return promesaLogo;
}

/** `jpegParaPrueba` permite verificar los PDF sin navegador ni servidor. */
export async function crearPdfInstitucional(
  datos: DatosPdfInstitucional,
  jpegParaPrueba?: Uint8Array,
): Promise<Uint8Array> {
  const imagen = jpegParaPrueba ?? await obtenerJpeg();
  const franjas = await obtenerFranjas();
  return construirPdf(codificarWinAnsi(construirComandos(datos)), imagen, franjas);
}

export async function descargarPdfInstitucional(datos: DatosPdfInstitucional, nombreArchivo: string): Promise<void> {
  const bytes = await crearPdfInstitucional(datos);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Salida de bajo nivel para plantillas de actas, independiente del diseño
 * resumido de Reportes. Los PDF de inventario y movimientos siguen usando
 * crearPdfInstitucional, sin cambios en sus tablas ni cálculos.
 */
export async function crearPdfConComandos(
  comandos: string,
  jpegParaPrueba?: Uint8Array,
): Promise<Uint8Array> {
  const imagen = jpegParaPrueba ?? await obtenerJpeg();
  return construirPdf(codificarWinAnsi(comandos), imagen);
}

/** Reutiliza el mecanismo de descarga del navegador, sin ventanas de impresión. */
export function descargarBytesPdf(bytes: Uint8Array, nombreArchivo: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
