import axios from "axios";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  PackageMinus,
  Paintbrush,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  devolverStockSupervisorApi,
  distribuirStockSupervisorApi,
  obtenerMiStockSupervisorApi,
  type StockSupervisorItemApi,
} from "../../api/stockSupervisorApi";
import CampoDesplegable from "../../componentes/CampoDesplegable";
import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import TablaBase from "../../componentes/TablaBase";
import { useInventario } from "../../contexto/InventarioContext";

type FiltroTipo = "todos" | "consumible" | "no_consumible";
type FiltroEstado = "todos" | "bueno" | "regular" | "malo";
type OrdenStock = "asc" | "desc";
type TipoAccionStock = "asignar" | "devolver";

interface MensajeSistema {
  tipo: "exito" | "error";
  texto: string;
}

function obtenerNombreTipo(tipoProducto: string) {
  return tipoProducto === "consumible" ? "Consumible" : "No consumible";
}

function obtenerNombreEstado(estadoBien: string) {
  if (estadoBien === "bueno") return "Bueno";
  if (estadoBien === "regular") return "Medio";
  if (estadoBien === "malo") return "Malo";
  return "No registrado";
}

function obtenerAtributo(item: StockSupervisorItemApi) {
  if (item.producto.tipoProducto === "consumible") return "No aplica";

  return item.producto.empresa || item.producto.atributo || "No registrado";
}

function limpiarNombreBodega(nombre: string) {
  return nombre.replace(/^Bodega\s+/i, "").trim();
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
  return "No se pudo completar la operación de stock.";
}

