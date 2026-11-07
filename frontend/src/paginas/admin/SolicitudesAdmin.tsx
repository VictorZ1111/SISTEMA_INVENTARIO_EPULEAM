import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  Paintbrush,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import { useMemo, useState } from "react";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";

import TablaBase from "../../componentes/TablaBase";

import CampoDesplegable from "../../componentes/CampoDesplegable";
import SelectorFechaFiltro from "../../componentes/SelectorFechaFiltro";

import { useInventario } from "../../contexto/InventarioContext";

import { useUsuarios } from "../../contexto/UsuariosContext";

import { LIMITE_REVERSA_MS } from "../../dominio/reversiones";

import { obtenerFechaIso } from "../../utilidades/fechas";

import type {
  EstadoSolicitud,
  ItemSolicitud,
  Solicitud,
} from "../../tipos/solicitud";

type FiltroEstadoSolicitud =
  | "todos"
  | "pendiente"
  | "parcial"
  | "atendida"
  | "rechazada";

type OrdenSolicitudes = "asc" | "desc";

interface MensajeSistema {
  tipo: "exito" | "error";
  texto: string;
}

interface ConfirmacionSolicitud {
  tipo: "rechazar" | "atender" | "reversar";
  titulo: string;
  mensaje: string;
}

interface ItemRevisionSolicitud extends ItemSolicitud {
  disponible: number;
  pendiente: number;
  cantidadAEntregar: number;
  productoIdDisponible?: string | number;
}

function obtenerClaseEstadoSolicitud(estado: EstadoSolicitud) {
  return estado;
}

