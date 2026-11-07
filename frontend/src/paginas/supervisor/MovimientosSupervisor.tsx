import {
  ArrowDownAZ,
  ArrowUpAZ,
  FileText,
  Paintbrush,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import CampoDesplegable from "../../componentes/CampoDesplegable";
import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import TablaBase from "../../componentes/TablaBase";
import SelectorFechaFiltro from "../../componentes/SelectorFechaFiltro";

import { useAuth } from "../../contexto/AuthContext";
import { obtenerBodegasAccesoUsuario } from "../../dominio/bodegas";
import { LIMITE_REVERSA_MS } from "../../dominio/reversiones";
import {
  normalizarTipoMovimiento,
  obtenerTextoMovimiento,
} from "../../dominio/movimientos";
import { useInventario } from "../../contexto/InventarioContext";
import type { Movimiento } from "../../tipos/movimiento";
import { generarReporteMovimientoPdf } from "../../utilidades/reportesMovimientos";
import {
  formatearFechaMovimiento,
  obtenerFechaHoraOrden,
  obtenerFechaIso,
} from "../../utilidades/fechas";


type FiltroTipoMovimiento =
  | "todos"
  | "transferencia"
  | "baja"
  | "modificacion"
  | "devolucion";
type OrdenMovimientos = "recientes" | "antiguos" | "az" | "za";

function limpiarNombreBodega(bodega: string) {
  if (bodega === "EPULEAM EP") return "Inventario General";
  return bodega.replace(/^Bodega\s+/i, "");
}

function normalizarTexto(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^bodega\s+/i, "")
    .replace(/\s+/g, " ");
}

function obtenerAreaMovimientoStock(texto: string) {
  return normalizarTexto(texto).replace(/^productos en stock - /, "");
}

function esMovimientoModificacionDeSolicitud(movimiento: Movimiento) {
  const documento = movimiento.documento || "";
  const observacion = normalizarTexto(movimiento.observacion || "");

  return (
    /^REV-SOL-/i.test(documento) ||
    /^SOL-/i.test(documento) ||
    observacion.includes("solicitud") ||
    observacion.includes("atencion") ||
    observacion.includes("reversion")
  );
}

function limpiarObservacionMovimiento(observacion: string) {
  return observacion
    .replace(/^Reversi[oó]n\s+de\s+atenci[oó]n\s+de\s+solicitud\.\s*Motivo:\s*/i, "")
    .replace(/^Reversi[oó]n\s+de\s+solicitud\.\s*Motivo:\s*/i, "")
    .replace(/^Reversi[oó]n\s+de\s+rechazo\s+de\s+solicitud\.\s*Motivo:\s*/i, "")
    .replace(/^Motivo:\s*/i, "")
    .trim();
}