function StockSupervisor() {
  const { recargarDatosInventario } = useInventario();
  const [stock, setStock] = useState<StockSupervisorItemApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("todos");
  const [ordenStock, setOrdenStock] = useState<OrdenStock>("asc");
  const [detalle, setDetalle] = useState<StockSupervisorItemApi | null>(null);
  const [itemAccion, setItemAccion] = useState<StockSupervisorItemApi | null>(
    null,
  );
  const [tipoAccion, setTipoAccion] = useState<TipoAccionStock | null>(null);
  const [cantidadAccion, setCantidadAccion] = useState("1");
  const [destinosSeleccionados, setDestinosSeleccionados] = useState<string[]>(
    [],
  );
  const [observacionAccion, setObservacionAccion] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensajeSistema, setMensajeSistema] = useState<MensajeSistema | null>(
    null,
  );

  const cargarStock = useCallback(async () => {
    try {
      setCargando(true);
      setError("");
      const data = await obtenerMiStockSupervisorApi();
      setStock(data);
    } catch (errorCarga) {
      setError(obtenerMensajeError(errorCarga));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarStock();
  }, [cargarStock]);

  const mostrarMensaje = (tipo: MensajeSistema["tipo"], texto: string) => {
    setMensajeSistema({ tipo, texto });

    window.setTimeout(() => {
      setMensajeSistema(null);
    }, 3200);
  };

  const categoriasDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          stock
            .map((item) => item.categoria)
            .filter((categoria) => categoria && categoria.trim()),
        ),
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    [stock],
  );

  const filtrosActivos =
    busqueda.trim() !== "" ||
    categoriaFiltro !== "todas" ||
    tipoFiltro !== "todos" ||
    estadoFiltro !== "todos" ||
    ordenStock !== "asc";

  const limpiarFiltros = () => {
    setBusqueda("");
    setCategoriaFiltro("todas");
    setTipoFiltro("todos");
    setEstadoFiltro("todos");
    setOrdenStock("asc");
  };

  const stockFiltrado = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    const filtrado = stock.filter((item) => {
      const coincideBusqueda =
        termino === "" ||
        [
          item.codigo,
          item.descripcion,
          item.categoria,
          item.producto.marca,
          item.producto.modelo,
          obtenerAtributo(item),
        ]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termino));

      const coincideCategoria =
        categoriaFiltro === "todas" || item.categoria === categoriaFiltro;

      const coincideTipo =
        tipoFiltro === "todos" || item.producto.tipoProducto === tipoFiltro;

      const coincideEstado =
        estadoFiltro === "todos" || item.producto.estadoBien === estadoFiltro;

      return (
        coincideBusqueda &&
        coincideCategoria &&
        coincideTipo &&
        coincideEstado
      );
    });

    return [...filtrado].sort((a, b) => {
      const comparacion = a.descripcion.localeCompare(b.descripcion, "es", {
        sensitivity: "base",
      });

      return ordenStock === "asc" ? comparacion : comparacion * -1;
    });
  }, [
    busqueda,
    categoriaFiltro,
    estadoFiltro,
    ordenStock,
    stock,
    tipoFiltro,
  ]);

  const abrirAsignacion = (item: StockSupervisorItemApi) => {
    setItemAccion(item);
    setTipoAccion("asignar");
    setCantidadAccion("1");
    setObservacionAccion("");
    setDestinosSeleccionados(
      item.destinos.length === 1 ? [item.destinos[0].id] : [],
    );
  };

  const abrirDevolucion = (item: StockSupervisorItemApi) => {
    setItemAccion(item);
    setTipoAccion("devolver");
    setCantidadAccion("1");
    setObservacionAccion("");
    setDestinosSeleccionados([]);
  };

  const cerrarAccion = () => {
    if (procesando) return;
    setItemAccion(null);
    setTipoAccion(null);
    setCantidadAccion("1");
    setDestinosSeleccionados([]);
    setObservacionAccion("");
  };

  const alternarDestino = (destinoId: string) => {
    setDestinosSeleccionados((actuales) =>
      actuales.includes(destinoId)
        ? actuales.filter((id) => id !== destinoId)
        : [...actuales, destinoId],
    );
  };

  const cantidadNumerica = Number(cantidadAccion);
  const cantidadValida =
    itemAccion !== null &&
    Number.isInteger(cantidadNumerica) &&
    cantidadNumerica > 0 &&
    cantidadNumerica <= itemAccion.cantidad;

  const repartoExacto =
    tipoAccion !== "asignar" ||
    (destinosSeleccionados.length > 0 &&
      cantidadValida &&
      cantidadNumerica % destinosSeleccionados.length === 0);

  const cantidadPorDestino =
    tipoAccion === "asignar" &&
    destinosSeleccionados.length > 0 &&
    cantidadValida &&
    repartoExacto
      ? cantidadNumerica / destinosSeleccionados.length
      : 0;

  const confirmarAccion = async (event: FormEvent) => {
    event.preventDefault();

    if (!itemAccion || !tipoAccion || procesando) return;

    if (!cantidadValida) {
      mostrarMensaje(
        "error",
        `Ingresa una cantidad entre 1 y ${itemAccion.cantidad}.`,
      );
      return;
    }

    if (tipoAccion === "asignar") {
      if (destinosSeleccionados.length === 0) {
        mostrarMensaje("error", "Selecciona al menos una bodega destino.");
        return;
      }

      if (!repartoExacto) {
        mostrarMensaje(
          "error",
          `La cantidad ${cantidadNumerica} debe poder dividirse exactamente entre ${destinosSeleccionados.length} bodegas.`,
        );
        return;
      }
    }

    try {
      setProcesando(true);

      if (tipoAccion === "asignar") {
        await distribuirStockSupervisorApi({
          productoId: itemAccion.productoId,
          bodegaStockId: itemAccion.bodegaStockId,
          bodegaDestinoIds: destinosSeleccionados,
          cantidadTotal: cantidadNumerica,
          observacion: observacionAccion.trim() || undefined,
        });
      } else {
        await devolverStockSupervisorApi({
          productoId: itemAccion.productoId,
          bodegaStockId: itemAccion.bodegaStockId,
          cantidad: cantidadNumerica,
          observacion: observacionAccion.trim() || undefined,
        });
      }

      await Promise.all([cargarStock(), recargarDatosInventario()]);

      setItemAccion(null);
      setTipoAccion(null);
      setCantidadAccion("1");
      setDestinosSeleccionados([]);
      setObservacionAccion("");

      mostrarMensaje(
        "exito",
        tipoAccion === "asignar"
          ? "Producto asignado correctamente."
          : "Producto devuelto al Inventario General correctamente.",
      );
    } catch (errorOperacion) {
      mostrarMensaje("error", obtenerMensajeError(errorOperacion));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="pagina-admin pagina-supervisor-inicio pagina-stock-supervisor">
      <EncabezadoPagina
        titulo="Productos en stock"
        descripcion="Productos entregados por el administrador que todavía no han sido distribuidos a una bodega final."
      />

      {mensajeSistema ? (
        <div
          className={`mensaje-flotante mensaje-flotante-${mensajeSistema.tipo}`}
        >
          {mensajeSistema.texto}
        </div>
      ) : null}

      <section className="seccion-dashboard stock-supervisor-seccion">
        <div className="seccion-dashboard-header solicitudes-header-simple stock-supervisor-encabezado">
          <div>
            <h2>Stock disponible</h2>
            <p>Revisa los productos pendientes antes de asignarlos o devolverlos.</p>
          </div>
        </div>

        <div className="responsable-filtros-inventario stock-supervisor-filtros">
          <div className="buscador-input-contenedor responsable-buscador">
            <Search size={18} />
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar bien..."
            />
          </div>

          <CampoDesplegable
            valor={categoriaFiltro}
            ariaLabel="Filtrar por categoría"
            className="filtro-categoria"
            onChange={setCategoriaFiltro}
            opciones={[
              { valor: "todas", texto: "Todas las categorías" },
              ...categoriasDisponibles.map((categoria) => ({
                valor: categoria,
                texto: categoria,
              })),
            ]}
          />

          <CampoDesplegable
            valor={tipoFiltro}
            ariaLabel="Filtrar por tipo"
            className="filtro-tipo"
            onChange={(valor) => setTipoFiltro(valor as FiltroTipo)}
            opciones={[
              { valor: "todos", texto: "Todo tipo" },
              { valor: "consumible", texto: "Consumible" },
              { valor: "no_consumible", texto: "No consumible" },
            ]}
          />

          <CampoDesplegable
            valor={estadoFiltro}
            ariaLabel="Filtrar por estado"
            className="filtro-estado"
            onChange={(valor) => setEstadoFiltro(valor as FiltroEstado)}
            opciones={[
              { valor: "todos", texto: "Todo estado" },
              { valor: "bueno", texto: "Bueno" },
              { valor: "regular", texto: "Medio" },
              { valor: "malo", texto: "Malo" },
            ]}
          />

          <button
            className="boton-filtro boton-filtro-icono"
            type="button"
            onClick={() =>
              setOrdenStock((actual) => (actual === "asc" ? "desc" : "asc"))
            }
            title={
              ordenStock === "asc" ? "Orden ascendente" : "Orden descendente"
            }
            aria-label={
              ordenStock === "asc" ? "Orden ascendente" : "Orden descendente"
            }
          >
            {ordenStock === "asc" ? (
              <ArrowDownAZ size={19} />
            ) : (
              <ArrowUpAZ size={19} />
            )}
          </button>

          <button
            className="boton-filtro boton-filtro-icono"
            type="button"
            onClick={limpiarFiltros}
            disabled={!filtrosActivos}
            title="Limpiar filtros"
            aria-label="Limpiar filtros"
          >
            <Paintbrush size={18} />
          </button>
        </div>

        {error ? (
          <div className="mensaje-flotante mensaje-flotante-error">{error}</div>
        ) : null}

        <div className="stock-supervisor-tabla-scroll">
          <TablaBase
            columnas={[
              "Código",
              "Bien",
              "Categoría",
              "Atributo",
              "Cantidad",
              "Estado",
              "Acciones",
            ]}
            mensajeVacio={
              cargando
                ? "Cargando productos en stock..."
                : filtrosActivos
                  ? "No hay productos que coincidan con los filtros."
                  : "No tienes productos pendientes en stock."
            }
          >
            {!cargando && stockFiltrado.length > 0
              ? stockFiltrado.map((item) => (
                  <tr key={item.existenciaId}>
                    <td>
                      <strong>{item.codigo}</strong>
                    </td>
                    <td>{item.descripcion}</td>
                    <td>{item.categoria}</td>
                    <td>{obtenerAtributo(item)}</td>
                    <td>
                      <strong>{item.cantidad}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge-bien badge-bien-${item.producto.estadoBien}`}
                      >
                        {obtenerNombreEstado(item.producto.estadoBien)}
                      </span>
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <button
                          className="boton-icono-tabla"
                          type="button"
                          title="Ver información"
                          onClick={() => setDetalle(item)}
                          style={{ fontWeight: 800 }}
                        >
                          !
                        </button>

                        <button
                          className="boton-icono-tabla"
                          type="button"
                          title="Asignar producto"
                          onClick={() => abrirAsignacion(item)}
                        >
                          <Send size={17} />
                        </button>

                        <button
                          className="boton-icono-tabla"
                          type="button"
                          title="Devolver al Inventario General"
                          onClick={() => abrirDevolucion(item)}
                        >
                          <PackageMinus size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </TablaBase>
        </div>
      </section>

      {detalle ? (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-detalle-producto modal-stock-supervisor-detalle">
            <div className="modal-header">
              <div>
                <h2>Información del bien</h2>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={() => setDetalle(null)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="detalle-producto-cabecera">
              <div className="detalle-producto-resumen">
                <div className="stock-supervisor-resumen-texto">
                  <h3>{detalle.descripcion}</h3>
                  <p>Código: {detalle.codigo}</p>
                </div>

                <span
                  className={`badge-bien badge-bien-${detalle.producto.estadoBien}`}
                >
                  {obtenerNombreEstado(detalle.producto.estadoBien)}
                </span>
              </div>
            </div>

            <div className="detalle-producto-grid stock-supervisor-detalle-grid">
              {[
                {
                  campo: "Tipo",
                  valor: obtenerNombreTipo(detalle.producto.tipoProducto),
                },
                {
                  campo: "Atributo",
                  valor: obtenerAtributo(detalle),
                },
                {
                  campo: "Cantidad en stock",
                  valor: String(detalle.cantidad),
                },
                {
                  campo: "Categoría",
                  valor: detalle.categoria,
                },
                {
                  campo: "Unidad",
                  valor: detalle.unidad || "No registrada",
                },
                {
                  campo: "Código ULEAM",
                  valor: detalle.producto.codigoUleam || "No registrado",
                },
                {
                  campo: "Marca",
                  valor: detalle.producto.marca || "No registrada",
                },
                {
                  campo: "Modelo",
                  valor: detalle.producto.modelo || "No registrado",
                },
                {
                  campo: "Serie",
                  valor: detalle.producto.serie || "No registrada",
                },
                {
                  campo: "Procedencia",
                  valor: detalle.producto.procedencia || "No registrada",
                },
              ].map((campo) => (
                <div key={campo.campo}>
                  <span>{campo.campo}</span>
                  <strong>{campo.valor}</strong>
                </div>
              ))}
            </div>

            <div className="modal-acciones modal-acciones-compactas stock-supervisor-modal-acciones">
              <button
                className="boton-secundario"
                type="button"
                onClick={() => setDetalle(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {itemAccion && tipoAccion ? (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-stock-supervisor-accion">
            <div className="modal-header">
              <div>
                <h2>
                  {tipoAccion === "asignar"
                    ? "Asignar producto"
                    : "Devolver producto"}
                </h2>
                <p>
                  {tipoAccion === "asignar"
                    ? "Distribuye el stock disponible hacia una o varias bodegas finales."
                    : "Devuelve al Inventario General una parte o todo el stock pendiente."}
                </p>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={cerrarAccion}
                disabled={procesando}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="formulario-modal" onSubmit={confirmarAccion}>
              <div className="stock-supervisor-accion-resumen">
                <div>
                  <span>Bien</span>
                  <strong>{itemAccion.descripcion}</strong>
                </div>
                <div>
                  <span>Código</span>
                  <strong>{itemAccion.codigo}</strong>
                </div>
                <div>
                  <span>Disponible</span>
                  <strong>{itemAccion.cantidad}</strong>
                </div>
              </div>

              <div className="grid-formulario stock-supervisor-accion-grid">
                <div className="campo-formulario">
                  <label>
                    {tipoAccion === "asignar"
                      ? "Cantidad total *"
                      : "Cantidad a devolver *"}
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={itemAccion.cantidad}
                    step="1"
                    value={cantidadAccion}
                    onChange={(event) => setCantidadAccion(event.target.value)}
                    disabled={procesando}
                  />
                </div>

                <div className="campo-formulario">
                  <label>Destino</label>
                  <div className="stock-supervisor-destino-fijo">
                    {tipoAccion === "devolver"
                      ? "Inventario General"
                      : destinosSeleccionados.length > 0
                        ? `${destinosSeleccionados.length} seleccionada${
                            destinosSeleccionados.length === 1 ? "" : "s"
                          }`
                        : "Selecciona una bodega"}
                  </div>
                </div>
              </div>

              {tipoAccion === "asignar" ? (
                <div className="campo-formulario campo-completo stock-supervisor-destinos-campo">
                  <label>Bodegas destino *</label>
                  <div className="stock-supervisor-destinos-lista">
                    {itemAccion.destinos.map((destino) => {
                      const seleccionado = destinosSeleccionados.includes(
                        destino.id,
                      );

                      return (
                        <label
                          className={`stock-supervisor-destino-opcion ${
                            seleccionado
                              ? "stock-supervisor-destino-opcion-activa"
                              : ""
                          }`}
                          key={destino.id}
                        >
                          <input
                            type="checkbox"
                            checked={seleccionado}
                            onChange={() => alternarDestino(destino.id)}
                            disabled={procesando}
                          />
                          <span>{limpiarNombreBodega(destino.nombre)}</span>
                        </label>
                      );
                    })}
                  </div>

                  {destinosSeleccionados.length > 1 && cantidadValida ? (
                    <div
                      className={`stock-supervisor-reparto ${
                        repartoExacto ? "" : "stock-supervisor-reparto-error"
                      }`}
                    >
                      {repartoExacto
                        ? `Se asignarán ${cantidadPorDestino} unidades a cada bodega.`
                        : `La cantidad ${cantidadNumerica} no se puede dividir exactamente entre ${destinosSeleccionados.length} bodegas.`}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="stock-supervisor-aviso-devolucion">
                  La devolución regresará el producto al Inventario General y
                  quedará registrada como movimiento de tipo Devolución.
                </div>
              )}

              <div className="campo-formulario campo-completo">
                <label>Observación</label>
                <textarea
                  rows={3}
                  maxLength={255}
                  placeholder={
                    tipoAccion === "asignar"
                      ? "Detalle adicional de la asignación"
                      : "Motivo o detalle de la devolución"
                  }
                  value={observacionAccion}
                  onChange={(event) => setObservacionAccion(event.target.value)}
                  disabled={procesando}
                />
              </div>

              <div className="modal-acciones stock-supervisor-accion-botones">
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={cerrarAccion}
                  disabled={procesando}
                >
                  Cancelar
                </button>

                <button
                  className="boton-principal"
                  type="submit"
                  disabled={
                    procesando ||
                    !cantidadValida ||
                    (tipoAccion === "asignar" &&
                      (destinosSeleccionados.length === 0 || !repartoExacto))
                  }
                >
                  {procesando
                    ? "Procesando..."
                    : tipoAccion === "asignar"
                      ? "Confirmar asignación"
                      : "Confirmar devolución"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StockSupervisor;