function obtenerTextoEstado(estado: EstadoSolicitud) {
  if (estado === "aprobada") return "Aceptada";
  if (estado === "rechazada") return "Rechazada";
  if (estado === "atendida") return "Atendida";
  if (estado === "parcial") return "Parcial";
  return "Pendiente";
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

function normalizarTexto(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^solicitud\s+de\s+reposicion\s+de\s+/i, "")
    .replace(/^solicitud\s+de\s+/i, "")
    .replace(/^reposicion\s+de\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
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
      productoSolicitado:
        item.productoSolicitado || solicitud.productoSolicitado || "No especificado",
      cantidad: Number(item.cantidad) || solicitud.cantidad || 1,
      cantidadEntregada: Number(item.cantidadEntregada) || 0,
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

function SolicitudesAdmin() {
  const {
    solicitudes,
    productos,
    cambiarEstadoSolicitud,
    atenderSolicitud,
    reversarAtencionSolicitud,
    reversarRechazoSolicitud,
  } = useInventario();
  const { bodegasDisponibles } = useUsuarios();
  const [busqueda, setBusqueda] = useState("");
  const [bodegaFiltro, setBodegaFiltro] = useState("todas");
  const [estadoFiltro, setEstadoFiltro] =
    useState<FiltroEstadoSolicitud>("pendiente");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [ordenSolicitudes, setOrdenSolicitudes] =
    useState<OrdenSolicitudes>("asc");
  const [solicitudDetalle, setSolicitudDetalle] = useState<Solicitud | null>(
    null
  );
  const [itemsRevision, setItemsRevision] = useState<ItemRevisionSolicitud[]>([]);
  const [mensajeSistema, setMensajeSistema] =
    useState<MensajeSistema | null>(null);
  const [confirmacionSolicitud, setConfirmacionSolicitud] =
    useState<ConfirmacionSolicitud | null>(null);
  const [observacionAdmin, setObservacionAdmin] = useState("");
  const [mostrarObservacionAdmin, setMostrarObservacionAdmin] = useState(false);
  const [motivoReversion, setMotivoReversion] = useState("");
  const [solicitudReversion, setSolicitudReversion] = useState<Solicitud | null>(null);
  const bodegasFiltro = useMemo(() => {
    const bodegasBase = bodegasDisponibles
      .filter((bodega) => bodega.nombre !== "Inventario General")
      .map((bodega) => bodega.nombre);
    const bodegasSolicitudes = solicitudes.map((solicitud) => solicitud.bodega);
    return Array.from(new Set([...bodegasBase, ...bodegasSolicitudes])).sort(
      (a, b) => a.localeCompare(b, "es", { sensitivity: "base" })
    );
  }, [bodegasDisponibles, solicitudes]);
  const haySolicitudesPendientes = solicitudes.some(
    (solicitud) => solicitud.estado === "pendiente"
  );
  const haySolicitudesParciales = solicitudes.some(
    (solicitud) => solicitud.estado === "parcial"
  );
  const opcionesEstadoFiltro: { valor: FiltroEstadoSolicitud; texto: string; alerta: boolean }[] = [
    { valor: "pendiente", texto: "Pendientes", alerta: haySolicitudesPendientes },
    { valor: "parcial", texto: "Parciales", alerta: haySolicitudesParciales },
    { valor: "atendida", texto: "Atendidas", alerta: false },
    { valor: "rechazada", texto: "Rechazadas", alerta: false },
    { valor: "todos", texto: "Todas", alerta: false },
  ];
  const solicitudesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtradas = solicitudes.filter((solicitud) => {
      const items = obtenerItemsSolicitud(solicitud);
      const coincideBusqueda =
        texto === "" ||
        solicitud.solicitante.toLowerCase().startsWith(texto) ||
        solicitud.bodega.toLowerCase().startsWith(texto) ||
        items.some((item) =>
          formatearTextoSolicitud(item.productoSolicitado)
            .toLowerCase()
            .startsWith(texto)
        );
      const coincideBodega =
        bodegaFiltro === "todas" ? true : solicitud.bodega === bodegaFiltro;
      const coincideEstado =
        estadoFiltro === "todos" ? true : solicitud.estado === estadoFiltro;
      const coincideFecha =
        fechaFiltro === ""
          ? true
          : obtenerFechaIso(solicitud.fecha) === fechaFiltro;
      return coincideBusqueda && coincideBodega && coincideEstado && coincideFecha;
    });
    return [...filtradas].sort((a, b) => {
      const comparacionFecha = obtenerDiaOrden(b.fecha) - obtenerDiaOrden(a.fecha);
      if (comparacionFecha !== 0) return comparacionFecha;
      const comparacionAlfabetica = formatearTextoSolicitud(
        a.productoSolicitado
      ).localeCompare(formatearTextoSolicitud(b.productoSolicitado), "es", {
        sensitivity: "base",
      });
      return ordenSolicitudes === "asc"
        ? comparacionAlfabetica
        : comparacionAlfabetica * -1;
    });
  }, [
    solicitudes,
    busqueda,
    bodegaFiltro,
    estadoFiltro,
    fechaFiltro,
    ordenSolicitudes,
  ]);
  const mostrarMensaje = (tipo: MensajeSistema["tipo"], texto: string) => {
    setMensajeSistema({ tipo, texto });
    window.setTimeout(() => {
      setMensajeSistema(null);
    }, 3000);
  };
  const obtenerDisponibilidadItem = (item: ItemSolicitud) => {
    const productoDisponible = productos.find((producto) => {
      const coincideId = item.productoId ? producto.id === item.productoId : false;
      const coincideNombre =
        normalizarTexto(producto.descripcion).includes(
          normalizarTexto(item.productoSolicitado)
        ) ||
        normalizarTexto(item.productoSolicitado).includes(
          normalizarTexto(producto.descripcion)
        );
      const estaDisponible =
        producto.estado !== "inactivo" &&
        (!producto.ubicacion || producto.ubicacion === "Inventario General");
      return estaDisponible && (coincideId || coincideNombre);
    });
    return {
      productoIdDisponible: productoDisponible?.id,
      disponible: productoDisponible?.cantidad || 0,
    };
  };
  const prepararRevisionSolicitud = (solicitud: Solicitud) => {
    const items = obtenerItemsSolicitud(solicitud).map((item) => {
      const pendiente = Math.max(
        0,
        item.cantidad -
          (item.cantidadEntregada || 0) -
          (item.cantidadRechazada || 0)
      );
      const disponibilidad = obtenerDisponibilidadItem(item);
      const cantidadAEntregar = Math.min(pendiente, disponibilidad.disponible);
      return {
        ...item,
        pendiente,
        disponible: disponibilidad.disponible,
        productoIdDisponible: disponibilidad.productoIdDisponible,
        cantidadAEntregar,
      };
    });
    setItemsRevision(items);
    setSolicitudDetalle(solicitud);
    const observacionGuardada = (solicitud as Solicitud & { observacionAdmin?: string }).observacionAdmin || "";
    setObservacionAdmin(observacionGuardada);
    setMostrarObservacionAdmin(false);
    setMotivoReversion("");
  };
  const cerrarDetalle = () => {
    setSolicitudDetalle(null);
    setItemsRevision([]);
    setObservacionAdmin("");
    setMostrarObservacionAdmin(false);
  };
  const rechazarSolicitudDirecta = async (solicitud: Solicitud) => {
    if (
      solicitud.estado === "rechazada" ||
      solicitud.estado === "atendida" ||
      solicitud.pendientesRechazados
    ) return;
    const resultado = await cambiarEstadoSolicitud(
      solicitud.id,
      "rechazada",
      mostrarObservacionAdmin ? observacionAdmin.trim() : "",
    );
    if (!resultado.exito) {
      mostrarMensaje("error", resultado.mensaje);
      return;
    }
    cerrarDetalle();
    setConfirmacionSolicitud(null);
    mostrarMensaje(
      "exito",
      solicitud.estado === "parcial"
        ? "Se rechazó únicamente lo que seguía pendiente."
        : resultado.mensaje,
    );
  };
  const pedirConfirmacionRechazo = (solicitud: Solicitud) => {
    if (
      solicitud.estado === "rechazada" ||
      solicitud.estado === "atendida" ||
      solicitud.pendientesRechazados
    ) return;
    setConfirmacionSolicitud({
      tipo: "rechazar",
      titulo:
        solicitud.estado === "parcial"
          ? "Rechazar cantidades pendientes"
          : "Rechazar solicitud",
      mensaje:
        solicitud.estado === "parcial"
          ? "¿Seguro que deseas rechazar únicamente lo que sigue pendiente? Lo ya entregado permanecerá en la bodega."
          : "¿Seguro que deseas rechazar esta solicitud? Esta acción dejará constancia del rechazo.",
    });
  };
  const atenderDisponible = async () => {
    if (!solicitudDetalle) return;
    const entregas = itemsRevision
      .filter((item) => item.cantidadAEntregar > 0)
      .map((item) => ({
        itemId: item.id,
        productoId: item.productoId || item.productoIdDisponible,
        productoSolicitado: item.productoSolicitado,
        cantidad: item.cantidadAEntregar,
      }));
    const resultado = await atenderSolicitud(
      solicitudDetalle.id,
      entregas,
      mostrarObservacionAdmin ? observacionAdmin.trim() : ""
    );
    if (!resultado.exito) {
      mostrarMensaje("error", resultado.mensaje);
      return;
    }
    cerrarDetalle();
    setConfirmacionSolicitud(null);
    mostrarMensaje("exito", resultado.mensaje);
  };
  const pedirConfirmacionAtencion = () => {
    if (!solicitudDetalle || !puedeAtenderDisponible) return;
    setConfirmacionSolicitud({
      tipo: "atender",
      titulo: solicitudCompletaDisponible
        ? "Aceptar solicitud"
        : "Aceptar parcialmente",
      mensaje: solicitudCompletaDisponible
        ? "¿Seguro que deseas aceptar esta solicitud? Los bienes disponibles se enviarán al stock del Supervisor del área."
        : "¿Seguro que deseas atender parcialmente esta solicitud? Se enviará al stock del Supervisor solo lo disponible en Inventario General y quedará pendiente lo faltante.",
    });
  };
  const solicitudEstaDentroDeTiempo = (solicitud: Solicitud) => {
    if (!solicitud.atendidaAt || solicitud.reversada) return false;
    const fechaAtencion = new Date(solicitud.atendidaAt).getTime();
    if (Number.isNaN(fechaAtencion)) return false;
    return Date.now() - fechaAtencion <= LIMITE_REVERSA_MS;
  };
  const esSolicitudConReversa = (solicitud: Solicitud) => {
    if (solicitud.reversada) return false;
    if (solicitud.estado === "rechazada") return true;
    return (
      (solicitud.estado === "atendida" || solicitud.estado === "parcial") &&
      obtenerItemsSolicitud(solicitud).some(
        (item) => (item.cantidadEntregada || 0) > 0,
      )
    );
  };
  const puedeReversarSolicitud = (solicitud: Solicitud) =>
    esSolicitudConReversa(solicitud) && solicitudEstaDentroDeTiempo(solicitud);
  const obtenerTituloReversionSolicitud = (solicitud: Solicitud) => {
    if (solicitud.reversada) return "Esta solicitud ya fue reversada";
    if (!esSolicitudConReversa(solicitud)) {
      return "Esta solicitud no requiere reversión";
    }
    if (!solicitudEstaDentroDeTiempo(solicitud)) {
      return "Tiempo vencido: solo se puede reversar durante 3 horas";
    }
    return solicitud.estado === "rechazada"
      ? "Reversar rechazo"
      : "Reversar atención";
  };
  const pedirConfirmacionReversion = (solicitud: Solicitud) => {
    if (!puedeReversarSolicitud(solicitud)) return;
    setSolicitudReversion(solicitud);
    setMotivoReversion("");
    setConfirmacionSolicitud({
      tipo: "reversar",
      titulo: solicitud.estado === "rechazada" ? "Reversar rechazo" : "Reversar atención",
      mensaje:
        solicitud.estado === "rechazada"
          ? "Esta acción devolverá la solicitud a pendiente y registrará la corrección como modificación."
          : "Esta acción reversará la atención de la solicitud, la devolverá a pendiente y registrará la corrección como modificación.",
    });
  };
  const cerrarConfirmacion = () => {
    setConfirmacionSolicitud(null);
    setSolicitudReversion(null);
    setMotivoReversion("");
  };
  const confirmarReversion = async () => {
    if (!solicitudReversion) return;
    const resultado =
      solicitudReversion.estado === "rechazada"
        ? await reversarRechazoSolicitud(solicitudReversion.id, motivoReversion)
        : await reversarAtencionSolicitud(solicitudReversion.id, motivoReversion);
    if (!resultado.exito) {
      mostrarMensaje("error", resultado.mensaje);
      return;
    }
    if (solicitudDetalle?.id === solicitudReversion.id) {
      cerrarDetalle();
    }
    setConfirmacionSolicitud(null);
    setSolicitudReversion(null);
    setMotivoReversion("");
    mostrarMensaje("exito", resultado.mensaje);
  };
  const limpiarFiltros = () => {
    setBusqueda("");
    setBodegaFiltro("todas");
    setEstadoFiltro("pendiente");
    setFechaFiltro("");
    setOrdenSolicitudes("asc");
  };
  const filtrosActivos =
    busqueda.trim() !== "" ||
    bodegaFiltro !== "todas" ||
    estadoFiltro !== "pendiente" ||
    fechaFiltro !== "" ||
    ordenSolicitudes !== "asc";
  const itemsPendientes = itemsRevision.filter((item) => item.pendiente > 0);
  const puedeAtenderDisponible = itemsPendientes.some(
    (item) => item.cantidadAEntregar > 0
  );
  const solicitudCompletaDisponible =
    itemsPendientes.length > 0 &&
    itemsPendientes.every((item) => item.cantidadAEntregar >= item.pendiente);
  const textoBotonAtencion = solicitudCompletaDisponible
    ? "Aceptar solicitud"
    : puedeAtenderDisponible
      ? "Aceptar parcialmente"
      : "Sin stock disponible";
  const solicitudConfirmacion =
    confirmacionSolicitud?.tipo === "reversar"
      ? solicitudReversion
      : solicitudDetalle;
  return (
    <div className="pagina-admin">
      <EncabezadoPagina
        titulo="Solicitudes"
        descripcion="Revisa y gestiona las solicitudes enviadas por los supervisores de bodega."
      />
      {mensajeSistema && (
        <div className={`mensaje-flotante mensaje-flotante-${mensajeSistema.tipo}`}>
          {mensajeSistema.texto}
        </div>
      )}
      <section className="seccion-dashboard">
        <div className="seccion-dashboard-header solicitudes-header-simple">
          <div>
            <h2>Listado de solicitudes</h2>
            <p>
              El administrador revisa disponibilidad, atiende entregas parciales o completa solicitudes.
            </p>
          </div>
        </div>
        <div className="solicitudes-filtros">
          <div className="buscador-input-contenedor solicitudes-buscador">
            <Search size={18} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar solicitud..."
            />
          </div>
          <CampoDesplegable
            valor={bodegaFiltro}
            alCambiar={setBodegaFiltro}
            opciones={[
              { valor: "todas", texto: "Todas las bodegas" },
              ...bodegasFiltro.map((bodega) => ({
                valor: bodega,
                texto: bodega.replace("Bodega ", ""),
              })),
            ]}
            ariaLabel="Filtrar por bodega"
            ancho={240}
          />
          <CampoDesplegable
            valor={estadoFiltro}
            alCambiar={(valor) => setEstadoFiltro(valor as FiltroEstadoSolicitud)}
            opciones={opcionesEstadoFiltro}
            ariaLabel="Filtrar por estado"
            ancho={230}
          />
          <SelectorFechaFiltro
            valor={fechaFiltro}
            alCambiar={setFechaFiltro}
            ariaLabel="Filtrar por fecha"
            className="solicitudes-fecha-selector"
          />
          <button
            className="boton-filtro boton-filtro-icono"
            type="button"
            title={ordenSolicitudes === "asc" ? "Orden A-Z" : "Orden Z-A"}
            onClick={() =>
              setOrdenSolicitudes((ordenActual) =>
                ordenActual === "asc" ? "desc" : "asc"
              )
            }
          >
            {ordenSolicitudes === "asc" ? (
              <ArrowDownAZ size={18} />
            ) : (
              <ArrowUpAZ size={18} />
            )}
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
        <div className="solicitudes-tabla-scroll">
          <TablaBase
            columnas={[
            "Bien solicitado",
            "Cantidad",
            "Entregado",
            "Solicitante",
            "Bodega",
            "Fecha",
            "Estado",
            "Acciones",
          ]}
          mensajeVacio="No existen solicitudes registradas"
        >
          {solicitudesFiltradas.length > 0
            ? solicitudesFiltradas.map((solicitud) => {
                const items = obtenerItemsSolicitud(solicitud);
                const cantidadTotal = items.reduce(
                  (total, item) => total + item.cantidad,
                  0
                );
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
                            ? formatearTextoSolicitud(items[0].productoSolicitado)
                            : `${items.length} bienes solicitados`}
                        </strong>
                      </div>
                    </td>
                    <td>{cantidadTotal}</td>
                    <td>{cantidadEntregada}</td>
                    <td>{solicitud.solicitante}</td>
                    <td>{solicitud.bodega.replace("Bodega ", "")}</td>
                    <td>{solicitud.fecha}</td>
                    <td>
                      <span
                        className={`badge-solicitud badge-solicitud-${obtenerClaseEstadoSolicitud(solicitud.estado)}`}
                      >
                        {obtenerTextoEstado(solicitud.estado)}
                      </span>
                    </td>
                    <td>
                      <div className="acciones-tabla acciones-solicitudes">
                        <button
                          className="boton-icono-tabla boton-icono-alerta"
                          type="button"
                          title={
                            (solicitud.estado === "pendiente" || solicitud.estado === "parcial") &&
                            !solicitud.pendientesRechazados
                              ? "Revisar y atender solicitud"
                              : "Ver información de la solicitud"
                          }
                          onClick={() => prepararRevisionSolicitud(solicitud)}
                        >
                          !
                        </button>
                        {esSolicitudConReversa(solicitud) && (
                          <button
                            className="boton-icono-tabla boton-icono-reversar"
                            type="button"
                            title={obtenerTituloReversionSolicitud(solicitud)}
                            disabled={!puedeReversarSolicitud(solicitud)}
                            onClick={() => pedirConfirmacionReversion(solicitud)}
                          >
                            <RotateCcw size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            : null}
          </TablaBase>
        </div>
      </section>
      {solicitudDetalle && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-solicitud-detalle modal-solicitud-atencion">
            <div className="modal-header">
              <div>
                <h2>Solicitud</h2>
                <p>
                  El disponible corresponde al Inventario General. Al atender, los bienes se enviarán al stock del Supervisor del área correspondiente.
                </p>
              </div>
              <div className="modal-solicitud-header-acciones">
                <span
                  className={`badge-solicitud badge-solicitud-${obtenerClaseEstadoSolicitud(solicitudDetalle.estado)}`}
                >
                  {obtenerTextoEstado(solicitudDetalle.estado)}
                </span>
                <button
                  className="modal-cerrar"
                  type="button"
                  onClick={cerrarDetalle}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="detalle-producto-grid detalle-solicitud-grid detalle-solicitud-grid-mejorada">
              <div>
                <span>Solicitante</span>
                <strong>{solicitudDetalle.solicitante}</strong>
              </div>
              <div>
                <span>Bodega destino</span>
                <strong>{solicitudDetalle.bodega.replace("Bodega ", "")}</strong>
              </div>
              <div>
                <span>Fecha</span>
                <strong>{solicitudDetalle.fecha}</strong>
              </div>
              <div className="detalle-completo detalle-observacion-solicitud">
                <span>Observación</span>
                <strong>{formatearTextoSolicitud(solicitudDetalle.descripcion)}</strong>
              </div>
            </div>
            <div className="tabla-card tabla-solicitud-atencion">
              <div className="tabla-contenedor">
                <table>
                  <thead>
                    <tr>
                      <th>Bien solicitado</th>
                      <th>Atributo</th>
                      <th>Solicitado</th>
                      <th>Entregado</th>
                      <th>Rechazado</th>
                      <th>Disponible</th>
                      <th>Revisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsRevision.map((item) => {
                      const stockSuficiente =
                        item.pendiente > 0 && item.disponible >= item.pendiente;
                      const stockInsuficiente =
                        item.pendiente > 0 && item.disponible > 0 && !stockSuficiente;
                      const cantidadEntregada = item.cantidadEntregada || 0;
                      const cantidadRechazada = item.cantidadRechazada || 0;
                      const itemCerrado = item.pendiente === 0;
                      const itemEntregado = itemCerrado && cantidadEntregada >= item.cantidad;
                      const itemRechazado = itemCerrado && cantidadRechazada >= item.cantidad;
                      const itemMixto =
                        itemCerrado && cantidadEntregada > 0 && cantidadRechazada > 0;
                      const textoRevision = itemEntregado
                        ? "Entregado"
                        : itemRechazado
                          ? "Rechazado"
                          : itemMixto
                            ? "Entregado / Rechazado"
                            : stockSuficiente
                              ? "Disponible"
                              : stockInsuficiente
                                ? "Stock insuficiente"
                                : "Sin stock";
                      const revisionCumplida = itemEntregado || stockSuficiente;
                      return (
                        <tr key={item.id || item.productoSolicitado}>
                          <td>{formatearTextoSolicitud(item.productoSolicitado)}</td>
                          <td>
                            {productos.find(
                              (producto) =>
                                producto.id === (item.productoId || item.productoIdDisponible)
                            )?.tipoProducto === "no_consumible"
                              ? productos.find(
                                  (producto) =>
                                    producto.id === (item.productoId || item.productoIdDisponible)
                                )?.empresa || "No registrado"
                              : "No aplica"}
                          </td>
                          <td>{item.cantidad}</td>
                          <td>{item.cantidadEntregada || 0}</td>
                          <td>{item.cantidadRechazada || 0}</td>
                          <td>{item.disponible}</td>
                          <td>
                            <span
                              className={`estado-entrega-item ${revisionCumplida ? "cumple" : "no-cumple"}`}
                            >
                              {revisionCumplida ? (
                                <Check size={16} />
                              ) : (
                                <X size={16} />
                              )}
                              {textoRevision}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {solicitudDetalle.estado !== "rechazada" &&
              solicitudDetalle.estado !== "atendida" &&
              !solicitudDetalle.pendientesRechazados && (
                <div className="bloque-observacion-admin-solicitud">
                  {!mostrarObservacionAdmin ? (
                    <button
                      className="boton-agregar-observacion-solicitud"
                      type="button"
                      onClick={() => setMostrarObservacionAdmin(true)}
                    >
                      + Agregar observación
                    </button>
                  ) : (
                    <div className="campo-observacion-admin-solicitud">
                      <label>Observación</label>
                      <textarea
                        value={observacionAdmin}
                        onChange={(e) => setObservacionAdmin(e.target.value)}
                        placeholder="Escribe una observación"
                      />
                      <button
                        className="boton-cancelar-observacion-solicitud"
                        type="button"
                        onClick={() => {
                          setObservacionAdmin("");
                          setMostrarObservacionAdmin(false);
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            {(solicitudDetalle.estado !== "rechazada" &&
              solicitudDetalle.estado !== "atendida" &&
              !solicitudDetalle.pendientesRechazados) && (
              <div className="modal-acciones modal-acciones-solicitud">
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={() => pedirConfirmacionRechazo(solicitudDetalle)}
                >
                  Rechazar
                </button>
                <button
                  className="boton-principal"
                  type="button"
                  disabled={!puedeAtenderDisponible}
                  onClick={pedirConfirmacionAtencion}
                >
                  {textoBotonAtencion}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {confirmacionSolicitud && solicitudConfirmacion && (
        <div className="modal-fondo modal-fondo-confirmacion">
          <div className="modal-contenedor modal-confirmacion-solicitud">
            <div className="modal-header">
              <div>
                <h2>{confirmacionSolicitud.titulo}</h2>
                <p>{confirmacionSolicitud.mensaje}</p>
              </div>
              <button
                className="modal-cerrar"
                type="button"
                onClick={cerrarConfirmacion}
              >
                <X size={20} />
              </button>
            </div>
            {confirmacionSolicitud.tipo === "reversar" && (
              <div className="formulario-modal formulario-reversion-solicitud">
                <div className="campo-formulario campo-completo">
                  <label>Motivo de reversión *</label>
                  <textarea
                    value={motivoReversion}
                    onChange={(e) => setMotivoReversion(e.target.value)}
                    placeholder="Ej: Se atendió o rechazó la solicitud por error."
                  />
                </div>
              </div>
            )}
            <div className="modal-acciones">
              <button
                className="boton-secundario"
                type="button"
                onClick={cerrarConfirmacion}
              >
                Cancelar
              </button>
              <button
                className={
                  confirmacionSolicitud.tipo === "rechazar"
                    ? "boton-principal boton-confirmar-rechazo"
                    : "boton-principal"
                }
                type="button"
                disabled={
                  confirmacionSolicitud.tipo === "reversar" &&
                  motivoReversion.trim() === ""
                }
                onClick={() => {
                  if (confirmacionSolicitud.tipo === "rechazar") {
                    rechazarSolicitudDirecta(solicitudConfirmacion);
                    return;
                  }
                  if (confirmacionSolicitud.tipo === "reversar") {
                    confirmarReversion();
                    return;
                  }
                  atenderDisponible();
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SolicitudesAdmin;
