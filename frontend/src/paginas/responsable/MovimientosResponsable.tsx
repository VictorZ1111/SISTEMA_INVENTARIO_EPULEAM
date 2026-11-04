import {
  ArrowDownAZ,
  ArrowUpAZ,
  Paintbrush,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import TablaBase from "../../componentes/TablaBase";
import CampoDesplegable from "../../componentes/CampoDesplegable";
import SelectorFechaFiltro from "../../componentes/SelectorFechaFiltro";

import { useAuth } from "../../contexto/AuthContext";
import { obtenerBodegasAccesoUsuario } from "../../dominio/bodegas";
import { useInventario } from "../../contexto/InventarioContext";
import type { Movimiento, TipoMovimiento } from "../../tipos/movimiento";

type FiltroTipoMovimiento =
  | "todos"
  | "transferencia"
  | "modificacion"
  | "baja";
type OrdenMovimientos = "recientes" | "antiguos" | "az" | "za";

function limpiarNombreBodega(bodega: string) {
  if (bodega === "EPULEAM EP") return "Inventario General";
  return bodega.replace(/^Bodega\s+/i, "");
}

function normalizarTexto(etiqueta: string) {
  return etiqueta
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^bodega\s+/i, "")
    .replace(/\s+/g, " ");
}

function normalizarTipoMovimiento(
  tipo: TipoMovimiento,
): FiltroTipoMovimiento | "entrada" | "modificacion" {
  if (tipo === "salida") return "transferencia";
  if (tipo === "ajuste") return "modificacion";
  if (tipo === "entrada") return "entrada";
  if (tipo === "modificacion") return "modificacion";
  if (tipo === "baja") return "baja";
  if (tipo === "transferencia") return "transferencia";
  return "transferencia";
}

function obtenerTextoMovimiento(tipo: TipoMovimiento) {
  const tipoNormalizado = normalizarTipoMovimiento(tipo);

  if (tipoNormalizado === "transferencia") return "Transferencia";
  if (tipoNormalizado === "entrada") return "Entrada";
  if (tipoNormalizado === "baja") return "Baja";
  if (tipoNormalizado === "modificacion") return "Modificación";
  return "Movimiento";
}


function limpiarObservacionMovimiento(observacion: string) {
  const texto = observacion.trim();

  if (!texto) return "Sin observación";

  return (
    texto
      .replace(/^Reversi[oó]n\s+de\s+atenci[oó]n\s+de\s+solicitud\.\s*Motivo:\s*/i, "")
      .replace(/^Reversi[oó]n\s+de\s+rechazo\s+de\s+solicitud\.\s*Motivo:\s*/i, "")
      .replace(/^Reversi[oó]n\s+de\s+solicitud\.\s*Motivo:\s*/i, "")
      .replace(/^Reversi[oó]n\s+de\s+baja\.\s*Motivo:\s*/i, "")
      .replace(/^Reversi[oó]n\s+de\s+movimiento\.\s*Motivo:\s*/i, "")
      .replace(/^Motivo:\s*/i, "")
      .trim() || "Sin observación"
  );
}

function obtenerFechaIso(fecha: string) {
  const coincidencia = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
  if (coincidencia) return coincidencia[1];

  const fechaConvertida = new Date(fecha);
  if (Number.isNaN(fechaConvertida.getTime())) return "";

  const anio = fechaConvertida.getFullYear();
  const mes = String(fechaConvertida.getMonth() + 1).padStart(2, "0");
  const dia = String(fechaConvertida.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function obtenerFechaHoraOrden(movimiento: Movimiento) {
  const valorFecha = movimiento.createdAt || movimiento.fecha;
  const fechaConvertida = new Date(valorFecha);

  if (!Number.isNaN(fechaConvertida.getTime())) {
    return fechaConvertida.getTime();
  }

  return 0;
}

function formatearFechaMovimiento(fecha: string) {
  const fechaIso = obtenerFechaIso(fecha);
  if (!fechaIso) return fecha;

  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
}

function MovimientosResponsable() {
  const { usuarioActual } = useAuth();
  const { movimientos, productos } = useInventario();

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

  const movimientosUsuario = useMemo(() => {
    const bodegasNormalizadas = bodegasUsuario.map(normalizarTexto);
    return movimientos.filter((movimiento) => {
      const tipoNormalizado = normalizarTipoMovimiento(movimiento.tipo);

      if (tipoNormalizado === "entrada") {
        return false;
      }

      // El Responsable solo debe ver modificaciones vinculadas a sus
      // solicitudes; las ediciones administrativas de productos no se muestran.
      if (tipoNormalizado === "modificacion" && !movimiento.solicitudId) {
        return false;
      }

      const origen = normalizarTexto(movimiento.origen);
      const destino = normalizarTexto(movimiento.destino);

      return (
        bodegasNormalizadas.includes(origen) ||
        bodegasNormalizadas.includes(destino)
      );
    });
  }, [movimientos, bodegasUsuario]);

  const movimientosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    const filtrados = movimientosUsuario.filter((movimiento) => {
      const tipoNormalizado = normalizarTipoMovimiento(movimiento.tipo);
      const contenido = normalizarTexto(
        `${obtenerTextoMovimiento(movimiento.tipo)} ${movimiento.producto} ${movimiento.origen} ${movimiento.destino} ${movimiento.usuario} ${movimiento.observacion}`,
      );

      const coincideBusqueda = texto === "" || contenido.includes(texto);
      const coincideTipo =
        tipoFiltro === "todos" || tipoNormalizado === tipoFiltro;
      const coincideBodega =
        bodegaFiltro === "todas" ||
        normalizarTexto(movimiento.origen) === normalizarTexto(bodegaFiltro) ||
        normalizarTexto(movimiento.destino) === normalizarTexto(bodegaFiltro);
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

  return (
    <div className="pagina-admin pagina-responsable">
      <EncabezadoPagina
        titulo="Movimientos"
        descripcion="Consulta el historial relacionado con las bodegas asignadas a tu supervisión."
      />

      <section className="seccion-dashboard seccion-movimientos-sistema">
        <div className="seccion-dashboard-header solicitudes-header-simple">
          <div>
            <h2>Historial de movimientos</h2>
            <p>Solo se muestran movimientos vinculados con tus bodegas supervisadas.</p>
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
            className="filtro-tipo"
            valor={tipoFiltro}
            alCambiar={(valor) => setTipoFiltro(valor as FiltroTipoMovimiento)}
            opciones={[
              { valor: "todos", etiqueta: "Todos los tipos" },
              { valor: "transferencia", etiqueta: "Transferencias" },
              { valor: "modificacion", etiqueta: "Modificaciones" },
              { valor: "baja", etiqueta: "Bajas" },
            ]}
          />

          <CampoDesplegable
            className="filtro-bodega"
            valor={bodegaFiltro}
            alCambiar={setBodegaFiltro}
            opciones={[
              { valor: "todas", etiqueta: "Todas las bodegas" },
              ...bodegasUsuario.map((bodega) => ({
                valor: bodega,
                etiqueta: limpiarNombreBodega(bodega),
              })),
            ]}
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
            mensajeVacio="No existen movimientos para tus bodegas supervisadas"
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
                <span>Código del bien</span>
                <strong>{productoDetalle?.codigo || "No registrado"}</strong>
              </div>
              <div>
                <span>Código ULEAM</span>
                <strong>
                  {productoDetalle?.codigoUleam || "No registrado"}
                </strong>
              </div>
              <div>
                <span>Bien</span>
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
                  {limpiarObservacionMovimiento(detalleMovimiento.observacion)}
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
    </div>
  );
}

export default MovimientosResponsable;
