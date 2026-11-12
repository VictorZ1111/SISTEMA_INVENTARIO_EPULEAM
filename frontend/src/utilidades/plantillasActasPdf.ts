/**
 * Actas institucionales EP ULEAM - formato documental A4.
 * Diseño basado en las dos plantillas visuales aprobadas: texto formal,
 * campos variables resaltados, tabla de bienes y firmas en dos columnas.
 *
 * La información ausente en los movimientos no se inventa ni se atribuye:
 * nombres de firmantes, cargos, memorandos y número oficial de acta se
 * dejan claramente marcados para completar antes de su firma.
 *
 * Esta función solo dibuja documentos; no altera movimientos ni inventario.
 */
import type { DatosActaPdf } from "./generarActaPdf";

type RGB = [number, number, number];
type Fuente = "F1" | "F2" | "F4" | "F5";
interface Segmento { texto: string; variable?: boolean; negrita?: boolean }
interface Columna { titulo: string; ancho: number }

const W = 595.28;
const M = 39;
const RIGHT = W - M;
const INNER = RIGHT - M;
const RED: RGB = [0.883, 0.078, 0.151];
const BLUE: RGB = [0.048, 0.308, 0.608];
const GREEN: RGB = [0.095, 0.583, 0.252];
const INK: RGB = [0.10, 0.10, 0.12];
const SUBTLE: RGB = [0.43, 0.46, 0.50];
const HILITE: RGB = [1, 0.965, 0.52];
const TABLE_GRAY: RGB = [0.910, 0.915, 0.925];
const TABLE_BLUE: RGB = [0.810, 0.895, 0.969];

const raw = (texto: string): Segmento => ({ texto });
const val = (texto: string): Segmento => ({ texto, variable: true });
const bold = (texto: string): Segmento => ({ texto, negrita: true });

function pdfString(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n\t]/g, " ");
}

/** Approximation used only to position highlights and line breaks. */
function textWidth(texto: string, size: number, font: Fuente): number {
  const weights: Record<string, number> = { i: .27, l: .29, I: .33, m: .79, w: .74, W: .9, M: .87, ".": .25, ",": .25, ":": .28, " ": .26, "[": .33, "]": .33, "1": .48, "-": .33, "/": .29 };
  let units = 0;
  for (const c of texto) units += weights[c] ?? (/[A-ZÁÉÍÓÚÑ]/.test(c) ? .68 : /\d/.test(c) ? .50 : .49);
  return units * size * (font === "F5" || font === "F2" ? 1.06 : 1);
}

