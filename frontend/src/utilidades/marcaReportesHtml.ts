/**
 * Presentación común de los informes imprimibles de EPULEAM.
 * Solo afecta a la salida documental, nunca a los datos ni a los filtros.
 */
import logoOriginal from "../assets/logos/logo-documentos-inicio-verde.png";
import franjaSuperior from "../assets/logos/franja-superior-reportes.png";
import franjaInferior from "../assets/logos/franja-inferior-reportes.png";

export function escaparHtmlReporte(valor: string | number | null | undefined): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface OpcionesImpresionInstitucional {
  titulo: string;
  periodo: string;
  contenido: string;
  firmas?: string[];
  orientacion?: "vertical" | "horizontal";
}

/**
 * Mantiene el logo original rojo/azul, con ULEAM verde, y bandas superiores
 * rojas/azules e inferiores azules/verdes. Se imprime desde el navegador.
 */
export function imprimirReporteInstitucional({
  titulo,
  periodo,
  contenido,
  firmas = [],
  orientacion = "horizontal",
}: OpcionesImpresionInstitucional): boolean {
  const ventana = window.open("", "_blank", "width=1150,height=850");
  if (!ventana) return false;

  const imagenLogo = new URL(logoOriginal, window.location.href).href;
  const imagenSuperior = new URL(franjaSuperior, window.location.href).href;
  const imagenPie = new URL(franjaInferior, window.location.href).href;
  const firmasHtml = firmas.length
    ? `<section class="firmas ${firmas.length === 1 ? "una-firma" : ""}">${firmas.map((firma) =>
        `<div class="firma"><div class="linea-firma"></div><strong>${escaparHtmlReporte(firma)}</strong></div>`
      ).join("")}</section>`
    : "";

  ventana.document.write(`<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>${escaparHtmlReporte(titulo)}</title>
<style>
  /* Documento A4 horizontal con el contenido completo entre el encabezado y las franjas. */
  @page { size: A4 ${orientacion === "horizontal" ? "landscape" : "portrait"}; margin: 31mm 12mm 22mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; color: #18253a; background: white; font: 11px/1.42 Arial, Helvetica, sans-serif; }
  .cabecera-documental { position: fixed; top: -29mm; left: 0; right: 0; height: 27mm; }
  .marca-documental { position: absolute; top: 3mm; left: 0; width: 83mm; height: 23mm; object-fit: contain; object-position: left center; }
  .franja-documental-superior { position: absolute; right: 0; top: 0; width: 67%; height: 17mm; object-fit: fill; }
  .sello { color: #637389; font-size: 9px; text-align: right; margin: 0 0 8px; }
  h1 { font: 700 18px/1.24 Georgia, 'Times New Roman', serif; text-align: center; margin: 9px 0 4px; text-transform: uppercase; letter-spacing: .015em; color: #102d58; }
  .periodo { text-align: center; color: #506480; margin: 0 0 14px; font-size: 10px; }
  .contenido { padding-bottom: 22px; }
  .resumen { margin: 0 0 13px; font-weight: 700; color: #1d3558; border-left: 3px solid #176db1; padding: 7px 10px; background: #f4f8fc; }
  h2 { font-size: 13px; font-weight: 700; color: #143863; margin: 17px 0 7px; padding-bottom: 5px; border-bottom: 1px solid #c7d9e9; break-after: avoid; }
  p { overflow-wrap: anywhere; }
  .nota-horizontal { display: none; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 17px; table-layout: fixed; font-size: 9px; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th, td { border: 1px solid #c2d3e5; padding: 6px 6px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  th { background: #e9f2fa; color: #173b68; font-weight: 700; }
  tbody tr:nth-child(even) { background: #fafcff; }
  .tabla-inventario th:nth-child(1), .tabla-inventario td:nth-child(1) { width: 10%; }
  .tabla-inventario th:nth-child(2), .tabla-inventario td:nth-child(2) { width: 18%; }
  .tabla-inventario th:nth-child(3), .tabla-inventario td:nth-child(3) { width: 7%; text-align: center; }
  .tabla-inventario th:nth-child(4), .tabla-inventario td:nth-child(4) { width: 11%; }
  .tabla-inventario th:nth-child(5), .tabla-inventario td:nth-child(5) { width: 10%; }
  .tabla-inventario th:nth-child(6), .tabla-inventario td:nth-child(6) { width: 12%; }
  .tabla-inventario th:nth-child(7), .tabla-inventario td:nth-child(7) { width: 13%; }
  .tabla-inventario th:nth-child(8), .tabla-inventario td:nth-child(8) { width: 12%; }
  .tabla-inventario th:nth-child(9), .tabla-inventario td:nth-child(9) { width: 7%; }
  .tabla-movimientos { font-size: 8.6px; }
  .tabla-movimientos th:nth-child(1), .tabla-movimientos td:nth-child(1) { width: 9%; }
  .tabla-movimientos th:nth-child(2), .tabla-movimientos td:nth-child(2) { width: 17%; }
  .tabla-movimientos th:nth-child(3), .tabla-movimientos td:nth-child(3) { width: 13%; }
  .tabla-movimientos th:nth-child(4), .tabla-movimientos td:nth-child(4) { width: 13%; }
  .tabla-movimientos th:nth-child(5), .tabla-movimientos td:nth-child(5) { width: 7%; text-align: center; }
  .tabla-movimientos th:nth-child(6), .tabla-movimientos td:nth-child(6) { width: 13%; }
  .tabla-movimientos th:nth-child(7), .tabla-movimientos td:nth-child(7) { width: 9%; }
  .tabla-movimientos th:nth-child(8), .tabla-movimientos td:nth-child(8) { width: 19%; }
  .firmas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 54px; margin-top: 46px; break-inside: avoid; }
  .firmas.una-firma { grid-template-columns: minmax(200px, 320px); justify-content: center; }
  .firma { text-align: center; font-size: 10px; }
  .linea-firma { border-top: 1px solid #50627b; margin-bottom: 8px; }
  .pie-institucional { position: fixed; left: 0; right: 0; bottom: -19mm; width: 100%; height: 13mm; object-fit: fill; }
  .pie-documento { position: fixed; bottom: -10mm; right: 0; font-size: 7px; color: #6c7b8e; text-align: right; }
  @media screen {
    body { padding: 20px 25px 38px; }
    .cabecera-documental { position: relative; top: auto; left: auto; right: auto; height: 122px; margin-bottom: 4px; }
    .marca-documental { top: 14px; left: 0; width: min(390px, 42%); height: 106px; }
    .franja-documental-superior { top: 0; right: 0; width: 70%; height: 65px; }
    .pie-institucional { position: relative; bottom: auto; height: 45px; margin-top: 22px; }
    .pie-documento { position: relative; bottom: auto; right: auto; text-align: right; }
  }
  @media print {
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th, tbody tr, .resumen { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head>
<body>
  <header class="cabecera-documental" aria-label="Identidad institucional">
    <img id="logo-institucional" class="marca-documental" src="${escaparHtmlReporte(imagenLogo)}" alt="Logotipo original EP ULEAM, con ULEAM verde" />
    <img id="franja-superior" class="franja-documental-superior" src="${escaparHtmlReporte(imagenSuperior)}" alt="Franja roja institucional" />
  </header>
  <div class="sello">Manta, Ecuador · Documento generado desde EPULEAM</div>
  <h1>${escaparHtmlReporte(titulo)}</h1>
  <p class="periodo">${escaparHtmlReporte(periodo)}</p>
  <main class="contenido">${contenido}${firmasHtml}</main>
  <div class="pie-documento">Sistema de Inventario EP ULEAM</div>
  <img id="pie-institucional" class="pie-institucional" src="${escaparHtmlReporte(imagenPie)}" alt="Franjas institucionales azul y verde" />
</body></html>`);
  ventana.document.close();

  // Esperar ambos recursos de la plantilla para no imprimir el logo o las franjas en blanco.
  const imagenes = ["logo-institucional", "franja-superior", "pie-institucional"]
    .map((id) => ventana.document.getElementById(id) as HTMLImageElement | null)
    .filter((img): img is HTMLImageElement => Boolean(img));
  let enviado = false;
  const imprimir = () => {
    if (enviado || ventana.closed) return;
    enviado = true;
    ventana.focus();
    ventana.print();
  };
  void Promise.all(imagenes.map((imagen) => imagen.complete ? Promise.resolve() : new Promise<void>((resolver) => {
    imagen.addEventListener("load", () => resolver(), { once: true });
    imagen.addEventListener("error", () => resolver(), { once: true });
  }))).then(() => ventana.setTimeout(imprimir, 150));
  ventana.setTimeout(imprimir, 1800);
  return true;
}