function MovimientosSupervisor() {
  const { usuarioActual } = useAuth();
  const { movimientos, productos, reversarMovimientoSolicitud } = useInventario();

  const bodegasUsuario = useMemo(
    () => obtenerBodegasAccesoUsuario(usuarioActual),
    [usuarioActual],
  );

  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipoMovimiento>("todos");
  const [bodegaFiltro, setBodegaFiltro] = useState("todas");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [orden, setOrden] = useState<OrdenMovimientos>("recientes");
  const [detalleMovimiento, setDetalleMovimiento] = useState<Movimiento | null>(
    null,
  );
  const [movimientoReversar, setMovimientoReversar] =
    useState<Movimiento | null>(null);
  const [motivoReversion, setMotivoReversion] = useState("");
  const [mensajeSistema, setMensajeSistema] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);

  const movimientosUsuario = useMemo(() => {
    const bodegasNormalizadas = bodegasUsuario.map(normalizarTexto);

    return movimientos.filter((movimiento) => {
      const tipoNormalizado = normalizarTipoMovimiento(movimiento.tipo);

      if (tipoNormalizado === "entrada") {
        return false;
      }

      if (
        tipoNormalizado === "modificacion" &&
        !esMovimientoModificacionDeSolicitud(movimiento) &&
        !movimiento.movimientoOriginalId
      ) {
        return false;
      }

      const origen = normalizarTexto(movimiento.origen);
      const destino = normalizarTexto(movimiento.destino);
      const areaStock = obtenerAreaMovimientoStock(movimiento.origen);

      return (
        bodegasNormalizadas.includes(origen) ||
        bodegasNormalizadas.includes(destino) ||
        bodegasNormalizadas.includes(areaStock)
      );
    });
  }, [movimientos, bodegasUsuario]);

  const movimientosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    const filtrados = movimientosUsuario.filter((movimiento) => {
      const tipoNormalizado = normalizarTipoMovimiento(movimiento.tipo);
      const contenido = normalizarTexto(
        `${obtenerTextoMovimiento(movimiento.tipo)} ${movimiento.producto} ${movimiento.origen} ${movimiento.destino} ${movimiento.usuario} ${limpiarObservacionMovimiento(movimiento.observacion || "")}`,
      );

      const coincideBusqueda = texto === "" || contenido.includes(texto);
      const coincideTipo =
        tipoFiltro === "todos" || tipoNormalizado === tipoFiltro;
      const coincideBodega =
        bodegaFiltro === "todas" ||
        normalizarTexto(movimiento.origen) === normalizarTexto(bodegaFiltro) ||
        normalizarTexto(movimiento.destino) === normalizarTexto(bodegaFiltro) ||
        obtenerAreaMovimientoStock(movimiento.origen) ===
          normalizarTexto(bodegaFiltro);
      const coincideFecha =
        fechaFiltro === "" || obtenerFechaIso(movimiento.fecha) === fechaFiltro;

      return coincideBusqueda && coincideTipo && coincideBodega && coincideFecha;
    });

    return [...filtrados].sort((a, b) => {
      const comparacionAlfabetica = a.producto.localeCompare(b.producto, "es", {
        sensitivity: "base",
      });

      if (orden === "az") {
        return comparacionAlfabetica || obtenerFechaHoraOrden(b) - obtenerFechaHoraOrden(a);
      }

      if (orden === "za") {
        return comparacionAlfabetica * -1 || obtenerFechaHoraOrden(b) - obtenerFechaHoraOrden(a);
      }

      const comparacionFechaHora = obtenerFechaHoraOrden(b) - obtenerFechaHoraOrden(a);

      if (comparacionFechaHora !== 0) {
        return orden === "recientes"
          ? comparacionFechaHora
          : comparacionFechaHora * -1;
      }

      return comparacionAlfabetica;
    });
  }, [
    movimientosUsuario,
    busqueda,
    tipoFiltro,
    bodegaFiltro,
    fechaFiltro,
    orden,
  ]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setTipoFiltro("todos");
    setBodegaFiltro("todas");
    setFechaFiltro("");
    setOrden("recientes");
  };

  const filtrosActivos =
    busqueda.trim() !== "" ||
    tipoFiltro !== "todos" ||
    bodegaFiltro !== "todas" ||
    fechaFiltro !== "" ||
    orden !== "recientes";

  const obtenerProductoMovimiento = (movimiento: Movimiento) => {
    return productos.find(
      (producto) =>
        String(producto.id) === movimiento.productoId ||
        normalizarTexto(producto.descripcion) ===
          normalizarTexto(movimiento.producto) ||
        normalizarTexto(producto.codigo) ===
          normalizarTexto(movimiento.producto),
    );
  };

  const productoDetalle = detalleMovimiento
    ? obtenerProductoMovimiento(detalleMovimiento)
    : undefined;

  const movimientoEstaDentroDeTiempo = (movimiento: Movimiento) => {
    const fecha = new Date(movimiento.createdAt || movimiento.fecha).getTime();
    if (Number.isNaN(fecha)) return false;
    return Date.now() - fecha <= LIMITE_REVERSA_MS;
  };

  const movimientoYaFueReversado = (movimiento: Movimiento) =>
    movimientos.some(
      (item) => item.movimientoOriginalId === String(movimiento.id),
    );

  const esMovimientoConReversa = (movimiento: Movimiento) => {
    const tipo = normalizarTipoMovimiento(movimiento.tipo);
    return (
      (tipo === "transferencia" ||
        tipo === "devolucion" ||
        tipo === "baja") &&
      movimiento.cantidad > 0
    );
  };

  const puedeReversarMovimiento = (movimiento: Movimiento) =>
    esMovimientoConReversa(movimiento) &&
    movimientoEstaDentroDeTiempo(movimiento) &&
    !movimientoYaFueReversado(movimiento);

  const obtenerTituloReversionMovimiento = (movimiento: Movimiento) => {
    if (!esMovimientoConReversa(movimiento)) {
      return "Este movimiento no requiere reversión";
    }
    if (movimientoYaFueReversado(movimiento)) {
      return "Este movimiento ya fue reversado";
    }
    if (!movimientoEstaDentroDeTiempo(movimiento)) {
      return "Tiempo vencido: solo se puede reversar durante 3 horas";
    }
    return "Reversar movimiento";
  };

  const mostrarMensaje = (tipo: "exito" | "error", texto: string) => {
    setMensajeSistema({ tipo, texto });
    window.setTimeout(() => setMensajeSistema(null), 3000);
  };

  const confirmarReversionMovimiento = async () => {
    if (!movimientoReversar) return;

    const resultado = await reversarMovimientoSolicitud(
      movimientoReversar.id,
      motivoReversion,
    );

    if (!resultado.exito) {
      mostrarMensaje("error", resultado.mensaje);
      return;
    }

    setMovimientoReversar(null);
    setMotivoReversion("");
    mostrarMensaje("exito", resultado.mensaje);
  };

  return (
    <div className="pagina-admin pagina-responsable">
      {mensajeSistema ? (
        <div className={`mensaje-flotante mensaje-flotante-${mensajeSistema.tipo}`}>
          {mensajeSistema.texto}
        </div>
      ) : null}

      <EncabezadoPagina
        titulo="Movimientos"
        descripcion="Consulta el historial relacionado con tus bodegas asignadas."
      />

      <section className="seccion-dashboard seccion-movimientos-sistema">
        <div className="seccion-dashboard-header solicitudes-header-simple">
          <div>
            <h2>Historial de movimientos</h2>
            <p>Solo se muestran movimientos vinculados con tus bodegas.</p>
          </div>
        </div>

        <div className="movimientos-filtros movimientos-filtros-rol">
          <div className="buscador-input-contenedor movimientos-buscador">
            <Search size={18} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar movimiento..."
            />
          </div>

          <CampoDesplegable
            valor={tipoFiltro}
            alCambiar={(valor) => setTipoFiltro(valor as FiltroTipoMovimiento)}
            ariaLabel="Filtrar por tipo"
            opciones={[
              { valor: "todos", texto: "Todos los tipos" },
              { valor: "transferencia", texto: "Transferencias" },
              { valor: "devolucion", texto: "Devoluciones" },
              { valor: "modificacion", texto: "Modificaciones" },
              { valor: "baja", texto: "Bajas" },
            ]}
            anchoMinimo={210}
          />

          <CampoDesplegable
            valor={bodegaFiltro}
            alCambiar={setBodegaFiltro}
            ariaLabel="Filtrar por bodega"
            opciones={[
              { valor: "todas", texto: "Todas mis bodegas" },
              ...bodegasUsuario.map((bodega) => ({
                valor: bodega,
                texto: limpiarNombreBodega(bodega),
              })),
            ]}
            anchoMinimo={230}
          />

          <SelectorFechaFiltro
            valor={fechaFiltro}
            alCambiar={setFechaFiltro}
            ariaLabel="Filtrar movimientos por fecha"
          />

          <CampoDesplegable
            valor={orden}
            alCambiar={(valor) => setOrden(valor as OrdenMovimientos)}
            opciones={[
              { valor: "recientes", texto: "Más recientes" },
              { valor: "antiguos", texto: "Más antiguos" },
              { valor: "az", texto: "A → Z" },
              { valor: "za", texto: "Z → A" },
            ]}
            ariaLabel="Ordenar movimientos"
            icono={orden === "za" ? ArrowUpAZ : ArrowDownAZ}
            ancho={190}
          />

          <button
            className="boton-filtro boton-filtro-icono"
            type="button"
            title="Limpiar filtros"
            disabled={!filtrosActivos}
            onClick={limpiarFiltros}
          >
            <Paintbrush size={18} />
          </button>
        </div>

        <div className="movimientos-tabla-rol-scroll">
          <TablaBase
            columnas={[
              "Tipo",
              "Registro",
              "Origen",
              "Destino",
              "Cantidad",
              "Atributo",
              "Fecha",
              "Acciones",
            ]}
            mensajeVacio="No existen movimientos para tus bodegas"
          >
            {movimientosFiltrados.length > 0
              ? movimientosFiltrados.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td>
                      <span
                        className={`badge-movimiento badge-movimiento-${normalizarTipoMovimiento(movimiento.tipo)}`}
                      >
                        {obtenerTextoMovimiento(movimiento.tipo)}
                      </span>
                    </td>
                    <td>{movimiento.producto}</td>
                    <td>{limpiarNombreBodega(movimiento.origen)}</td>
                    <td>{limpiarNombreBodega(movimiento.destino)}</td>
                    <td>{movimiento.cantidad}</td>
                    <td>
                      {productos.find(
                        (producto) =>
                          normalizarTexto(producto.descripcion) ===
                          normalizarTexto(movimiento.producto)
                      )?.tipoProducto === "no_consumible"
                        ? productos.find(
                            (producto) =>
                              normalizarTexto(producto.descripcion) ===
                              normalizarTexto(movimiento.producto)
                          )?.empresa || "No registrado"
                        : "No aplica"}
                    </td>
                    <td className="celda-fecha-movimiento">{formatearFechaMovimiento(movimiento.fecha)}</td>
                    <td>
                      <div className="acciones-tabla acciones-movimientos-rol">
                        <button
                          className="boton-icono-tabla boton-icono-alerta"
                          type="button"
                          title="Ver detalle"
                          onClick={() => setDetalleMovimiento(movimiento)}
                        >
                          !
                        </button>
                        <button
                          className="boton-icono-tabla"
                          type="button"
                          title="Generar reporte PDF"
                          onClick={() => generarReporteMovimientoPdf(movimiento)}
                        >
                          <FileText size={18} />
                        </button>

                        {esMovimientoConReversa(movimiento) ? (
                          <button
                            className="boton-icono-tabla boton-icono-reversar"
                            type="button"
                            title={obtenerTituloReversionMovimiento(movimiento)}
                            disabled={!puedeReversarMovimiento(movimiento)}
                            onClick={() => {
                              setMovimientoReversar(movimiento);
                              setMotivoReversion("");
                            }}
                          >
                            <RotateCcw size={17} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </TablaBase>
        </div>
      </section>

      {detalleMovimiento && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-detalle-movimiento modal-responsable-detalle">
            <div className="modal-header">
              <div>
                <h2>Detalle del movimiento</h2>
                <p>Información registrada en el historial del sistema.</p>
              </div>

              <div className="modal-solicitud-header-acciones">
                <span
                  className={`badge-movimiento badge-movimiento-${normalizarTipoMovimiento(detalleMovimiento.tipo)}`}
                >
                  {obtenerTextoMovimiento(detalleMovimiento.tipo)}
                </span>
                <button
                  className="modal-cerrar"
                  type="button"
                  onClick={() => setDetalleMovimiento(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="detalle-producto-grid detalle-solicitud-grid-mejorada">
              <div>
                <span>Código del producto</span>
                <strong>{productoDetalle?.codigo || "No registrado"}</strong>
              </div>
              <div>
                <span>Código ULEAM</span>
                <strong>
                  {productoDetalle?.codigoUleam || "No registrado"}
                </strong>
              </div>
              <div>
                <span>Producto</span>
                <strong>{detalleMovimiento.producto}</strong>
              </div>
              <div>
                <span>Cantidad</span>
                <strong>{detalleMovimiento.cantidad}</strong>
              </div>
              <div>
                <span>Origen</span>
                <strong>{limpiarNombreBodega(detalleMovimiento.origen)}</strong>
              </div>
              <div>
                <span>Destino</span>
                <strong>
                  {limpiarNombreBodega(detalleMovimiento.destino)}
                </strong>
              </div>
              <div>
                <span>Registra</span>
                <strong>{detalleMovimiento.usuario}</strong>
              </div>
              <div>
                <span>Fecha</span>
                <strong>{detalleMovimiento.fecha}</strong>
              </div>
              <div className="detalle-completo detalle-observacion-solicitud">
                <span>Observación</span>
                <strong>
                  {limpiarObservacionMovimiento(detalleMovimiento.observacion || "") || "Sin observación"}
                </strong>
              </div>
            </div>

            <div className="modal-acciones">
              <button
                className="boton-secundario"
                type="button"
                onClick={() => setDetalleMovimiento(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {movimientoReversar ? (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-confirmacion-solicitud modal-confirmacion-reversion">
            <div className="modal-header">
              <div>
                <h2>Reversar movimiento</h2>
                <p>Esta acción devolverá el producto a su ubicación anterior y dejará registro de la corrección.</p>
              </div>
              <button
                className="modal-cerrar"
                type="button"
                onClick={() => {
                  setMovimientoReversar(null);
                  setMotivoReversion("");
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="formulario-modal formulario-reversion-solicitud">
              <div className="detalle-producto-grid detalle-reversion-grid">
                <div className="detalle-producto-item">
                  <span>Bien</span>
                  <strong>{movimientoReversar.producto}</strong>
                </div>
                <div className="detalle-producto-item">
                  <span>Cantidad</span>
                  <strong>{movimientoReversar.cantidad}</strong>
                </div>
              </div>

              <div className="campo-formulario campo-completo">
                <label>Motivo de reversión *</label>
                <textarea
                  rows={3}
                  maxLength={255}
                  value={motivoReversion}
                  onChange={(event) => setMotivoReversion(event.target.value)}
                  placeholder="Escribe el motivo de la corrección"
                />
              </div>
            </div>

            <div className="modal-acciones">
              <button
                className="boton-secundario"
                type="button"
                onClick={() => {
                  setMovimientoReversar(null);
                  setMotivoReversion("");
                }}
              >
                Cancelar
              </button>
              <button
                className="boton-principal"
                type="button"
                disabled={!motivoReversion.trim()}
                onClick={confirmarReversionMovimiento}
              >
                Confirmar reversión
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

export default MovimientosSupervisor;
