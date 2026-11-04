import {
  ArrowDownAZ,
  ArrowUpAZ,
  Paintbrush,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import CampoDesplegable from "../../componentes/CampoDesplegable";
import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import TablaBase from "../../componentes/TablaBase";

import { useAuth } from "../../contexto/AuthContext";
import { obtenerBodegasOperativasUsuario } from "../../dominio/bodegas";
import { useInventario } from "../../contexto/InventarioContext";
import type { EstadoSolicitud, ItemSolicitud, Solicitud } from "../../tipos/solicitud";
import type { Producto } from "../../tipos/producto";

type FiltroEstado = "todos" | "pendiente" | "parcial" | "atendida" | "rechazada";
type OrdenSolicitudes = "asc" | "desc";

interface ItemFormularioSolicitud {
  id: string;
  productoId: string | number;
  productoSolicitado: string;
  cantidad: number;
}

interface MensajeSistema {
  tipo: "exito" | "error";
  texto: string;
}

function normalizarTexto(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function limpiarNombreBodega(bodega: string) {
  return bodega.replace(/^Bodega\s+/i, "");
}


function limpiarTextoSolicitud(texto: string) {
  const textoLimpio = texto.trim();

  return textoLimpio
    .replace(/^solicitud\s+de\s+reposici[oó]n\s+de\s+/i, "")
    .replace(/^solicitud\s+de\s+/i, "")
    .replace(/^reposici[oó]n\s+de\s+/i, "")
    .trim();
}

function formatearTextoSolicitud(texto: string) {
  const textoLimpio = limpiarTextoSolicitud(texto);

  if (!textoLimpio) return texto.trim();

  return textoLimpio.charAt(0).toUpperCase() + textoLimpio.slice(1);
}

function obtenerDiaOrden(fecha: string) {
  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) return 0;

  return Date.UTC(
    fechaConvertida.getFullYear(),
    fechaConvertida.getMonth(),
    fechaConvertida.getDate()
  );
}

function obtenerItemsSolicitud(solicitud: Solicitud): ItemSolicitud[] {
  if (solicitud.items && solicitud.items.length > 0) {
    return solicitud.items.map((item, index) => ({
      ...item,
      id: item.id || `${solicitud.id}-${index}`,
      cantidad: Number(item.cantidad) || 1,
      cantidadEntregada: Number(item.cantidadEntregada) || 0,
      cantidadRechazada: Number(item.cantidadRechazada) || 0,
      productoSolicitado:
        item.productoSolicitado || solicitud.productoSolicitado || "No especificado",
    }));
  }

  return [
    {
      id: `${solicitud.id}-1`,
      productoId: solicitud.productoId,
      productoSolicitado:
        solicitud.productoSolicitado || solicitud.descripcion || "No especificado",
      cantidad: solicitud.cantidad || 1,
      cantidadEntregada: solicitud.cantidadEntregada || 0,
      cantidadRechazada: solicitud.cantidadRechazada || 0,
    },
  ];
}

function obtenerTextoEstado(estado: EstadoSolicitud) {
  if (estado === "parcial") return "Parcial";
  if (estado === "atendida") return "Atendida";
  if (estado === "rechazada") return "Rechazada";
  if (estado === "aprobada") return "Aceptada";
  return "Pendiente";
}

function obtenerClaseEstado(estado: EstadoSolicitud) {
  if (estado === "aprobada") return "atendida";
  return estado;
}

function obtenerAnioDesdeFecha(fecha: string) {
  const coincidencia = fecha.match(/^(\d{4})/);
  if (coincidencia) return coincidencia[1];

  const fechaConvertida = new Date(fecha);
  if (Number.isNaN(fechaConvertida.getTime())) return "";
  return String(fechaConvertida.getFullYear());
}

function obtenerProductoDisponible(productos: Producto[]) {
  return productos.filter((producto) => producto.estado === "activo");
}

function obtenerObservacionAdmin(solicitud: Solicitud) {
  return (solicitud as Solicitud & { observacionAdmin?: string }).observacionAdmin?.trim() || "";
}

function debeMostrarObservacionAdmin(solicitud: Solicitud) {
  const observacionAdmin = obtenerObservacionAdmin(solicitud);

  return (
    observacionAdmin !== "" &&
    ["parcial", "atendida", "rechazada"].includes(solicitud.estado)
  );
}

function SolicitudesSupervisor() {
  const { usuarioActual } = useAuth();
  const { solicitudes, productos, agregarSolicitud } = useInventario();

  const bodegasUsuario = useMemo(
    () => obtenerBodegasOperativasUsuario(usuarioActual),
    [usuarioActual]
  );

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("todos");
  const [bodegaFiltro, setBodegaFiltro] = useState("todas");
  const [anioFiltro, setAnioFiltro] = useState("todos");
  const [orden, setOrden] = useState<OrdenSolicitudes>("asc");
  const [modalNuevaSolicitud, setModalNuevaSolicitud] = useState(false);
  const [modalDetalle, setModalDetalle] = useState<Solicitud | null>(null);
  const [bodegaSolicitud, setBodegaSolicitud] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [tipoBienFiltro, setTipoBienFiltro] = useState<"todos" | "consumible" | "no_consumible">("todos");
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState("1");
  const [observacion, setObservacion] = useState("");
  const [itemsFormulario, setItemsFormulario] = useState<ItemFormularioSolicitud[]>([]);
  const [mensajeSistema, setMensajeSistema] = useState<MensajeSistema | null>(null);

  const solicitudesUsuario = useMemo(() => {
    return solicitudes.filter((solicitud) => {
      const coincideSolicitante = solicitud.solicitante === usuarioActual?.nombre;
      const coincideBodega = bodegasUsuario.includes(solicitud.bodega);
      return coincideSolicitante || coincideBodega;
    });
  }, [solicitudes, usuarioActual?.nombre, bodegasUsuario]);

  const aniosDisponibles = useMemo(() => {
    const anioActual = String(new Date().getFullYear());
    const anios = solicitudesUsuario
      .map((solicitud) => obtenerAnioDesdeFecha(solicitud.fecha))
      .filter((anio) => anio !== "");

    return Array.from(new Set([anioActual, ...anios])).sort(
      (a, b) => Number(b) - Number(a)
    );
  }, [solicitudesUsuario]);

  const solicitudesFiltradas = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    const filtradas = solicitudesUsuario.filter((solicitud) => {
      const items = obtenerItemsSolicitud(solicitud);
      const textoSolicitud = normalizarTexto(
        `${solicitud.descripcion} ${solicitud.bodega} ${solicitud.estado} ${items
          .map((item) => item.productoSolicitado)
          .join(" ")}`
      );

      const coincideBusqueda = texto === "" || textoSolicitud.includes(texto);
      const coincideEstado = estadoFiltro === "todos" || solicitud.estado === estadoFiltro;
      const coincideBodega = bodegaFiltro === "todas" || solicitud.bodega === bodegaFiltro;
      const coincideAnio =
        anioFiltro === "todos" || obtenerAnioDesdeFecha(solicitud.fecha) === anioFiltro;

      return coincideBusqueda && coincideEstado && coincideBodega && coincideAnio;
    });

    return [...filtradas].sort((a, b) => {
      const comparacionFecha = obtenerDiaOrden(b.fecha) - obtenerDiaOrden(a.fecha);

      if (comparacionFecha !== 0) return comparacionFecha;

      const comparacionAlfabetica = formatearTextoSolicitud(
        a.productoSolicitado
      ).localeCompare(formatearTextoSolicitud(b.productoSolicitado), "es", {
        sensitivity: "base",
      });

      return orden === "asc"
        ? comparacionAlfabetica
        : comparacionAlfabetica * -1;
    });
  }, [solicitudesUsuario, busqueda, estadoFiltro, bodegaFiltro, anioFiltro, orden]);

  const categoriasDisponibles = useMemo(() => {
    const categorias = obtenerProductoDisponible(productos)
      .map((producto) => producto.categoria)
      .filter((categoria) => categoria && categoria.trim() !== "");

    return Array.from(new Set(categorias)).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  }, [productos]);

  const productosDisponibles = useMemo(() => {
    const idsSeleccionados = new Set(itemsFormulario.map((item) => item.productoId));

    return obtenerProductoDisponible(productos).filter((producto) => {
      const coincideCategoria = categoriaSeleccionada
        ? producto.categoria === categoriaSeleccionada
        : false;
      const coincideTipo =
        tipoBienFiltro === "todos" || producto.tipoProducto === tipoBienFiltro;

      return coincideCategoria && coincideTipo && !idsSeleccionados.has(producto.id);
    });
  }, [productos, itemsFormulario, categoriaSeleccionada, tipoBienFiltro]);

  const mostrarMensaje = (tipo: MensajeSistema["tipo"], texto: string) => {
    setMensajeSistema({ tipo, texto });
    window.setTimeout(() => setMensajeSistema(null), 3000);
  };

  const abrirNuevaSolicitud = () => {
    setBodegaSolicitud(bodegasUsuario[0] || "");
    setCategoriaSeleccionada("");
    setTipoBienFiltro("todos");
    setProductoSeleccionado("");
    setCantidadSeleccionada("1");
    setObservacion("");
    setItemsFormulario([]);
    setModalNuevaSolicitud(true);
  };

  const cerrarNuevaSolicitud = () => {
    setModalNuevaSolicitud(false);
    setCategoriaSeleccionada("");
    setTipoBienFiltro("todos");
    setProductoSeleccionado("");
    setCantidadSeleccionada("1");
    setObservacion("");
    setItemsFormulario([]);
  };

  const agregarItemSolicitud = () => {
    const producto = productos.find((item) => String(item.id) === productoSeleccionado);
    const cantidad = Number(cantidadSeleccionada);

    if (!categoriaSeleccionada) {
      mostrarMensaje("error", "Selecciona primero una categoría.");
      return;
    }

    if (!producto) {
      mostrarMensaje("error", "Selecciona un bien para agregarlo a la solicitud.");
      return;
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      mostrarMensaje("error", "La cantidad solicitada debe ser mayor a cero.");
      return;
    }

    if (itemsFormulario.some((item) => item.productoId === producto.id)) {
      mostrarMensaje("error", "Este bien ya está agregado. Edita la cantidad en la tabla.");
      return;
    }

    setItemsFormulario((itemsActuales) => [
      ...itemsActuales,
      {
        id: `${Date.now()}-${producto.id}`,
        productoId: producto.id,
        productoSolicitado: producto.descripcion,
        cantidad,
      },
    ]);
    setProductoSeleccionado("");
    setCantidadSeleccionada("1");
  };

  const actualizarCantidadItem = (id: string, valor: string) => {
    const cantidad = Number(valor);

    setItemsFormulario((itemsActuales) =>
      itemsActuales.map((item) =>
        item.id === id
          ? {
              ...item,
              cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1,
            }
          : item
      )
    );
  };

  const quitarItemSolicitud = (id: string) => {
    setItemsFormulario((itemsActuales) =>
      itemsActuales.filter((item) => item.id !== id)
    );
  };

  const guardarSolicitud = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!usuarioActual) return;

    if (!bodegaSolicitud) {
      mostrarMensaje("error", "Selecciona la bodega para la solicitud.");
      return;
    }

    if (itemsFormulario.length === 0) {
      mostrarMensaje("error", "Agrega al menos un bien a la solicitud.");
      return;
    }

    const cantidadTotal = itemsFormulario.reduce(
      (total, item) => total + item.cantidad,
      0
    );

    const resultado = await agregarSolicitud({
      tipo: "producto",
      solicitante: usuarioActual.nombre,
      bodega: bodegaSolicitud,
      productoSolicitado:
        itemsFormulario.length === 1
          ? itemsFormulario[0].productoSolicitado
          : `${itemsFormulario.length} bienes solicitados`,
      cantidad: cantidadTotal,
      cantidadEntregada: 0,
      unidad: "",
      descripcion:
        observacion.trim() ||
        `Solicitud para ${limpiarNombreBodega(bodegaSolicitud)}.`,
      estado: "pendiente",
      items: itemsFormulario.map((item) => ({
        productoId: item.productoId,
        productoSolicitado: item.productoSolicitado,
        cantidad: item.cantidad,
        cantidadEntregada: 0,
      })),
    });

    if (!resultado.exito) {
      mostrarMensaje("error", resultado.mensaje);
      return;
    }

    cerrarNuevaSolicitud();
    mostrarMensaje("exito", resultado.mensaje);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setEstadoFiltro("todos");
    setBodegaFiltro("todas");
    setAnioFiltro("todos");
    setOrden("asc");
  };

  const filtrosActivos =
    busqueda.trim() !== "" ||
    estadoFiltro !== "todos" ||
    bodegaFiltro !== "todas" ||
    anioFiltro !== "todos" ||
    orden !== "asc";

  return (
    <div className="pagina-admin pagina-responsable">
      <EncabezadoPagina
        titulo="Solicitudes"
        descripcion="Crea solicitudes para tus bodegas asignadas y revisa su estado."
      />

      {mensajeSistema && (
        <div className={`mensaje-flotante mensaje-flotante-${mensajeSistema.tipo}`}>
          {mensajeSistema.texto}
        </div>
      )}

      <section className="seccion-dashboard">
        <div className="seccion-dashboard-header solicitudes-header-simple">
          <div>
            <h2>Mis solicitudes</h2>
            <p>Consulta pendientes, parciales, atendidas o rechazadas.</p>
          </div>

          <button
            className="boton-principal"
            type="button"
            onClick={abrirNuevaSolicitud}
            disabled={bodegasUsuario.length === 0}
          >
            <Plus size={18} />
            Nueva solicitud
          </button>
        </div>

        <div className="responsable-filtros">
          <div className="buscador-input-contenedor responsable-buscador">
            <Search size={18} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar solicitud..."
            />
          </div>

          <CampoDesplegable
            valor={estadoFiltro}
            alCambiar={(valor) => setEstadoFiltro(valor as FiltroEstado)}
            ariaLabel="Filtrar por estado"
            opciones={[
              { valor: "todos", texto: "Todos los estados" },
              { valor: "pendiente", texto: "Pendientes" },
              { valor: "parcial", texto: "Parciales" },
              { valor: "atendida", texto: "Atendidas" },
              { valor: "rechazada", texto: "Rechazadas" },
            ]}
            anchoMinimo={215}
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

          <CampoDesplegable
            valor={anioFiltro}
            alCambiar={setAnioFiltro}
            ariaLabel="Filtrar por año"
            opciones={[
              { valor: "todos", texto: "Todos los años" },
              ...aniosDisponibles.map((anio) => ({ valor: anio, texto: anio })),
            ]}
            anchoMinimo={190}
          />

          <button
            className="boton-filtro boton-filtro-icono"
            type="button"
            title={orden === "asc" ? "Orden A-Z dentro de cada fecha" : "Orden Z-A dentro de cada fecha"}
            onClick={() => setOrden((actual) => (actual === "asc" ? "desc" : "asc"))}
          >
            {orden === "asc" ? <ArrowDownAZ size={18} /> : <ArrowUpAZ size={18} />}
          </button>

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

        <div className="responsable-tabla-scroll solicitudes-rol-tabla-scroll">
          <TablaBase
            columnas={["Bien solicitado", "Cantidad", "Entregado", "Bodega", "Fecha", "Estado", "Acciones"]}
            mensajeVacio="No tienes solicitudes registradas"
          >
            {solicitudesFiltradas.length > 0
              ? solicitudesFiltradas.map((solicitud) => {
                  const items = obtenerItemsSolicitud(solicitud);
                  const cantidadTotal = items.reduce((total, item) => total + item.cantidad, 0);
                  const cantidadEntregada = items.reduce(
                    (total, item) => total + (item.cantidadEntregada || 0),
                    0
                  );

                  return (
                    <tr key={solicitud.id}>
                      <td>
                        <div className="celda-producto">
                          <strong>
                            {items.length === 1
                              ? items[0].productoSolicitado
                              : `${items.length} bienes solicitados`}
                          </strong>
                          <span>{solicitud.descripcion}</span>
                        </div>
                      </td>
                      <td>{cantidadTotal}</td>
                      <td>{cantidadEntregada}</td>
                      <td>{limpiarNombreBodega(solicitud.bodega)}</td>
                      <td>{solicitud.fecha}</td>
                      <td>
                        <span className={`badge-solicitud badge-solicitud-${obtenerClaseEstado(solicitud.estado)}`}>
                          {obtenerTextoEstado(solicitud.estado)}
                        </span>
                      </td>
                      <td>
                        <div className="acciones-tabla acciones-solicitudes">
                          <button
                            className="boton-icono-tabla boton-icono-alerta"
                            type="button"
                            title="Ver detalle"
                            onClick={() => setModalDetalle(solicitud)}
                          >
                            !
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              : null}
          </TablaBase>
        </div>
      </section>

      {modalNuevaSolicitud && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-responsable-solicitud modal-responsable-solicitud-amplio">
            <div className="modal-header">
              <div>
                <h2>Nueva solicitud</h2>
                <p>Selecciona una bodega y agrega los bienes que necesitas.</p>
              </div>
              <button className="modal-cerrar" type="button" onClick={cerrarNuevaSolicitud}>
                <X size={20} />
              </button>
            </div>

            <form className="formulario-modal" onSubmit={guardarSolicitud}>
              <div className="grid-formulario grid-formulario-responsable">
                <div className="campo-formulario">
                  <label>Bodega solicitante *</label>
                  <CampoDesplegable
                    valor={bodegaSolicitud}
                    alCambiar={setBodegaSolicitud}
                    ariaLabel="Seleccionar bodega solicitante"
                    opciones={bodegasUsuario.map((bodega) => ({
                      valor: bodega,
                      texto: limpiarNombreBodega(bodega),
                    }))}
                    mostrarIconoFiltro={false}
                    anchoMinimo={260}
                  />
                </div>

                <div className="campo-formulario">
                  <label>Categoría</label>
                  <CampoDesplegable
                    valor={categoriaSeleccionada}
                    alCambiar={(valor) => {
                      setCategoriaSeleccionada(valor);
                      setProductoSeleccionado("");
                    }}
                    placeholder="Selecciona una categoría"
                    ariaLabel="Seleccionar categoría"
                    opciones={[
                      { valor: "", texto: "Selecciona una categoría" },
                      ...categoriasDisponibles.map((categoria) => ({
                        valor: categoria,
                        texto: categoria,
                      })),
                    ]}
                    mostrarIconoFiltro={false}
                    anchoMinimo={230}
                  />
                </div>
              </div>

              <div className="solicitud-selector-bienes solicitud-selector-bienes-categoria">
                <div className="campo-formulario">
                  <label>Tipo de bien</label>
                  <CampoDesplegable
                    valor={tipoBienFiltro}
                    alCambiar={(valor) => {
                      setTipoBienFiltro(valor as "todos" | "consumible" | "no_consumible");
                      setProductoSeleccionado("");
                    }}
                    ariaLabel="Filtrar por tipo de bien"
                    opciones={[
                      { valor: "todos", texto: "Todos" },
                      { valor: "consumible", texto: "Consumible" },
                      { valor: "no_consumible", texto: "No consumible" },
                    ]}
                    mostrarIconoFiltro={false}
                    anchoMinimo={210}
                  />
                </div>

                <div className="campo-formulario">
                  <label>Bien a solicitar</label>
                  <CampoDesplegable
                    valor={productoSeleccionado}
                    alCambiar={setProductoSeleccionado}
                    placeholder={categoriaSeleccionada ? "Selecciona un bien" : "Primero selecciona una categoría"}
                    ariaLabel="Seleccionar bien"
                    opciones={[
                      {
                        valor: "",
                        texto: categoriaSeleccionada
                          ? "Selecciona un bien"
                          : "Primero selecciona una categoría",
                      },
                      ...productosDisponibles.map((producto) => ({
                        valor: String(producto.id),
                        texto: `${producto.descripcion} · ${
                          producto.tipoProducto === "no_consumible"
                            ? producto.empresa || "Sin atributo"
                            : "Consumible"
                        }`,
                      })),
                    ]}
                    mostrarIconoFiltro={false}
                    deshabilitado={!categoriaSeleccionada}
                    anchoMinimo={260}
                  />
                </div>

                <div className="campo-formulario">
                  <label>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidadSeleccionada}
                    onChange={(e) => setCantidadSeleccionada(e.target.value)}
                  />
                </div>

                <button
                  className="boton-principal boton-agregar-solo"
                  type="button"
                  onClick={agregarItemSolicitud}
                  title="Agregar bien"
                  aria-label="Agregar bien"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="tabla-card tabla-solicitud-items">
                <div className="tabla-contenedor">
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Bien</th>
                        <th>Atributo</th>
                        <th>Cantidad</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsFormulario.length > 0 ? (
                        itemsFormulario.map((item) => (
                          <tr key={item.id}>
                            <td>
                              {productos.find((producto) => producto.id === item.productoId)?.codigo || "S/C"}
                            </td>
                            <td>{item.productoSolicitado}</td>
                            <td>
                              {productos.find((producto) => producto.id === item.productoId)
                                ?.tipoProducto === "no_consumible"
                                ? productos.find((producto) => producto.id === item.productoId)
                                    ?.empresa || "No registrado"
                                : "No aplica"}
                            </td>
                            <td>
                              <input
                                className="input-cantidad-tabla"
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => actualizarCantidadItem(item.id, e.target.value)}
                              />
                            </td>
                            <td>
                              <button
                                className="boton-icono-tabla boton-icono-peligro"
                                type="button"
                                onClick={() => quitarItemSolicitud(item.id)}
                                title="Quitar bien"
                              >
                                <Trash2 size={17} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="tabla-vacia">
                            Agrega bienes para enviar la solicitud
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="campo-formulario campo-completo solicitud-observacion-final">
                <label>Observación</label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Detalle el motivo de la solicitud"
                />
              </div>

              <div className="modal-acciones">
                <button className="boton-secundario" type="button" onClick={cerrarNuevaSolicitud}>
                  Cancelar
                </button>
                <button className="boton-principal" type="submit">
                  Enviar solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalDetalle && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-responsable-detalle">
            <div className="modal-header">
              <div>
                <h2>Detalle de solicitud</h2>
                <p>Información del estado y entrega de tu solicitud.</p>
              </div>
              <div className="modal-solicitud-header-acciones">
                <span className={`badge-solicitud badge-solicitud-${obtenerClaseEstado(modalDetalle.estado)}`}>
                  {obtenerTextoEstado(modalDetalle.estado)}
                </span>
                <button className="modal-cerrar" type="button" onClick={() => setModalDetalle(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="detalle-producto-grid detalle-solicitud-grid-mejorada">
              <div>
                <span>Bodega</span>
                <strong>{limpiarNombreBodega(modalDetalle.bodega)}</strong>
              </div>
              <div>
                <span>Fecha</span>
                <strong>{modalDetalle.fecha}</strong>
              </div>
              <div>
                <span>Solicitante</span>
                <strong>{modalDetalle.solicitante}</strong>
              </div>
              <div className="detalle-completo detalle-observacion-solicitud">
                <span>Observación</span>
                <strong>{modalDetalle.descripcion}</strong>
              </div>

              {debeMostrarObservacionAdmin(modalDetalle) && (
                <div className="detalle-completo detalle-observacion-solicitud detalle-observacion-admin">
                  <span>Respuesta del administrador</span>
                  <strong>{obtenerObservacionAdmin(modalDetalle)}</strong>
                </div>
              )}
            </div>

            <div className="tabla-card tabla-solicitud-atencion tabla-solicitud-items-detalle">
              <div className="tabla-contenedor">
                <table>
                  <thead>
                    <tr>
                      <th>Bien solicitado</th>
                      <th>Atributo</th>
                      <th>Solicitado</th>
                      <th>Entregado</th>
                      <th>Rechazado</th>
                      <th>Pendiente</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obtenerItemsSolicitud(modalDetalle).map((item) => {
                      const pendiente = Math.max(
                        0,
                        item.cantidad -
                          (item.cantidadEntregada || 0) -
                          (item.cantidadRechazada || 0)
                      );
                      const cantidadEntregada = item.cantidadEntregada || 0;
                      const cantidadRechazada = item.cantidadRechazada || 0;
                      const estadoItem =
                        pendiente > 0
                          ? cantidadEntregada > 0
                            ? "Parcial"
                            : "Pendiente"
                          : cantidadRechazada > 0
                            ? "Rechazado"
                            : cantidadEntregada > 0
                              ? "Entregado"
                              : "Cerrado";

                      return (
                        <tr key={item.id || item.productoSolicitado}>
                          <td>{item.productoSolicitado}</td>
                          <td>
                            {productos.find((producto) => producto.id === item.productoId)
                              ?.tipoProducto === "no_consumible"
                              ? productos.find((producto) => producto.id === item.productoId)
                                  ?.empresa || "No registrado"
                              : "No aplica"}
                          </td>
                          <td>{item.cantidad}</td>
                          <td>{item.cantidadEntregada || 0}</td>
                          <td>{item.cantidadRechazada || 0}</td>
                          <td>{pendiente}</td>
                          <td>
                            <span
                              className={`badge-solicitud badge-solicitud-${
                                estadoItem === "Entregado"
                                  ? "atendida"
                                  : estadoItem === "Rechazado"
                                    ? "rechazada"
                                    : estadoItem === "Parcial"
                                      ? "parcial"
                                      : "pendiente"
                              }`}
                            >
                              {estadoItem}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SolicitudesSupervisor;