class Papel {
  private cmds: string[] = [];
  private color(color: RGB, stroke = false): void {
    this.cmds.push(`${color.map((v) => v.toFixed(3)).join(" ")} ${stroke ? "RG" : "rg"}`);
  }
  text(s: string, x: number, y: number, size = 10.6, font: Fuente = "F4", color: RGB = INK): void {
    this.color(color);
    this.cmds.push(`BT /${font} ${size.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfString(s)}) Tj ET`);
  }
  center(s: string, y: number, size: number, font: Fuente = "F5", color: RGB = INK): void {
    this.text(s, Math.max(M, (W - textWidth(s, size, font)) / 2), y, size, font, color);
  }
  rect(x: number, y: number, w: number, h: number, fill: RGB): void {
    this.color(fill);
    this.cmds.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }
  line(x1: number, y1: number, x2: number, y2: number, color: RGB = SUBTLE, weight = .6): void {
    this.color(color, true);
    this.cmds.push(`${weight.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }
  paragraph(parts: Segmento[], y: number, size = 10.75, leading = 15.8, width = INNER): number {
    let x = M;
    let yLine = y;
    for (const part of parts) {
      const font: Fuente = part.negrita ? "F5" : "F4";
      for (const token of part.texto.match(/\S+|\s+/g) ?? []) {
        if (!token.trim()) {
          // Insert a real space only after a word; avoid leading indentation.
          if (x > M) x += textWidth(" ", size, font);
          continue;
        }
        const tw = textWidth(token, size, font);
        if (x + tw > M + width && x > M + 2) { x = M; yLine -= leading; }
        if (part.variable) this.rect(x - 1.6, yLine - 2.7, Math.min(tw + 3.3, M + width - x + 1), size + 3.4, HILITE);
        this.text(token, x, yLine, size, font);
        x += tw;
      }
    }
    return yLine - leading;
  }
  /** Crisp table with the exact headings/columns of each approved act. */
  table(cols: Columna[], data: string[], top: number, reception: boolean): number {
    const headerH = reception ? 31 : 29;
    const dataH = reception ? 38 : 34;
    const blankH = reception ? 20 : 27;
    const blankCount = reception ? 2 : 1;
    const bottom = top - headerH - dataH - blankCount * blankH;
    this.rect(M, top - headerH, INNER, headerH, reception ? TABLE_BLUE : TABLE_GRAY);
    // table grid, exactly one border around the entire table
    this.line(M, top, RIGHT, top, INK, .7);
    this.line(M, bottom, RIGHT, bottom, INK, .7);
    this.line(M, top - headerH, RIGHT, top - headerH, INK, .6);
    this.line(M, top - headerH - dataH, RIGHT, top - headerH - dataH, INK, .6);
    for (let r = 1; r < blankCount; r++) this.line(M, top - headerH - dataH - r * blankH, RIGHT, top - headerH - dataH - r * blankH, INK, .5);
    let x = M;
    for (const col of cols) {
      this.line(x, top, x, bottom, INK, .55);
      // Write long titles as two lines without crossing cell boundaries.
      const fontSize = reception ? 6.5 : 11.2;
      const words = col.titulo.split(" ");
      let lines = [""];
      for (const word of words) {
        const current = lines[lines.length - 1];
        const next = current ? `${current} ${word}` : word;
        if (current && textWidth(next, fontSize, "F5") > col.ancho - 4) lines.push(word);
        else lines[lines.length - 1] = next;
      }
      lines.slice(0, 3).forEach((lineText, index) => {
        const labelX = x + Math.max(2, (col.ancho - textWidth(lineText, fontSize, "F5")) / 2);
        this.text(lineText, labelX, top - 13 - index * 8, fontSize, "F5");
      });
      x += col.ancho;
    }
    this.line(RIGHT, top, RIGHT, bottom, INK, .55);
    x = M;
    cols.forEach((col, i) => {
      const value = data[i] ?? "";
      const fontsize = reception ? 7 : 10.0;
      const maxW = Math.max(8, col.ancho - 7);
      const lines: string[] = [];
      let line = "";
      for (const word of value.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && textWidth(candidate, fontsize, "F4") > maxW) { lines.push(line); line = word; }
        else line = candidate;
        if (textWidth(line, fontsize, "F4") > maxW) {
          let rest = line;
          while (rest) {
            let fragment = "";
            for (const c of rest) {
              if (fragment && textWidth(fragment + c, fontsize, "F4") > maxW) break;
              fragment += c;
            }
            if (!fragment) break;
            lines.push(fragment);
            rest = rest.slice(fragment.length);
          }
          line = "";
        }
      }
      if (line) lines.push(line);
      const allowed = reception ? 3 : 2;
      lines.slice(0, allowed).forEach((s, j) => {
        const ty = top - headerH - 13 - j * (reception ? 8.5 : 11.3);
        const display = s.length > 80 ? `${s.slice(0, 77)}...` : s;
        if (i !== 0 && display.trim() && display !== "-") this.rect(x + 3, ty - 2.5, Math.min(maxW, textWidth(display, fontsize, "F4")) + 2, fontsize + 3, HILITE);
        this.text(display, x + 4, ty, fontsize, "F4");
      });
      x += col.ancho;
    });
    // Numbered rows are blank for future amendments, not fabricated records.
    for (let i = 0; i < blankCount; i++) this.text(String(i + 2), M + 13, top - headerH - dataH - i * blankH - 14, reception ? 7.2 : 9.4);
    return bottom;
  }
  header(title: string, year: string, entrega: boolean): void {
    // Architectural contours matching the approved reference: wide red band
    // upper-right with a fine blue underlap; green/blue swooshes below.
    this.color(RED);
    this.cmds.push("215 832 m 582 833 l 582 805 l 520 810 475 815 445 815 c 350 819 280 829 215 832 c h f");
    this.color(BLUE);
    this.cmds.push("430 816 m 582 809 l 582 802 l 510 803 486 804 471 806 c 449 808 436 813 430 816 c h f");
    // The exact institutional EP silhouette is embedded as an image; ULEAM
    // inside that asset is already green and must never be recolored.
    this.cmds.push("q 114 0 0 74 41 747 cm /ImLogo Do Q");
    this.line(163, 757, 163, 798, RED, 1.5);
    this.text("EMPRESA PÚBLICA", 172, 786, 8.8, "F2", BLUE);
    this.text("DE DESARROLLO PRODUCTIVO", 172, 775, 8.8, "F2", BLUE);
    this.text("Y SERVICIOS UNIVERSITARIOS", 172, 764, 8.8, "F2", BLUE);
    this.center(title, 704, 19.5, "F5");
    const num = `No. ____-${year}`;
    const numSize = 14.1;
    const measure = textWidth(num, numSize, "F5");
    const nx = (W - measure) / 2;
    this.rect(nx - 5, 670, measure + 11, 21, HILITE);
    this.text(num, nx, 675, numSize, "F5");
    if (entrega) {
      this.line(83, 682, nx - 12, 682, SUBTLE, .6);
      this.line(nx + measure + 12, 682, W - 83, 682, SUBTLE, .6);
    } else {
      this.line(M, 666, RIGHT, 666, BLUE, 1.0);
    }
    this.footer();
  }
  footer(): void {
    this.color(GREEN);
    this.cmds.push("5 14 m 585 48 l 585 31 l 490 27 390 16 303 12 c 176 9 81 8 5 14 c h f");
    this.color(BLUE);
    this.cmds.push("5 21 m 293 8 l 585 25 l 585 4 l 5 4 l h f");
  }
  signatures(yTitle: number, reception: boolean): void {
    const leftCenter = 166;
    const rightCenter = 430;
    if (reception) {
      this.rect(75, yTitle - 5, 189, 21, TABLE_BLUE);
      this.rect(332, yTitle - 5, 189, 21, TABLE_BLUE);
    }
    this.text("ENTREGA", leftCenter - 25, yTitle, 12.2, "F5");
    this.text("RECIBE", rightCenter - 20, yTitle, 12.2, "F5");
    const lineY = yTitle - (reception ? 56 : 67);
    this.line(91, lineY, 258, lineY, INK, .75);
    this.line(338, lineY, 504, lineY, INK, .75);
    this.signatureData(91, 258, lineY - 17, reception);
    this.signatureData(338, 504, lineY - 17, reception, true);
  }
  private signatureData(left: number, right: number, y: number, reception: boolean, receiving = false): void {
    const rows = [
      receiving ? "[Nombre del/la Receptor/a]" : "[Nombre del/la Entregante]",
      "[Cargo]",
      reception ? "[Dependencia]" : "[Área / Bodega / Sucursal]",
    ];
    rows.forEach((r, i) => {
      const fontSize = i === 0 ? 8.9 : 8.6;
      const wt = textWidth(r, fontSize, "F4");
      const x = (left + right - wt) / 2;
      this.rect(x - 1.5, y - i * 13 - 2, wt + 3, fontSize + 3, HILITE);
      this.text(r, x, y - i * 13, fontSize, "F4");
    });
  }
  reversalWarning(reverted: boolean): void {
    if (!reverted) return;
    this.rect(M, 69, INNER, 19, [1, .902, .79]);
    this.text("MOVIMIENTO REVERTIDO - Documento conservado únicamente para trazabilidad.", M + 6, 75, 8.6, "F2", [0.65, .25, .12]);
  }
  make(): string { return this.cmds.join("\n") + "\n"; }
}

function parseFecha(fecha: string): { dia: string; mes: string; year: string } {
  const match = fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  if (match) return { dia: String(Number(match[1])), mes: meses[Number(match[2]) - 1] || "[Mes]", year: match[3] };
  const date = new Date(fecha);
  if (!Number.isNaN(date.getTime())) {
    const parts = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "long", year: "numeric" }).formatToParts(date);
    const find = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return { dia: find("day"), mes: find("month"), year: find("year") };
  }
  return { dia: "[Día]", mes: "[Mes]", year: String(new Date().getFullYear()) };
}

function clean(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function crearEntrega(datos: DatosActaPdf): string {
  const d = new Papel();
  const { dia, mes, year } = parseFecha(datos.fecha);
  d.header("ACTA DE ENTREGA - RECEPCIÓN", year, true);
  let y = d.paragraph([
    raw("En la ciudad de "), val("[Ciudad]"), raw(", a los "), val(dia),
    raw(" días del mes de "), val(mes), raw(" de "), val(year),
    raw(", comparecen a la firma de la presente Acta de Entrega y Recepción de bienes y materiales."),
  ], 643, 11.0, 17.6);
  y -= 17;
  y = d.paragraph([
    raw("Por una parte, el/la "), val("[Nombre del/la Entregante]"), raw(", "),
    val("[Cargo del/la Entregante]"), raw(" de "),
    val(clean(datos.origen, "[Área / Bodega / Sucursal]")), raw("; y, por otra parte, en calidad de receptor/a, el/la "),
    val("[Nombre del/la Receptor/a]"), raw(", "), val("[Cargo del/la Receptor/a]"), raw(" de "),
    val(clean(datos.destino, "[Área / Bodega / Sucursal]")), raw("."),
  ], y, 10.9, 17.4);
  y -= 17;
  y = d.paragraph([
    raw("La entrega se realiza de conformidad con lo solicitado en el "),
    val("[Memorando / Referencia No. __________]"),
    raw(", mediante el cual se requiere la provisión de los siguientes bienes:"),
  ], y, 10.9, 17.4);
  const tableY = Math.min(460, y - 17);
  const tableEnd = d.table([
    { titulo: "#", ancho: 43 }, { titulo: "BIEN", ancho: 360 }, { titulo: "CANTIDAD", ancho: 114 },
  ], ["1", datos.bien || "[Descripción del bien]", String(datos.cantidad)], tableY, false);
  const paragraphEnd = d.paragraph([
    raw("Para constancia de la aceptación de lo entregado, las partes suscriben la presente Acta de Entrega - Recepción, en "),
    val("[número de ejemplares]"), raw(" ejemplares del mismo valor y contenido legal, en el lugar y fecha señalados."),
  ], tableEnd - 30, 10.8, 17.4);
  if (datos.observacion) d.paragraph([bold("Observación: "), val(datos.observacion)], paragraphEnd - 7, 9.0, 12.3);
  d.signatures(245, false);
  d.reversalWarning(datos.revertido);
  return d.make();
}

function crearRecepcion(datos: DatosActaPdf): string {
  const d = new Papel();
  const { dia, mes, year } = parseFecha(datos.fecha);
  d.header("ACTA DE RECEPCIÓN INTERNA", year, false);
  let y = d.paragraph([
    raw("En la ciudad de "), val("[Ciudad]"), raw(", a los "), val(dia),
    raw(" días del mes de "), val(mes), raw(" de "), val(year),
    raw(", comparecen a la firma de la presente Acta de Recepción Interna de bienes y/o materiales:"),
  ], 640, 10.75, 16.7);
  y -= 12;
  y = d.paragraph([
    raw("Por una parte, "), val("[Nombre y cargo de quien entrega]"),
    raw(", en calidad de "), val("[Cargo / Dependencia que entrega]"),
    raw(", y por otra parte, "), val("[Nombre y cargo de quien recibe]"),
    raw(", en calidad de "), val("[Cargo / Dependencia que recibe]"),
    raw(", con el propósito de "),
    val("recibir e ingresar al inventario los bienes y materiales relacionados en la presente acta."),
  ], y, 10.45, 15.6);
  y -= 8;
  d.paragraph([raw("A continuación, se detallan los bienes recibidos:")], y, 10.7, 16);
  const tableY = Math.min(490, y - 24);
  const cols: Columna[] = [
    { titulo: "#", ancho: 20 }, { titulo: "Código", ancho: 50 },
    { titulo: "Descripción del bien", ancho: 121 }, { titulo: "Cantidad", ancho: 42 },
    { titulo: "Serie", ancho: 36 }, { titulo: "Modelo", ancho: 36 },
    { titulo: "Marca", ancho: 36 }, { titulo: "Material", ancho: 40 },
    { titulo: "Color", ancho: 32 }, { titulo: "Ubicación", ancho: 55 },
    { titulo: "Procedencia", ancho: 49 },
  ];
  const endTable = d.table(cols, [
    "1", clean(datos.codigo, "-"), datos.bien, String(datos.cantidad),
    "-", "-", "-", "-", "-", clean(datos.destino, "-"), clean(datos.origen, "-"),
  ], tableY, true);
  let yClosing = d.paragraph([
    bold("Observación: "), raw("Se deja constancia de que los bienes y materiales detallados se reciben con las siguientes novedades: "),
    val(datos.observacion || "[Sin observaciones registradas]"), raw(", para ser destinados a "),
    val(clean(datos.destino, "[Dependencia o finalidad de uso]")), raw("."),
  ], endTable - 22, 9.7, 14.0);
  yClosing -= 8;
  d.paragraph([
    raw("Para constancia de la recepción interna, se suscribe la presente Acta en "),
    val("[número de ejemplares]"), raw(" ejemplares del mismo tenor y valor, en la ciudad, fecha y lugar antes señalados."),
  ], yClosing, 9.7, 14.0);
  d.signatures(218, true);
  d.reversalWarning(datos.revertido);
  return d.make();
}

export function construirComandosActa(datos: DatosActaPdf): string {
  return datos.tipo === "entrega" ? crearEntrega(datos) : crearRecepcion(datos);
}
