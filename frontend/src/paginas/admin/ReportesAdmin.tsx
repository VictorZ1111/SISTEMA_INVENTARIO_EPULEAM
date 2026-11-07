import axios from "axios";
import {
  Box,
  Building2,
  Download,
  Paintbrush,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { clienteApi } from "../../api/clienteApi";
import CampoDesplegable from "../../componentes/CampoDesplegable";
import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import { useUsuarios } from "../../contexto/UsuariosContext";


type TipoPeriodoReporte = "dia" | "mes" | "anio" | "rango";
type TipoReporte = "inventario" | "bodega" | "sucursal";
type TipoBienReporte = "todos" | "consumible" | "no_consumible";
type TipoBodegaBackend = "inventario_general" | "principal" | "sucursal";
type TipoMovimientoBackend =
  | "entrada"
  | "transferencia"
  | "baja"
  | "modificacion"
  | "devolucion";

interface BodegaBackend {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoBodegaBackend;
  estado: "activa" | "inactiva";
  esSistema: boolean;
  bodegaPadreId: string | null;
  bodegaPadre: {
    id: string;
    nombre: string;
  } | null;
}

interface ReporteCard {
  id: string;
  nombre: string;
  tipo: TipoReporte;
  bodegaId?: string;
  incluirSucursales?: boolean;
}

interface FiltrosAplicadosReporte {
  periodo: TipoPeriodoReporte;
  fechaInicio: string;
  fechaFin: string;
  tipoProducto: TipoBienReporte;
  tipoMovimiento: TipoMovimientoBackend | "todos";
  bodegaId: string | null;
  custodioId: string | null;
  incluirSucursales: boolean;
  buscar: string | null;
}

interface ReporteInventarioItem {
  id: string;
  productoId: string;
  codigo: string;
  producto: string;
  descripcion: string;
  descripcionBien: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  tipoProducto: "consumible" | "no_consumible";
  empresa: string | null;
  atributo: string | null;
  estadoBien: string;
  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;
  procedencia: string | null;
  codigoUleam: string | null;
  ubicacion: string;
  custodioActual: string;
  bodega: string;
  bodegaId: string;
  fechaRegistro: string;
  fechaAsignacion: string;
  observacion: string | null;
}

interface ReporteMovimientoItem {
  id: string;
  tipo: TipoMovimientoBackend;
  productoId: string | null;
  codigo: string | null;
  producto: string;
  origen: string;
  destino: string;
  cantidad: number;
  cantidadAnterior: number | null;
  cantidadNueva: number | null;
  empresa: string | null;
  usuario: string;
  usuarioId: string;
  fecha: string;
  createdAt: string;
  observacion: string;
  modulo: string | null;
  accion: string | null;
}

interface ReporteInventarioPublico {
  generadoEn: string;
  periodo: string;
  filtros: FiltrosAplicadosReporte;
  resumen: {
    totalRegistros: number;
    totalCantidad: number;
    totalConsumibles: number;
    totalNoConsumibles: number;
  };
  items: ReporteInventarioItem[];
}

interface ReporteMovimientosPublico {
  generadoEn: string;
  periodo: string;
  filtros: FiltrosAplicadosReporte;
  resumen: {
    totalMovimientos: number;
    totalEntradas: number;
    totalTransferencias: number;
    totalDevoluciones: number;
    totalBajas: number;
    totalModificaciones: number;
  };
  items: ReporteMovimientoItem[];
}

interface ReporteGeneralPublico {
  generadoEn: string;
  periodo: string;
  filtros: FiltrosAplicadosReporte;
  inventario: ReporteInventarioPublico;
  movimientos: ReporteMovimientosPublico;
}

function obtenerFechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function obtenerMesActual() {
  return new Date().toISOString().slice(0, 7);
}

function obtenerAnioActual() {
  return String(new Date().getFullYear());
}

function normalizarTexto(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("bodega ", "")
    .replace("gastronomia tasty", "gastronomia")
    .replace("inventario general", "general");
}

function escaparHtml(valor: string | number) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function obtenerNombreTipoProducto(tipoProducto: string) {
  return tipoProducto === "consumible" ? "Consumible" : "No consumible";
}

function obtenerNombreMovimiento(tipo: TipoMovimientoBackend) {
  if (tipo === "entrada") return "Entrada";
  if (tipo === "transferencia") return "Transferencia";
  if (tipo === "baja") return "Baja";
  if (tipo === "devolucion") return "Devolución";
  return "Modificación";
}

function obtenerNombreReporteBodega(nombreBodega: string) {
  if (nombreBodega === "Gastronomía Tasty") return nombreBodega;
  if (nombreBodega.toLowerCase().startsWith("bodega ")) return nombreBodega;
  return `Bodega ${nombreBodega}`;
}

function obtenerClaseIconoReporte(nombre: string, tipo: TipoReporte) {
  const nombreNormalizado = normalizarTexto(nombre);

  if (tipo === "inventario" || nombreNormalizado.includes("general")) {
    return "icono-bodega-inventario";
  }

  if (nombreNormalizado.includes("limpieza")) {
    return "icono-bodega-limpieza";
  }

  if (nombreNormalizado.includes("oficina")) {
    return "icono-bodega-oficina";
  }

  if (
    tipo === "sucursal" ||
    nombreNormalizado.includes("tasty") ||
    nombreNormalizado.includes("gastronomia")
  ) {
    return "icono-bodega-gastronomia";
  }

  return "icono-bodega-generica";
}

function construirTablaHtml(
  columnas: string[],
  filas: Array<Array<string | number>>,
) {
  const encabezados = columnas
    .map((columna) => `<th>${escaparHtml(columna)}</th>`)
    .join("");

  const cuerpo = filas.length
    ? filas
        .map(
          (fila) =>
            `<tr>${fila
              .map((celda) => `<td>${escaparHtml(celda)}</td>`)
              .join("")}</tr>`,
        )
        .join("")
    : `<tr><td colspan="${columnas.length}">No existen registros para este periodo.</td></tr>`;

  return `
    <table>
      <thead><tr>${encabezados}</tr></thead>
      <tbody>${cuerpo}</tbody>
    </table>
  `;
}

function imprimirDocumentoReporte(
  titulo: string,
  periodo: string,
  contenido: string,
  nombreCustodio = "Custodio asignado",
  soloFirmaAdministracion = false,
) {
  const ventana = window.open("", "_blank", "width=1100,height=850");

  if (!ventana) return false;

  ventana.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escaparHtml(titulo)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; color: #0f172a; font-family: Arial, Helvetica, sans-serif; background: #fff; }
          .encabezado { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding-bottom: 18px; border-bottom: 2px solid #0f172a; margin-bottom: 22px; }
          .encabezado h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: .03em; }
          .encabezado p { margin: 0; color: #475569; font-size: 13px; }
          .marca { text-align: right; font-size: 12px; color: #475569; }
          .resumen { margin: 0 0 18px; color: #334155; font-size: 12px; }
          h2 { margin: 22px 0 10px; font-size: 15px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11px; }
          th, td { border: 1px solid #94a3b8; padding: 7px 8px; text-align: left; vertical-align: top; }
          th { background: #e2e8f0; color: #0f172a; font-weight: 700; }
          .firmas { display: grid; grid-template-columns: repeat(2, 1fr); gap: 80px; margin-top: 56px; }
          .firmas.firma-unica { grid-template-columns: minmax(240px, 420px); justify-content: center; }
          .firma { text-align: center; color: #334155; font-size: 12px; }
          .linea { border-top: 1px solid #0f172a; margin-bottom: 8px; }
          @media print { body { padding: 18px; } }
        </style>
      </head>
      <body>
        <div class="encabezado">
          <div>
            <h1>${escaparHtml(titulo)}</h1>
            <p>Periodo: ${escaparHtml(periodo)}</p>
          </div>
          <div class="marca">Sistema de Inventario<br />EPULEAM</div>
        </div>
        ${contenido}
        <div class="firmas${soloFirmaAdministracion ? " firma-unica" : ""}">
          ${
            soloFirmaAdministracion
              ? ""
              : `<div class="firma"><div class="linea"></div>${escaparHtml(
                  nombreCustodio,
                )}</div>`
          }
          <div class="firma"><div class="linea"></div>Administración</div>
        </div>
      </body>
    </html>
  `);

  ventana.document.close();
  ventana.focus();
  window.setTimeout(() => ventana.print(), 350);
  return true;
}

function obtenerMensajeError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.message;

    if (Array.isArray(mensaje)) return mensaje.join(" ");
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
    if (!error.response) {
      return "No se pudo conectar con el servidor. Verifica que el backend esté encendido.";
    }
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return "No se pudo generar el reporte.";
}

function ReportesAdmin() {
  const { usuarios } = useUsuarios();

  const [bodegas, setBodegas] = useState<BodegaBackend[]>([]);
  const [cargandoBodegas, setCargandoBodegas] = useState(true);
  const [generandoReporte, setGenerandoReporte] = useState<string | null>(null);

  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoReporte>("dia");
  const [fechaDia, setFechaDia] = useState(obtenerFechaActual());
  const [fechaMes, setFechaMes] = useState(obtenerMesActual());
  const [fechaAnio, setFechaAnio] = useState(obtenerAnioActual());
  const [fechaInicio, setFechaInicio] = useState(obtenerFechaActual());
  const [fechaFin, setFechaFin] = useState(obtenerFechaActual());
  const [custodioSeleccionado, setCustodioSeleccionado] = useState("todos");
  const [tipoBien, setTipoBien] = useState<TipoBienReporte>("todos");
  const [mensajeReporte, setMensajeReporte] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarBodegas() {
      try {
        const { data } = await clienteApi.get<BodegaBackend[]>("/bodegas/activas");
        if (activo) setBodegas(data);
      } catch (error) {
        if (activo) setMensajeReporte(obtenerMensajeError(error));
      } finally {
        if (activo) setCargandoBodegas(false);
      }
    }

    void cargarBodegas();

    return () => {
      activo = false;
    };
  }, []);

  const filtrosActivos =
    tipoPeriodo !== "dia" ||
    fechaDia !== obtenerFechaActual() ||
    fechaMes !== obtenerMesActual() ||
    fechaAnio !== obtenerAnioActual() ||
    fechaInicio !== obtenerFechaActual() ||
    fechaFin !== obtenerFechaActual() ||
    custodioSeleccionado !== "todos" ||
    tipoBien !== "todos";

  const limpiarFiltros = () => {
    setTipoPeriodo("dia");
    setFechaDia(obtenerFechaActual());
    setFechaMes(obtenerMesActual());
    setFechaAnio(obtenerAnioActual());
    setFechaInicio(obtenerFechaActual());
    setFechaFin(obtenerFechaActual());
    setCustodioSeleccionado("todos");
    setTipoBien("todos");
    setMensajeReporte("");
  };

  const custodiosDisponibles = useMemo(
    () =>
      usuarios
        .filter((usuario) => usuario.estado === "activo" && usuario.rol !== "admin")
        .filter(
          (usuario) =>
            (usuario.bodegasAsignadas?.length || 0) > 0 ||
            Boolean(usuario.bodegaAsignada),
        )
        .sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
        ),
    [usuarios],
  );

  const usuarioCustodioSeleccionado = useMemo(() => {
    if (custodioSeleccionado === "todos") return undefined;
    return usuarios.find((usuario) => String(usuario.id) === custodioSeleccionado);
  }, [custodioSeleccionado, usuarios]);

  const inventarioGeneral = useMemo(
    () => bodegas.find((bodega) => bodega.tipo === "inventario_general"),
    [bodegas],
  );

  const tarjetasBodegas = useMemo<ReporteCard[]>(
    () =>
      bodegas
        .filter((bodega) => bodega.tipo === "principal")
        .map((bodega) => ({
          id: `bodega-${bodega.id}`,
          nombre: obtenerNombreReporteBodega(bodega.nombre),
          tipo: "bodega",
          bodegaId: bodega.id,
          incluirSucursales: bodegas.some(
            (sucursal) => sucursal.bodegaPadreId === bodega.id,
          ),
        })),
    [bodegas],
  );

  const tarjetasSucursales = useMemo<ReporteCard[]>(
    () =>
      bodegas
        .filter((bodega) => bodega.tipo === "sucursal")
        .map((bodega) => ({
          id: `sucursal-${bodega.id}`,
          nombre: bodega.nombre,
          tipo: "sucursal",
          bodegaId: bodega.id,
          incluirSucursales: false,
        })),
    [bodegas],
  );

  const tarjetaDisponibleParaCustodio = (tarjeta: ReporteCard) => {
    if (tarjeta.tipo === "inventario" || !usuarioCustodioSeleccionado) return true;

    const asignadas = new Set(
      [
        ...(usuarioCustodioSeleccionado.bodegasAsignadas || []),
        usuarioCustodioSeleccionado.bodegaAsignada || "",
      ]
        .map((nombre) => normalizarTexto(nombre))
        .filter(Boolean),
    );

    if (!tarjeta.bodegaId) return true;

    const bodegaTarjeta = bodegas.find((bodega) => bodega.id === tarjeta.bodegaId);
    if (!bodegaTarjeta) return false;

    if (asignadas.has(normalizarTexto(bodegaTarjeta.nombre))) return true;

    if (bodegaTarjeta.tipo === "sucursal" && bodegaTarjeta.bodegaPadre) {
      return asignadas.has(normalizarTexto(bodegaTarjeta.bodegaPadre.nombre));
    }

    if (bodegaTarjeta.tipo === "principal") {
      return bodegas.some(
        (bodega) =>
          bodega.bodegaPadreId === bodegaTarjeta.id &&
          asignadas.has(normalizarTexto(bodega.nombre)),
      );
    }

    return false;
  };

  const construirParametrosReporte = (tarjeta: ReporteCard) => {
    const params = new URLSearchParams();
    params.set("periodo", tipoPeriodo);

    if (tipoPeriodo === "dia") params.set("fecha", fechaDia);
    if (tipoPeriodo === "mes") params.set("mes", fechaMes);
    if (tipoPeriodo === "anio") params.set("anio", fechaAnio);
    if (tipoPeriodo === "rango") {
      params.set("fechaInicio", fechaInicio);
      params.set("fechaFin", fechaFin);
    }

    if (tipoBien !== "todos") params.set("tipoProducto", tipoBien);
    if (custodioSeleccionado !== "todos") {
      params.set("custodioId", custodioSeleccionado);
    }
    if (tarjeta.bodegaId) params.set("bodegaId", tarjeta.bodegaId);
    if (tarjeta.incluirSucursales) params.set("incluirSucursales", "true");

    return params;
  };

  const construirContenidoReporte = (reporte: ReporteGeneralPublico) => {
    const filasInventario = reporte.inventario.items.map((item) => [
      item.codigo,
      item.producto,
      item.cantidad,
      obtenerNombreTipoProducto(item.tipoProducto),
      item.tipoProducto === "no_consumible"
        ? item.atributo || item.empresa || "No registrado"
        : "No aplica",
      item.categoria,
      item.bodega,
      item.custodioActual || "Sin asignar",
      item.fechaAsignacion,
    ]);

    const filasMovimientos = reporte.movimientos.items.map((item) => [
      obtenerNombreMovimiento(item.tipo),
      item.producto,
      item.origen,
      item.destino,
      item.cantidad,
      item.usuario,
      item.fecha,
      item.observacion || "Sin observación",
    ]);

    return `
      <p class="resumen">
        Inventario: ${reporte.inventario.resumen.totalRegistros} registros ·
        Cantidad total: ${reporte.inventario.resumen.totalCantidad} ·
        Movimientos: ${reporte.movimientos.resumen.totalMovimientos}
      </p>
      <h2>Inventario</h2>
      ${construirTablaHtml(
        [
          "Código",
          "Bien",
          "Cantidad",
          "Tipo",
          "Atributo",
          "Categoría",
          "Bodega",
          "Custodio",
          "Fecha",
        ],
        filasInventario,
      )}
      <h2>Movimientos del periodo</h2>
      ${construirTablaHtml(
        [
          "Tipo",
          "Registro",
          "Origen",
          "Destino",
          "Cantidad",
          "Usuario",
          "Fecha",
          "Observación",
        ],
        filasMovimientos,
      )}
    `;
  };

  const exportarReporte = async (tarjeta: ReporteCard) => {
    if (!tarjetaDisponibleParaCustodio(tarjeta)) return;

    setGenerandoReporte(tarjeta.id);
    setMensajeReporte("");

    try {
      const parametros = construirParametrosReporte(tarjeta);
      const { data } = await clienteApi.get<ReporteGeneralPublico>(
        `/reportes/general?${parametros.toString()}`,
      );

      const nombreCustodio = usuarioCustodioSeleccionado?.nombre || "Custodio asignado";
      const soloAdministracion = tarjeta.tipo === "inventario";
      const pudoAbrir = imprimirDocumentoReporte(
        tarjeta.tipo === "inventario"
          ? "Reporte de Inventario General"
          : `Reporte de ${tarjeta.nombre}`,
        `${data.periodo} · ${
          tipoBien === "todos"
            ? "Todos los tipos"
            : tipoBien === "consumible"
              ? "Consumibles"
              : "No consumibles"
        } · Custodio: ${usuarioCustodioSeleccionado?.nombre || "Todos"}`,
        construirContenidoReporte(data),
        nombreCustodio,
        soloAdministracion,
      );

      if (!pudoAbrir) {
        setMensajeReporte(
          "No se pudo abrir el reporte. Revisa si el navegador bloqueó la ventana emergente.",
        );
      }
    } catch (error) {
      setMensajeReporte(obtenerMensajeError(error));
    } finally {
      setGenerandoReporte(null);
    }
  };

  const renderizarCardReporte = (tarjeta: ReporteCard) => {
    const nombreNormalizado = normalizarTexto(tarjeta.nombre);
    const disponible = tarjetaDisponibleParaCustodio(tarjeta);
    const generando = generandoReporte === tarjeta.id;

    const IconoReporte =
      tarjeta.tipo === "inventario" || nombreNormalizado.includes("general")
        ? Box
        : nombreNormalizado.includes("limpieza")
          ? Paintbrush
          : nombreNormalizado.includes("oficina")
            ? Building2
            : tarjeta.tipo === "sucursal" ||
                nombreNormalizado.includes("tasty") ||
                nombreNormalizado.includes("gastronomia")
              ? Utensils
              : Building2;

    return (
      <article
        className={`tarjeta-reporte-simple tarjeta-reporte-${tarjeta.tipo}`}
        key={tarjeta.id}
      >
        <div className="tarjeta-reporte-contenido">
          <div
            className={`icono-reporte-simple ${obtenerClaseIconoReporte(
              tarjeta.nombre,
              tarjeta.tipo,
            )}`}
          >
            <IconoReporte size={20} />
          </div>
          <h3>{tarjeta.nombre}</h3>
        </div>

        <button
          className="boton-secundario"
          type="button"
          disabled={!disponible || Boolean(generandoReporte)}
          title={
            disponible
              ? "Exportar reporte"
              : "Esta bodega no está asignada al custodio seleccionado"
          }
          style={
            disponible
              ? undefined
              : { opacity: 0.45, cursor: "not-allowed" }
          }
          onClick={() => void exportarReporte(tarjeta)}
        >
          <Download size={14} />
          {generando ? "Generando..." : "Exportar"}
        </button>
      </article>
    );
  };

  const tarjetaInventario: ReporteCard = {
    id: "inventario-general",
    nombre: "Inventario General",
    tipo: "inventario",
    bodegaId: inventarioGeneral?.id,
  };

  return (
    <div className="pagina-admin pagina-reportes-compacta">
      <EncabezadoPagina
        titulo="Reportes"
        descripcion="Consulta documentos generales del inventario y bodegas."
      />

      <section className="seccion-dashboard reportes-panel reportes-panel-compacto">
        <div className="seccion-dashboard-header reportes-header-simple">
          <div>
            <h2>Reportes disponibles</h2>
          </div>
        </div>

        {mensajeReporte ? (
          <div className="mensaje-sistema mensaje-sistema-error">
            {mensajeReporte}
          </div>
        ) : null}

        <div className="bloque-reportes-compacto">
          <div
            className={`reportes-toolbar reportes-toolbar-compacta reportes-periodo-${tipoPeriodo}`}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              alignItems: "end",
              gap: "14px",
            }}
          >
            <p style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
              Filtros del reporte
            </p>

            <label>
              <span>Periodo</span>
              <CampoDesplegable
                valor={tipoPeriodo}
                alCambiar={(valor) => setTipoPeriodo(valor as TipoPeriodoReporte)}
                opciones={[
                  { valor: "dia", texto: "Día" },
                  { valor: "mes", texto: "Mes" },
                  { valor: "anio", texto: "Año" },
                  { valor: "rango", texto: "Entre periodos" },
                ]}
                ariaLabel="Seleccionar periodo"
                mostrarIconoFiltro={false}
                ancho="100%"
              />
            </label>

            {tipoPeriodo === "dia" ? (
              <label>
                <span>Fecha</span>
                <input
                  type="date"
                  value={fechaDia}
                  onChange={(event) => setFechaDia(event.target.value)}
                />
              </label>
            ) : null}

            {tipoPeriodo === "mes" ? (
              <label>
                <span>Mes</span>
                <input
                  type="month"
                  value={fechaMes}
                  onChange={(event) => setFechaMes(event.target.value)}
                />
              </label>
            ) : null}

            {tipoPeriodo === "anio" ? (
              <label>
                <span>Año</span>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={fechaAnio}
                  onChange={(event) => setFechaAnio(event.target.value)}
                />
              </label>
            ) : null}

            {tipoPeriodo === "rango" ? (
              <>
                <label>
                  <span>Desde</span>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(event) => setFechaInicio(event.target.value)}
                  />
                </label>
                <label>
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(event) => setFechaFin(event.target.value)}
                  />
                </label>
              </>
            ) : null}

            <label>
              <span>Custodio</span>
              <CampoDesplegable
                valor={custodioSeleccionado}
                alCambiar={setCustodioSeleccionado}
                opciones={[
                  { valor: "todos", texto: "Todos" },
                  ...custodiosDisponibles.map((usuario) => ({
                    valor: String(usuario.id),
                    texto: usuario.nombre,
                  })),
                ]}
                ariaLabel="Seleccionar custodio"
                mostrarIconoFiltro={false}
                ancho="100%"
              />
            </label>

            <label>
              <span>Tipo de bien</span>
              <CampoDesplegable
                valor={tipoBien}
                alCambiar={(valor) => setTipoBien(valor as TipoBienReporte)}
                opciones={[
                  { valor: "todos", texto: "Todos" },
                  { valor: "consumible", texto: "Consumibles" },
                  { valor: "no_consumible", texto: "No consumibles" },
                ]}
                ariaLabel="Seleccionar tipo de bien"
                mostrarIconoFiltro={false}
                ancho="100%"
              />
            </label>

            <button
              className="boton-filtro boton-filtro-icono"
              type="button"
              title="Limpiar filtros"
              aria-label="Limpiar filtros"
              disabled={!filtrosActivos}
              onClick={limpiarFiltros}
              style={{ alignSelf: "end", justifySelf: "start" }}
            >
              <Paintbrush size={18} />
            </button>
          </div>
        </div>

        <div className="bloque-reportes-compacto">
          <h3>Inventario General</h3>
          <div className="grid-reportes-simple grid-reportes-uno">
            {renderizarCardReporte(tarjetaInventario)}
          </div>
        </div>

        <div className="bloque-reportes-compacto">
          <h3>Bodegas</h3>
          <div className="grid-reportes-simple">
            {cargandoBodegas ? (
              <p>Cargando bodegas...</p>
            ) : (
              tarjetasBodegas.map(renderizarCardReporte)
            )}
          </div>
        </div>

        <div className="bloque-reportes-compacto">
          <h3>Sucursales</h3>
          <div className="grid-reportes-simple">
            {cargandoBodegas ? (
              <p>Cargando sucursales...</p>
            ) : (
              tarjetasSucursales.map(renderizarCardReporte)
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ReportesAdmin;
