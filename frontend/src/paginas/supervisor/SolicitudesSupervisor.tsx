import axios from "axios";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  Paintbrush,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import CampoDesplegable from "../../componentes/CampoDesplegable";
import SelectorFechaFiltro from "../../componentes/SelectorFechaFiltro";
import {
  atenderSolicitudApi,
  obtenerSolicitudesRecibidasApi,
  type SolicitudBackend,
} from "../../api/solicitudesApi";
import {
  obtenerMiStockSupervisorApi,
  type StockSupervisorItemApi,
} from "../../api/stockSupervisorApi";
import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import TablaBase from "../../componentes/TablaBase";
import { useAuth } from "../../contexto/AuthContext";
import { useInventario } from "../../contexto/InventarioContext";
import { obtenerBodegasOperativasUsuario } from "../../dominio/bodegas";
import type { Producto } from "../../tipos/producto";
import type { EstadoSolicitud, ItemSolicitud, Solicitud } from "../../tipos/solicitud";

type FiltroEstado = "todos" | "pendiente" | "parcial" | "atendida" | "rechazada";
type OrdenSolicitudes = "asc" | "desc";

interface ItemFormularioSolicitud {
  id: string;
  productoId: string | number;
  productoSolicitado: string;
  cantidad: number;
}

interface ItemRevisionRecibida {
  detalleId: string;
  productoId: string;
  productoSolicitado: string;
  cantidadSolicitada: number;
  pendienteOriginal: number;
  cantidadEntregada: number;
  cantidadRechazada: number;
  cantidadPendiente: number;
  disponible: number;
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
    fechaConvertida.getDate(),
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

function obtenerTextoEstado(estado: EstadoSolicitud | SolicitudBackend["estado"]) {
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

function obtenerDisponibilidadSupervisor(
  stockSupervisor: StockSupervisorItemApi[],
  solicitud: SolicitudBackend,
  productoId: string,
) {
  return stockSupervisor
    .filter(
      (item) =>
        item.productoId === productoId &&
        item.destinos.some((destino) => destino.id === solicitud.bodegaSolicitante.id),
    )
    .reduce((total, item) => total + item.cantidad, 0);
}

function SolicitudesSupervisor({ modo = "supervisor" }: { modo?: "supervisor" | "responsable" }) {
  const { usuarioActual } = useAuth();
  const { solicitudes, productos, agregarSolicitud, editarSolicitud, recargarDatosInventario } = useInventario();

  const bodegasUsuario = useMemo(
    () => obtenerBodegasOperativasUsuario(usuarioActual),
    [usuarioActual],
  );

  const [bandeja, setBandeja] = useState<"mias" | "recibidas">("mias");
  const [recibidas, setRecibidas] = useState<SolicitudBackend[]>([]);
  const [stockSupervisor, setStockSupervisor] = useState<StockSupervisorItemApi[]>([]);
  const [cargandoRecibidas, setCargandoRecibidas] = useState(false);
  const [errorRecibidas, setErrorRecibidas] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("pendiente");
  const [bodegaFiltro, setBodegaFiltro] = useState("todas");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [orden, setOrden] = useState<OrdenSolicitudes>("asc");

  const [busquedaRecibidas, setBusquedaRecibidas] = useState("");
  const [estadoFiltroRecibidas, setEstadoFiltroRecibidas] = useState<FiltroEstado>("pendiente");
  const [sucursalFiltroRecibidas, setSucursalFiltroRecibidas] = useState("todas");
  const [fechaFiltroRecibidas, setFechaFiltroRecibidas] = useState("");
  const [ordenRecibidas, setOrdenRecibidas] = useState<OrdenSolicitudes>("asc");

  const [modalNuevaSolicitud, setModalNuevaSolicitud] = useState(false);
  const [solicitudEditando, setSolicitudEditando] = useState<Solicitud | null>(null);
  const editandoAbastecimientoVinculado = Boolean(solicitudEditando?.solicitudOrigenId);
  const [borradoresItem, setBorradoresItem] = useState<Record<string, string>>({});
  const [modalDetalle, setModalDetalle] = useState<Solicitud | null>(null);
  const [detalleRecibida, setDetalleRecibida] = useState<SolicitudBackend | null>(null);
  const [solicitudGestion, setSolicitudGestion] = useState<SolicitudBackend | null>(null);
  const [itemsRevision, setItemsRevision] = useState<ItemRevisionRecibida[]>([]);
  // Permite dejar el campo temporalmente vacío al borrar el 0 para escribir otra cantidad.
  const [borradoresCantidades, setBorradoresCantidades] = useState<Record<string, string>>({});
  const [observacionAtencion, setObservacionAtencion] = useState("");
  const [guardandoAtencion, setGuardandoAtencion] = useState(false);
  const [mostrarObservacionRespuesta, setMostrarObservacionRespuesta] = useState(false);
  const [confirmacionAtencion, setConfirmacionAtencion] = useState<"atender" | "rechazar" | null>(null);
  // Referencia solo informativa: una solicitud basada en otra es independiente.
  const [solicitudBaseReferencia, setSolicitudBaseReferencia] = useState<string | null>(null);

  const [bodegaSolicitud, setBodegaSolicitud] = useState("");
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [categoriaCatalogo, setCategoriaCatalogo] = useState("todas");
  const [tipoCatalogo, setTipoCatalogo] = useState<"todos" | "consumible" | "no_consumible">("todos");
  const [estadoCatalogo, setEstadoCatalogo] = useState("todos");
  const [observacion, setObservacion] = useState("");
  const [itemsFormulario, setItemsFormulario] = useState<ItemFormularioSolicitud[]>([]);
  const [mensajeSistema, setMensajeSistema] = useState<MensajeSistema | null>(null);

  const cargarSolicitudesRecibidas = async () => {
    setCargandoRecibidas(true);
    try {
      const [solicitudesRecibidas, stock] = await Promise.all([
        obtenerSolicitudesRecibidasApi(),
        obtenerMiStockSupervisorApi(),
      ]);
      setRecibidas(solicitudesRecibidas);
      setStockSupervisor(stock);
      setErrorRecibidas("");
    } catch {
      setErrorRecibidas("No se pudieron cargar las solicitudes recibidas.");
    } finally {
      setCargandoRecibidas(false);
    }
  };

  useEffect(() => {
    if (modo !== "supervisor") return;
    void cargarSolicitudesRecibidas();
  }, [modo]);

  const solicitudesUsuario = useMemo(() => {
    return solicitudes.filter((solicitud) => solicitud.solicitante === usuarioActual?.nombre);
  }, [solicitudes, usuarioActual?.nombre]);

  const sucursalesRecibidas = useMemo(() => {
    return Array.from(
      new Set(recibidas.map((solicitud) => limpiarNombreBodega(solicitud.bodegaSolicitante.nombre))),
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [recibidas]);

  const haySolicitudesRecibidasPendientes = useMemo(
    () => recibidas.some((solicitud) => solicitud.estado === "pendiente" || solicitud.estado === "parcial"),
    [recibidas],
  );

  const solicitudesFiltradas = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    const filtradas = solicitudesUsuario.filter((solicitud) => {
      const items = obtenerItemsSolicitud(solicitud);
      const textoSolicitud = normalizarTexto(
        `${solicitud.descripcion} ${solicitud.bodega} ${solicitud.estado} ${items
          .map((item) => item.productoSolicitado)
          .join(" ")}`,
      );

      const coincideBusqueda = texto === "" || textoSolicitud.includes(texto);
      const coincideEstado = estadoFiltro === "todos" || solicitud.estado === estadoFiltro;
      const coincideBodega = bodegaFiltro === "todas" || solicitud.bodega === bodegaFiltro;
      const coincideFecha = fechaFiltro === "" || solicitud.fecha.slice(0, 10) === fechaFiltro;

      return coincideBusqueda && coincideEstado && coincideBodega && coincideFecha;
    });

    return [...filtradas].sort((a, b) => {
      const comparacionFecha = obtenerDiaOrden(b.fecha) - obtenerDiaOrden(a.fecha);

      if (comparacionFecha !== 0) return comparacionFecha;

      const comparacionAlfabetica = formatearTextoSolicitud(a.productoSolicitado).localeCompare(
        formatearTextoSolicitud(b.productoSolicitado),
        "es",
        { sensitivity: "base" },
      );

      return orden === "asc" ? comparacionAlfabetica : comparacionAlfabetica * -1;
    });
  }, [solicitudesUsuario, busqueda, estadoFiltro, bodegaFiltro, fechaFiltro, orden]);

  const solicitudesRecibidasFiltradas = useMemo(() => {
    const texto = normalizarTexto(busquedaRecibidas);

    const filtradas = recibidas.filter((solicitud) => {
      const productosTexto = solicitud.detalles
        .map((detalle) => `${detalle.producto.nombre} ${detalle.producto.codigo}`)
        .join(" ");
      const textoSolicitud = normalizarTexto(
        `${solicitud.codigo} ${solicitud.usuarioSolicitante.nombre} ${solicitud.bodegaSolicitante.nombre} ${solicitud.estado} ${productosTexto} ${solicitud.observacionSolicitante || ""}`,
      );

      const sucursal = limpiarNombreBodega(solicitud.bodegaSolicitante.nombre);
      const coincideBusqueda = texto === "" || textoSolicitud.includes(texto);
      const coincideEstado = estadoFiltroRecibidas === "todos" || solicitud.estado === estadoFiltroRecibidas;
      const coincideSucursal =
        sucursalFiltroRecibidas === "todas" || sucursal === sucursalFiltroRecibidas;
      const coincideFecha =
        fechaFiltroRecibidas === "" ||
        solicitud.createdAt.slice(0, 10) === fechaFiltroRecibidas;

      return coincideBusqueda && coincideEstado && coincideSucursal && coincideFecha;
    });

    return [...filtradas].sort((a, b) => {
      const comparacionFecha = obtenerDiaOrden(b.createdAt.slice(0, 10)) - obtenerDiaOrden(a.createdAt.slice(0, 10));
      if (comparacionFecha !== 0) return comparacionFecha;

      const nombreBien = (solicitud: SolicitudBackend) =>
        solicitud.detalles.length === 1
          ? solicitud.detalles[0].producto.nombre
          : `${solicitud.detalles.length} bienes solicitados`;
      const comparacionAlfabetica = nombreBien(a).localeCompare(
        nombreBien(b),
        "es",
        { sensitivity: "base" },
      );

      return ordenRecibidas === "asc" ? comparacionAlfabetica : comparacionAlfabetica * -1;
    });
  }, [
    recibidas,
    busquedaRecibidas,
    estadoFiltroRecibidas,
    sucursalFiltroRecibidas,
    fechaFiltroRecibidas,
    ordenRecibidas,
  ]);

  const categoriasDisponibles = useMemo(() => {
    const categorias = obtenerProductoDisponible(productos)
      .map((producto) => producto.categoria)
      .filter((categoria) => categoria && categoria.trim() !== "");

    return Array.from(new Set(categorias)).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [productos]);

  const productosCatalogo = useMemo(() => {
    const texto = normalizarTexto(busquedaCatalogo);
    return obtenerProductoDisponible(productos)
      .filter((producto) => {
        const textoProducto = normalizarTexto(
          `${producto.codigo} ${producto.descripcion} ${producto.categoria || "Sin categoría"} ${producto.empresa || ""}`,
        );
        const coincideBusqueda = !texto || textoProducto.includes(texto);
        const coincideCategoria = categoriaCatalogo === "todas" ||
          (producto.categoria || "Sin categoría") === categoriaCatalogo;
        const coincideTipo = tipoCatalogo === "todos" || producto.tipoProducto === tipoCatalogo;
        const coincideEstado = estadoCatalogo === "todos" || producto.estadoBien === estadoCatalogo;
        return coincideBusqueda && coincideCategoria && coincideTipo && coincideEstado;
      })
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es", { sensitivity: "base" }));
  }, [productos, busquedaCatalogo, categoriaCatalogo, tipoCatalogo, estadoCatalogo]);

  const limpiarFiltrosCatalogo = () => {
    setBusquedaCatalogo("");
    setCategoriaCatalogo("todas");
    setTipoCatalogo("todos");
    setEstadoCatalogo("todos");
  };

  const mostrarMensaje = (tipo: MensajeSistema["tipo"], texto: string) => {
    setMensajeSistema({ tipo, texto });
    window.setTimeout(() => setMensajeSistema(null), 3200);
  };

  const esEditable = (s: Solicitud) => s.estado === "pendiente" &&
    !s.atendidaAt && !s.reversada && obtenerItemsSolicitud(s).every((item) =>
      (item.cantidadEntregada || 0) === 0 && (item.cantidadRechazada || 0) === 0);

  const abrirEdicion = (s: Solicitud) => {
    if (!esEditable(s)) {
      mostrarMensaje("error", "Solo puedes editar solicitudes pendientes sin atenciones previas.");
      return;
    }
    setSolicitudBaseReferencia(null);
    setSolicitudEditando(s);
    setBodegaSolicitud(s.bodega);
    limpiarFiltrosCatalogo();
    setObservacion(s.descripcion.startsWith("Solicitud SOL-") ? "" : s.descripcion);
    setItemsFormulario(obtenerItemsSolicitud(s).map((item, i) => ({
      id: item.id || `${s.id}-${i}`,
      productoId: item.productoId || "",
      productoSolicitado: item.productoSolicitado,
      cantidad: item.cantidad,
    })));
    setBorradoresItem({});
    setModalDetalle(null);
    setModalNuevaSolicitud(true);
  };

  const abrirNuevaSolicitud = () => {
    setSolicitudBaseReferencia(null);
    setSolicitudEditando(null);
    setBorradoresItem({});
    setBodegaSolicitud(bodegasUsuario[0] || "");
    limpiarFiltrosCatalogo();
    setObservacion("");
    setItemsFormulario([]);
    setModalNuevaSolicitud(true);
  };

  const cerrarNuevaSolicitud = () => {
    setModalNuevaSolicitud(false);
    setSolicitudBaseReferencia(null);
    setSolicitudEditando(null);
    setBorradoresItem({});
    limpiarFiltrosCatalogo();
    setObservacion("");
    setItemsFormulario([]);
  };

  const agregarItemSolicitud = (producto: Producto) => {
    if (editandoAbastecimientoVinculado) {
      mostrarMensaje("error", "Los bienes de este abastecimiento vinculado no pueden modificarse.");
      return;
    }
    if (itemsFormulario.some((item) => String(item.productoId) === String(producto.id))) {
      mostrarMensaje("error", "Este bien ya está agregado. Puedes ajustar su cantidad a la derecha.");
      return;
    }
    setItemsFormulario((actuales) => [
      ...actuales,
      {
        id: `catalogo-${Date.now()}-${producto.id}`,
        productoId: producto.id,
        productoSolicitado: producto.descripcion,
        cantidad: 1,
      },
    ]);
  };

  const actualizarCantidadItem = (id: string, valor: string) => {
    if (valor !== "" && !/^\d+$/.test(valor)) return;
    const cantidad = valor === "" ? 0 : Number(valor);
    if (!Number.isSafeInteger(cantidad)) return;
    setBorradoresItem((actual) => ({ ...actual, [id]: valor }));
    setItemsFormulario((actual) => actual.map((item) => item.id === id ? { ...item, cantidad } : item));
  };

  const quitarItemSolicitud = (id: string) => {
    setItemsFormulario((itemsActuales) => itemsActuales.filter((item) => item.id !== id));
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

    if (itemsFormulario.some((item) => !item.productoId || !Number.isSafeInteger(item.cantidad) || item.cantidad <= 0)) {
      mostrarMensaje("error", "Cada cantidad debe ser un número entero mayor que cero.");
      return;
    }
    const cantidadTotal = itemsFormulario.reduce((total, item) => total + item.cantidad, 0);

    const payload: Omit<Solicitud, "id" | "fecha"> = {
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
      descripcion: observacion.trim() || `Solicitud para ${limpiarNombreBodega(bodegaSolicitud)}.`,
      estado: "pendiente",
      items: itemsFormulario.map((item) => ({
        productoId: item.productoId,
        productoSolicitado: item.productoSolicitado,
        cantidad: item.cantidad,
        cantidadEntregada: 0,
      })),
    };
    const resultado = solicitudEditando
      ? await editarSolicitud(solicitudEditando.id, payload)
      : await agregarSolicitud(payload);

    if (!resultado.exito) {
      mostrarMensaje("error", resultado.mensaje);
      return;
    }

    const fueBasadaEnOtra = Boolean(solicitudBaseReferencia);
    cerrarNuevaSolicitud();
    mostrarMensaje("exito", fueBasadaEnOtra
      ? "Nueva solicitud enviada al Administrador. Puedes seguirla en Mis solicitudes."
      : resultado.mensaje);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setEstadoFiltro("pendiente");
    setBodegaFiltro("todas");
    setFechaFiltro("");
    setOrden("asc");
  };

  const limpiarFiltrosRecibidas = () => {
    setBusquedaRecibidas("");
    setEstadoFiltroRecibidas("pendiente");
    setSucursalFiltroRecibidas("todas");
    setFechaFiltroRecibidas("");
    setOrdenRecibidas("asc");
  };

  const filtrosActivos =
    busqueda.trim() !== "" ||
    estadoFiltro !== "pendiente" ||
    bodegaFiltro !== "todas" ||
    fechaFiltro !== "" ||
    orden !== "asc";

  const filtrosRecibidasActivos =
    busquedaRecibidas.trim() !== "" ||
    estadoFiltroRecibidas !== "pendiente" ||
    sucursalFiltroRecibidas !== "todas" ||
    fechaFiltroRecibidas !== "" ||
    ordenRecibidas !== "asc";

  const abrirGestionSolicitud = (solicitud: SolicitudBackend) => {
    setSolicitudGestion(solicitud);
    setBorradoresCantidades({});
    setDetalleRecibida(null);
    setObservacionAtencion("");
    setMostrarObservacionRespuesta(false);
    setConfirmacionAtencion(null);
    setItemsRevision(
      solicitud.detalles.map((detalle) => ({
        detalleId: detalle.id,
        productoId: detalle.producto.id,
        productoSolicitado: detalle.producto.nombre,
        cantidadSolicitada: detalle.cantidadSolicitada,
        pendienteOriginal: detalle.cantidadPendiente,
        cantidadEntregada: 0,
        cantidadRechazada: 0,
        cantidadPendiente: detalle.cantidadPendiente,
        disponible: obtenerDisponibilidadSupervisor(stockSupervisor, solicitud, detalle.producto.id),
      })),
    );
  };

  const cerrarGestionSolicitud = () => {
    setSolicitudGestion(null);
    setItemsRevision([]);
    setBorradoresCantidades({});
    setObservacionAtencion("");
    setGuardandoAtencion(false);
    setMostrarObservacionRespuesta(false);
    setConfirmacionAtencion(null);
  };

  // Reutilizamos la creación NORMAL de solicitudes del Supervisor.
  // No creamos un abastecimiento vinculado ni bloqueamos otro pedido por
  // existir uno anterior. El código de origen se guarda en la observación.
  const abrirSolicitudBasadaEnRecibida = () => {
    if (!solicitudGestion || modo !== "supervisor") return;

    const sucursal = limpiarNombreBodega(solicitudGestion.bodegaSolicitante.nombre);
    const bodegaAsignada = bodegasUsuario.find((nombre) =>
      normalizarTexto(limpiarNombreBodega(nombre)) === normalizarTexto(sucursal),
    );
    if (!bodegaAsignada) {
      mostrarMensaje("error", "No tienes asignada la sucursal de origen de esta solicitud.");
      return;
    }

    const faltantes = itemsRevision.filter((item) => item.pendienteOriginal > item.disponible);
    if (!faltantes.length) {
      mostrarMensaje("error", "No hay cantidades faltantes. Si necesitas otros bienes, crea una solicitud desde Mis solicitudes.");
      return;
    }

    // Se precargan exclusivamente las cantidades que faltan del pedido;
    // luego el Supervisor puede agregar, quitar o modificar bienes.
    const precargados = faltantes.map((item) => ({
      id: `base-${item.detalleId}`,
      productoId: item.productoId,
      productoSolicitado: item.productoSolicitado,
      cantidad: item.pendienteOriginal - item.disponible,
    }));

    setSolicitudEditando(null);
    setSolicitudBaseReferencia(solicitudGestion.codigo);
    setBodegaSolicitud(bodegaAsignada);
    limpiarFiltrosCatalogo();
    setObservacion(`Solicitud basada en ${solicitudGestion.codigo} (${sucursal}).`);
    setItemsFormulario(precargados);
    setBorradoresItem({});

    // El formulario existente se renderiza en la pestaña "Mis solicitudes".
    cerrarGestionSolicitud();
    setBandeja("mias");
    setModalNuevaSolicitud(true);
  };

  const actualizarRevision = (
    detalleId: string,
    campo: "cantidadEntregada" | "cantidadRechazada",
    valor: string,
  ) => {
    const numero = Math.max(0, Number(valor) || 0);

    setItemsRevision((itemsActuales) =>
      itemsActuales.map((item) => {
        if (item.detalleId !== detalleId) return item;

        const siguiente = { ...item, [campo]: numero };
        const total = siguiente.cantidadEntregada + siguiente.cantidadRechazada;

        if (total > item.pendienteOriginal) {
          if (campo === "cantidadEntregada") {
            siguiente.cantidadEntregada = Math.max(0, item.pendienteOriginal - siguiente.cantidadRechazada);
          } else {
            siguiente.cantidadRechazada = Math.max(0, item.pendienteOriginal - siguiente.cantidadEntregada);
          }
        }

        if (siguiente.cantidadEntregada > Math.min(item.disponible, item.pendienteOriginal)) {
          siguiente.cantidadEntregada = Math.min(item.disponible, item.pendienteOriginal);
        }

        siguiente.cantidadPendiente = Math.max(
          0,
          item.pendienteOriginal - siguiente.cantidadEntregada - siguiente.cantidadRechazada,
        );

        return siguiente;
      }),
    );
  };

  const cambiarCantidadRevision = (
    detalleId: string,
    campo: "cantidadEntregada" | "cantidadRechazada",
    valor: string,
  ) => {
    const item = itemsRevision.find((revision) => revision.detalleId === detalleId);
    if (!item || (valor !== "" && !/^\d+$/.test(valor))) return;

    const numero = valor === "" ? 0 : Number(valor);
    if (!Number.isSafeInteger(numero)) return;

    const maximo = campo === "cantidadEntregada"
      ? Math.max(0, Math.min(item.disponible, item.pendienteOriginal - item.cantidadRechazada))
      : Math.max(0, item.pendienteOriginal - item.cantidadEntregada);
    const cantidad = Math.min(numero, maximo);
    const clave = `${detalleId}:${campo}`;

    // Mientras edita, el campo puede quedar vacío; al guardar se usa la cantidad validada.
    setBorradoresCantidades((actual) => ({
      ...actual,
      [clave]: valor === "" ? "" : String(cantidad),
    }));
    actualizarRevision(detalleId, campo, String(cantidad));
  };

  const terminarEdicionCantidad = (
    detalleId: string,
    campo: "cantidadEntregada" | "cantidadRechazada",
  ) => {
    const clave = `${detalleId}:${campo}`;
    setBorradoresCantidades((actual) => {
      const siguiente = { ...actual };
      delete siguiente[clave];
      return siguiente;
    });
  };

  const prepararRechazoRecibida = () => {
    setConfirmacionAtencion("rechazar");
  };

  const prepararAtencionRecibida = () => {
    if (!itemsRevision.some((item) => item.cantidadEntregada + item.cantidadRechazada > 0)) {
      mostrarMensaje("error", "Indica una cantidad a entregar o rechazar.");
      return;
    }
    setConfirmacionAtencion("atender");
  };

  const guardarAtencionRecibida = async () => {
    if (!solicitudGestion || !confirmacionAtencion) return;

    const detalles = itemsRevision
      .map((item) => ({
        detalleId: item.detalleId,
        cantidadEntregada: confirmacionAtencion === "rechazar" ? 0 : item.cantidadEntregada,
        cantidadRechazada: confirmacionAtencion === "rechazar"
          ? item.pendienteOriginal
          : item.cantidadRechazada,
      }))
      .filter((item) => item.cantidadEntregada + item.cantidadRechazada > 0);

    if (detalles.length === 0) {
      mostrarMensaje("error", "Indica al menos una cantidad a entregar o rechazar.");
      return;
    }

    const errorDisponibilidad = itemsRevision.find(
      (item) => item.cantidadEntregada > item.disponible,
    );
    if (errorDisponibilidad) {
      mostrarMensaje(
        "error",
        `No hay stock suficiente de "${errorDisponibilidad.productoSolicitado}" para entregar esa cantidad.`,
      );
      return;
    }

    setGuardandoAtencion(true);
    try {
      await atenderSolicitudApi(solicitudGestion.id, {
        detalles,
        observacionAtencion: observacionAtencion.trim() || undefined,
      });
      await Promise.all([recargarDatosInventario(), cargarSolicitudesRecibidas()]);
      cerrarGestionSolicitud();
      window.dispatchEvent(new Event("epuleam:solicitudes-actualizadas"));
      mostrarMensaje("exito", "La solicitud del Responsable fue actualizada correctamente.");
    } catch (error) {
      let mensajeApi: string | null = null;

      if (axios.isAxiosError(error)) {
        const respuesta = error.response?.data as { message?: string | string[] } | undefined;
        if (Array.isArray(respuesta?.message)) {
          mensajeApi = respuesta.message.join(" ");
        } else if (typeof respuesta?.message === "string") {
          mensajeApi = respuesta.message;
        }
      }

      mostrarMensaje(
        "error",
        typeof mensajeApi === "string" && mensajeApi.trim()
          ? mensajeApi
          : error instanceof Error
            ? error.message
            : "No se pudo guardar la atención.",
      );
    } finally {
      setGuardandoAtencion(false);
    }
  };

  const botonesBandeja = modo === "supervisor" && (
    <div className="responsable-filtros solicitudes-bandeja-tabs" style={{ marginBottom: 16 }}>
      <button
        type="button"
        className="boton-filtro"
        onClick={() => setBandeja("mias")}
        aria-pressed={bandeja === "mias"}
      >
        Mis solicitudes
      </button>
      <button
        type="button"
        className="boton-filtro boton-filtro-tab-alerta"
        onClick={() => setBandeja("recibidas")}
        aria-pressed={bandeja === "recibidas"}
      >
        <span>Solicitudes recibidas</span>
        {haySolicitudesRecibidasPendientes ? <span className="boton-filtro-alerta">!</span> : null}
      </button>
    </div>
  );

  return (
    <div className="pagina-admin pagina-responsable">
      <EncabezadoPagina
        titulo="Solicitudes"
        descripcion={
          modo === "responsable"
            ? "Solicita bienes al Supervisor de tu sucursal y consulta el estado de tus pedidos."
            : "Crea solicitudes para tus bodegas asignadas, revisa el estado de tus pedidos y atiende las solicitudes de Responsables."
        }
      />

      {mensajeSistema && (
        <div className={`mensaje-flotante mensaje-flotante-${mensajeSistema.tipo}`}>
          {mensajeSistema.texto}
        </div>
      )}

      {botonesBandeja}

      {modo === "supervisor" && bandeja === "recibidas" && (
        <section className="seccion-dashboard">
          <div className="seccion-dashboard-header solicitudes-header-simple">
            <div>
              <h2>Solicitudes recibidas</h2>
              <p>Pedidos enviados por Responsables de tus sucursales asignadas.</p>
            </div>

          </div>

          <div className="solicitudes-rol-filtros">
            <div className="buscador-input-contenedor solicitudes-rol-buscador">
              <Search size={18} />
              <input
                value={busquedaRecibidas}
                onChange={(e) => setBusquedaRecibidas(e.target.value)}
                placeholder="Buscar solicitud recibida..."
              />
            </div>

            <CampoDesplegable
              valor={estadoFiltroRecibidas}
              alCambiar={(valor) => setEstadoFiltroRecibidas(valor as FiltroEstado)}
              ariaLabel="Filtrar solicitudes recibidas por estado"
              opciones={[
                { valor: "pendiente", texto: "Pendientes", alerta: recibidas.some((item) => item.estado === "pendiente") },
                { valor: "parcial", texto: "Parciales", alerta: recibidas.some((item) => item.estado === "parcial") },
                { valor: "atendida", texto: "Atendidas" },
                { valor: "rechazada", texto: "Rechazadas" },
                { valor: "todos", texto: "Todas" },
              ]}
              anchoMinimo={190}
            />

            <CampoDesplegable
              valor={sucursalFiltroRecibidas}
              alCambiar={setSucursalFiltroRecibidas}
              ariaLabel="Filtrar solicitudes recibidas por sucursal"
              opciones={[
                { valor: "todas", texto: "Todas las sucursales" },
                ...sucursalesRecibidas.map((sucursal) => ({ valor: sucursal, texto: sucursal })),
              ]}
              anchoMinimo={220}
            />

            <SelectorFechaFiltro
              valor={fechaFiltroRecibidas}
              alCambiar={setFechaFiltroRecibidas}
              ariaLabel="Filtrar solicitudes recibidas por fecha"
              className="solicitudes-rol-fecha-selector"
            />

            <button
              className="boton-filtro boton-filtro-icono"
              type="button"
              title={
                ordenRecibidas === "asc" ? "Orden A-Z dentro de cada fecha" : "Orden Z-A dentro de cada fecha"
              }
              onClick={() => setOrdenRecibidas((actual) => (actual === "asc" ? "desc" : "asc"))}
            >
              {ordenRecibidas === "asc" ? <ArrowDownAZ size={18} /> : <ArrowUpAZ size={18} />}
            </button>

            <button
              className="boton-filtro boton-filtro-icono"
              type="button"
              title="Limpiar filtros"
              disabled={!filtrosRecibidasActivos}
              onClick={limpiarFiltrosRecibidas}
            >
              <Paintbrush size={18} />
            </button>
          </div>

          {errorRecibidas ? <p role="alert">{errorRecibidas}</p> : null}

          <div className="responsable-tabla-scroll solicitudes-rol-tabla-scroll">
            <TablaBase
              columnas={[
                "Bien solicitado",
                "Cantidad",
                "Entregado",
                "Solicitante",
                "Sucursal",
                "Fecha",
                "Estado",
                "Acciones",
              ]}
              mensajeVacio={cargandoRecibidas ? "Cargando solicitudes..." : "No tienes solicitudes recibidas"}
            >
              {solicitudesRecibidasFiltradas.map((solicitud) => (
                <tr key={solicitud.id}>
                  <td>
                    <strong>
                      {solicitud.detalles.length === 1
                        ? solicitud.detalles[0].producto.nombre
                        : `${solicitud.detalles.length} bienes solicitados`}
                    </strong>
                  </td>
                  <td>{solicitud.detalles.reduce((total, detalle) => total + detalle.cantidadSolicitada, 0)}</td>
                  <td>{solicitud.detalles.reduce((total, detalle) => total + detalle.cantidadEntregada, 0)}</td>
                  <td>{solicitud.usuarioSolicitante.nombre}</td>
                  <td>{limpiarNombreBodega(solicitud.bodegaSolicitante.nombre)}</td>
                  <td>{solicitud.createdAt.slice(0, 10)}</td>
                  <td>
                    <span className={`badge-solicitud badge-solicitud-${solicitud.estado}`}>
                      {obtenerTextoEstado(solicitud.estado)}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-tabla acciones-solicitudes">
                      <button
                        className="boton-icono-tabla boton-icono-alerta"
                        type="button"
                        title="Ver solicitud y gestionar su atención"
                        aria-label={`Ver solicitud ${solicitud.codigo}`}
                        onClick={() => {
                          if (solicitud.estado === "pendiente" || solicitud.estado === "parcial") {
                            abrirGestionSolicitud(solicitud);
                          } else {
                            setDetalleRecibida(solicitud);
                          }
                        }}
                      >
                        !
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </TablaBase>
          </div>
        </section>
      )}

      {(modo === "responsable" || bandeja === "mias") && (
        <>
          <section className="seccion-dashboard">
            <div className="seccion-dashboard-header solicitudes-header-simple">
              <div>
                <h2>Mis solicitudes</h2>
                <p>
                  {modo === "responsable"
                    ? "Solicitudes enviadas al Supervisor de tu sucursal."
                    : "Consulta pendientes, parciales, atendidas o rechazadas."}
                </p>
              </div>

              <button className="boton-principal" type="button" onClick={abrirNuevaSolicitud}>
                <Plus size={18} /> Nueva solicitud
              </button>
            </div>

            <div className="solicitudes-rol-filtros">
              <div className="buscador-input-contenedor solicitudes-rol-buscador">
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
                  { valor: "pendiente", texto: "Pendientes" },
                  { valor: "parcial", texto: "Parciales" },
                  { valor: "atendida", texto: "Atendidas" },
                  { valor: "rechazada", texto: "Rechazadas" },
                  { valor: "todos", texto: "Todas" },
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
                anchoMinimo={220}
              />

              <SelectorFechaFiltro
                valor={fechaFiltro}
                alCambiar={setFechaFiltro}
                ariaLabel="Filtrar solicitudes por fecha"
                className="solicitudes-rol-fecha-selector"
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
                        0,
                      );

                      return (
                        <tr key={solicitud.id}>
                          <td>
                            <div className="celda-producto">
                              <strong>
                                {items.length === 1 ? items[0].productoSolicitado : `${items.length} bienes solicitados`}
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
                                aria-label="Ver detalle de solicitud"
                                onClick={() => setModalDetalle(solicitud)}
                              >
                                !
                              </button>
                              {esEditable(solicitud) && (
                                <button
                                  className="boton-icono-tabla"
                                  type="button"
                                  title="Editar solicitud"
                                  aria-label="Editar solicitud"
                                  onClick={() => abrirEdicion(solicitud)}
                                >
                                  <Pencil size={16} />
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

          {modalNuevaSolicitud && (
            <div className="modal-fondo">
              <div className="modal-contenedor modal-responsable-solicitud modal-responsable-solicitud-amplio modal-solicitud-catalogo">
                <div className="modal-header">
                  <div>
                    <h2>{solicitudEditando ? "Editar solicitud" : "Nueva solicitud"}</h2>
                    <p>
                      {editandoAbastecimientoVinculado
                        ? "Este abastecimiento está vinculado al pedido de un Responsable: puedes ajustar las cantidades y la observación, pero no cambiar los bienes."
                        : solicitudEditando
                        ? "Puedes agregar bienes, ajustar cantidades o cambiar la observación."
                        : solicitudBaseReferencia
                        ? `Pedido nuevo basado en ${solicitudBaseReferencia}. Puedes cambiar bienes, cantidades y observación antes de enviarlo al Administrador.`
                        : modo === "responsable"
                        ? "Selecciona tu sucursal y los bienes que solicitarás al Supervisor."
                        : "Selecciona una bodega y agrega los bienes que necesitas."}
                    </p>
                  </div>
                  <button className="modal-cerrar" type="button" onClick={cerrarNuevaSolicitud}>
                    <X size={20} />
                  </button>
                </div>

                <form className="formulario-modal formulario-solicitud-catalogo" onSubmit={guardarSolicitud}>
                  <div className="solicitud-distribucion-dos-paneles">
                    <section className="solicitud-catalogo-panel" aria-label="Inventario general para solicitar">
                      <div className="solicitud-panel-cabecera">
                        <div>
                          <h3>Inventario general</h3>
                          <p>Selecciona los bienes que necesitas y pulsa + para agregarlos.</p>
                        </div>
                      </div>
                      <div className="solicitud-catalogo-filtros">
                        <label className="solicitud-catalogo-busqueda">
                          <Search size={18} />
                          <input
                            type="search"
                            placeholder="Buscar por código o nombre..."
                            aria-label="Buscar bien en Inventario general"
                            value={busquedaCatalogo}
                            onChange={(event) => setBusquedaCatalogo(event.target.value)}
                          />
                        </label>
                        <div className="solicitud-catalogo-selectores">
                          <CampoDesplegable
                            valor={categoriaCatalogo}
                            alCambiar={setCategoriaCatalogo}
                            ariaLabel="Filtrar categoría del Inventario general"
                            anchoMinimo={0}
                            opciones={[
                              { valor: "todas", texto: "Todas las categorías" },
                              ...categoriasDisponibles.map((categoria) => ({ valor: categoria, texto: categoria })),
                            ]}
                          />
                          <CampoDesplegable
                            valor={tipoCatalogo}
                            alCambiar={(valor) => setTipoCatalogo(valor as "todos" | "consumible" | "no_consumible")}
                            ariaLabel="Filtrar tipo de bien"
                            anchoMinimo={0}
                            opciones={[
                              { valor: "todos", texto: "Todo tipo" },
                              { valor: "consumible", texto: "Consumible" },
                              { valor: "no_consumible", texto: "No consumible" },
                            ]}
                          />
                          <CampoDesplegable
                            valor={estadoCatalogo}
                            alCambiar={setEstadoCatalogo}
                            ariaLabel="Filtrar estado del bien"
                            anchoMinimo={0}
                            opciones={[
                              { valor: "todos", texto: "Todo estado" },
                              { valor: "bueno", texto: "Bueno" },
                              { valor: "regular", texto: "Medio" },
                              { valor: "malo", texto: "Malo" },
                            ]}
                          />
                        </div>
                      </div>
                      <div className="solicitud-catalogo-tabla-contenedor">
                        <table className="solicitud-catalogo-tabla">
                          <thead>
                            <tr>
                              <th>Código</th>
                              <th>Bien</th>
                              <th>Atributo</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productosCatalogo.length ? productosCatalogo.map((producto) => {
                              const agregado = itemsFormulario.some((item) => String(item.productoId) === String(producto.id));
                              const bloqueado = agregado || editandoAbastecimientoVinculado;
                              const estadoTexto = producto.estadoBien === "regular" ? "Medio" : producto.estadoBien === "malo" ? "Malo" : "Bueno";
                              return (
                                <tr key={producto.id}>
                                  <td>{producto.codigo}</td>
                                  <td title={producto.descripcion}>{producto.descripcion}</td>
                                  <td>{producto.tipoProducto === "no_consumible" ? producto.empresa || "Sin atributo" : "No aplica"}</td>
                                  <td><span className={`estado-bien estado-bien-${producto.estadoBien}`}>{estadoTexto}</span></td>
                                  <td>
                                    <button
                                      className="solicitud-catalogo-agregar"
                                      type="button"
                                      disabled={bloqueado}
                                      onClick={() => agregarItemSolicitud(producto)}
                                      title={editandoAbastecimientoVinculado ? "Este abastecimiento tiene los bienes definidos" : agregado ? "Bien agregado" : "Agregar a la solicitud"}
                                      aria-label={agregado ? `${producto.descripcion} ya agregado` : `Agregar ${producto.descripcion}`}
                                    >
                                      {agregado ? <Check size={16} /> : <Plus size={18} />}
                                    </button>
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr><td className="solicitud-catalogo-vacio" colSpan={5}>No hay bienes que coincidan con los filtros.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="solicitud-formulario-panel" aria-label="Formulario de solicitud">
                      <div className="solicitud-panel-cabecera">
                        <div>
                          <h3>Datos de la solicitud</h3>
                          <p>Ajusta las cantidades de los bienes seleccionados.</p>
                        </div>
                        <span className="solicitud-items-contador">{itemsFormulario.length} bienes</span>
                      </div>
                      <div className="campo-formulario solicitud-bodega-formulario">
                        <label>{modo === "responsable" ? "Sucursal solicitante" : "Bodega solicitante"} *</label>
                        <CampoDesplegable
                          valor={bodegaSolicitud}
                          alCambiar={setBodegaSolicitud}
                          deshabilitado={Boolean(solicitudEditando)}
                          ariaLabel="Seleccionar destino de la solicitud"
                          opciones={bodegasUsuario.map((bodega) => ({
                            valor: bodega,
                            texto: limpiarNombreBodega(bodega),
                          }))}
                          mostrarIconoFiltro={false}
                          anchoMinimo={0}
                        />
                      </div>
                      {editandoAbastecimientoVinculado && (
                        <p className="solicitud-bienes-bloqueados">El abastecimiento vinculado conserva sus bienes; puedes editar las cantidades y la observación.</p>
                      )}
                      <div className="tabla-card tabla-solicitud-items solicitud-formulario-tabla-contenedor">
                        <div className="tabla-contenedor">
                          <table>
                            <thead>
                              <tr>
                                <th>Código</th>
                                <th>Bien</th>
                                <th>Atributo</th>
                                <th>Cantidad</th>
                                {!editandoAbastecimientoVinculado && <th>Acciones</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {itemsFormulario.length ? itemsFormulario.map((item) => {
                                const producto = productos.find((productoActual) => String(productoActual.id) === String(item.productoId));
                                return (
                                  <tr key={item.id}>
                                    <td>{producto?.codigo || "S/C"}</td>
                                    <td>{item.productoSolicitado}</td>
                                    <td>{producto?.tipoProducto === "no_consumible" ? producto.empresa || "Sin atributo" : "No aplica"}</td>
                                    <td>
                                      <input
                                        className="input-cantidad-tabla"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={borradoresItem[item.id] ?? item.cantidad}
                                        onFocus={(event) => event.currentTarget.select()}
                                        onChange={(event) => actualizarCantidadItem(item.id, event.target.value)}
                                        onBlur={() => setBorradoresItem((actual) => {
                                          const copia = { ...actual };
                                          delete copia[item.id];
                                          return copia;
                                        })}
                                      />
                                    </td>
                                    {!editandoAbastecimientoVinculado && (
                                      <td>
                                        <button
                                          className="boton-icono-tabla boton-icono-peligro"
                                          type="button"
                                          onClick={() => quitarItemSolicitud(item.id)}
                                          title="Quitar bien"
                                          aria-label={`Quitar ${item.productoSolicitado}`}
                                        ><Trash2 size={17} /></button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              }) : (
                                <tr><td className="tabla-vacia" colSpan={editandoAbastecimientoVinculado ? 4 : 5}>Agrega bienes desde el Inventario general de la izquierda.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="campo-formulario campo-completo solicitud-observacion-final">
                        <label>Observación</label>
                        <textarea
                          value={observacion}
                          onChange={(event) => setObservacion(event.target.value)}
                          placeholder="Detalle el motivo de la solicitud"
                        />
                      </div>
                    </section>
                  </div>
                  <div className="modal-acciones solicitud-catalogo-acciones">
                    <button className="boton-secundario" type="button" onClick={cerrarNuevaSolicitud}>Cancelar</button>
                    <button className="boton-principal" type="submit">{solicitudEditando ? "Guardar cambios" : "Enviar solicitud"}</button>
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
                            item.cantidad - (item.cantidadEntregada || 0) - (item.cantidadRechazada || 0),
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
                                {productos.find((producto) => producto.id === item.productoId)?.tipoProducto ===
                                "no_consumible"
                                  ? productos.find((producto) => producto.id === item.productoId)?.empresa ||
                                    "No registrado"
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
        </>
      )}

      {detalleRecibida && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-responsable-detalle">
            <div className="modal-header">
              <div>
                <h2>Detalle de solicitud recibida</h2>
                <p>Solicitud enviada por el Responsable de una sucursal asignada.</p>
              </div>
              <div className="modal-solicitud-header-acciones">
                <span className={`badge-solicitud badge-solicitud-${detalleRecibida.estado}`}>
                  {obtenerTextoEstado(detalleRecibida.estado)}
                </span>
                <button className="modal-cerrar" type="button" onClick={() => setDetalleRecibida(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="detalle-producto-grid detalle-solicitud-grid-mejorada">
              <div>
                <span>Código</span>
                <strong>{detalleRecibida.codigo}</strong>
              </div>
              <div>
                <span>Responsable</span>
                <strong>{detalleRecibida.usuarioSolicitante.nombre}</strong>
              </div>
              <div>
                <span>Sucursal</span>
                <strong>{limpiarNombreBodega(detalleRecibida.bodegaSolicitante.nombre)}</strong>
              </div>
              <div>
                <span>Fecha</span>
                <strong>{new Date(detalleRecibida.createdAt).toLocaleDateString("es-EC")}</strong>
              </div>
              <div className="detalle-completo detalle-observacion-solicitud">
                <span>Observación del Responsable</span>
                <strong>{detalleRecibida.observacionSolicitante || "Sin observación registrada."}</strong>
              </div>
              {detalleRecibida.observacionAtencion ? (
                <div className="detalle-completo detalle-observacion-solicitud detalle-observacion-admin">
                  <span>Respuesta del Supervisor</span>
                  <strong>{detalleRecibida.observacionAtencion}</strong>
                </div>
              ) : null}
            </div>

            <div className="tabla-card tabla-solicitud-atencion tabla-solicitud-items-detalle">
              <div className="tabla-contenedor">
                <table>
                  <thead>
                    <tr>
                      <th>Bien solicitado</th>
                      <th>Solicitado</th>
                      <th>Entregado</th>
                      <th>Rechazado</th>
                      <th>Pendiente</th>
                      <th>Disponible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleRecibida.detalles.map((item) => (
                      <tr key={item.id}>
                        <td>{item.producto.nombre}</td>
                        <td>{item.cantidadSolicitada}</td>
                        <td>{item.cantidadEntregada}</td>
                        <td>{item.cantidadRechazada}</td>
                        <td>{item.cantidadPendiente}</td>
                        <td>{obtenerDisponibilidadSupervisor(stockSupervisor, detalleRecibida, item.producto.id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {solicitudGestion && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-solicitud-detalle modal-solicitud-atencion modal-solicitud-recibida-supervisor">
            <div className="modal-header">
              <div>
                <h2>Solicitud</h2>
                <p>Atiende los bienes desde tu stock de Supervisor hacia la sucursal solicitante.</p>
              </div>
              <div className="modal-solicitud-header-acciones">
                <span className={`badge-solicitud badge-solicitud-${solicitudGestion.estado}`}>
                  {obtenerTextoEstado(solicitudGestion.estado)}
                </span>
                <button className="modal-cerrar" type="button" onClick={cerrarGestionSolicitud}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="detalle-producto-grid detalle-solicitud-grid detalle-solicitud-grid-mejorada">
              <div>
                <span>Solicitante</span>
                <strong>{solicitudGestion.usuarioSolicitante.nombre}</strong>
              </div>
              <div>
                <span>Bodega destino</span>
                <strong>{limpiarNombreBodega(solicitudGestion.bodegaSolicitante.nombre)}</strong>
              </div>
              <div>
                <span>Fecha</span>
                <strong>{new Date(solicitudGestion.createdAt).toLocaleDateString("es-EC")}</strong>
              </div>
              <div className="detalle-completo detalle-observacion-solicitud">
                <span>Observación</span>
                <strong>{solicitudGestion.observacionSolicitante || "Sin observación registrada."}</strong>
              </div>
            </div>

            <div className="tabla-card tabla-solicitud-atencion tabla-solicitud-revision-supervisor">
              <div className="tabla-contenedor">
                <table>
                  <thead>
                    <tr>
                      <th>Bien solicitado</th>
                      <th>Solicitado</th>
                      <th>Entregado</th>
                      <th>Rechazado</th>
                      <th>Disponible</th>
                      <th>A entregar</th>
                      <th>A rechazar</th>
                      <th>Revisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsRevision.map((item) => {
                      const disponibleCompleto = item.disponible >= item.pendienteOriginal;
                      const textoRevision = item.pendienteOriginal === 0
                        ? "Resuelto"
                        : disponibleCompleto
                          ? "Disponible"
                          : item.disponible > 0
                            ? "Stock insuficiente"
                            : "Sin stock";
                      return (
                        <tr key={item.detalleId}>
                          <td>{item.productoSolicitado}</td>
                          <td>{item.cantidadSolicitada}</td>
                          <td>{solicitudGestion.detalles.find((detalle) => detalle.id === item.detalleId)?.cantidadEntregada || 0}</td>
                          <td>{solicitudGestion.detalles.find((detalle) => detalle.id === item.detalleId)?.cantidadRechazada || 0}</td>
                          <td>{item.disponible}</td>
                          <td>
                            <input
                              className="input-cantidad-tabla"
                              type="number"
                              min="0"
                              step="1"
                              max={Math.min(item.disponible, item.pendienteOriginal)}
                              disabled={item.pendienteOriginal === 0}
                              value={borradoresCantidades[`${item.detalleId}:cantidadEntregada`] ?? item.cantidadEntregada}
                              aria-label={`Cantidad a entregar de ${item.productoSolicitado}`}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => cambiarCantidadRevision(item.detalleId, "cantidadEntregada", e.target.value)}
                              onBlur={() => terminarEdicionCantidad(item.detalleId, "cantidadEntregada")}
                            />
                          </td>
                          <td>
                            <input
                              className="input-cantidad-tabla"
                              type="number"
                              min="0"
                              step="1"
                              max={item.pendienteOriginal}
                              disabled={item.pendienteOriginal === 0}
                              value={borradoresCantidades[`${item.detalleId}:cantidadRechazada`] ?? item.cantidadRechazada}
                              aria-label={`Cantidad a rechazar de ${item.productoSolicitado}`}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => cambiarCantidadRevision(item.detalleId, "cantidadRechazada", e.target.value)}
                              onBlur={() => terminarEdicionCantidad(item.detalleId, "cantidadRechazada")}
                            />
                          </td>
                          <td>
                            <span className={`estado-entrega-item ${disponibleCompleto ? "cumple" : item.disponible > 0 ? "no-cumple" : "sin-stock"}`}>
                              {disponibleCompleto ? <Check size={16} /> : <X size={16} />}
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

            {itemsRevision.some((item) => item.pendienteOriginal > 0) && (
              <p className={`solicitud-stock-aviso ${
                itemsRevision.some((item) => item.pendienteOriginal > 0 && item.disponible === 0)
                  ? "solicitud-stock-aviso-sin"
                  : itemsRevision.some((item) => item.pendienteOriginal > item.disponible)
                    ? "solicitud-stock-aviso-insuficiente"
                    : "solicitud-stock-aviso-suficiente"
              }`} role="status" aria-live="polite">
                {itemsRevision.some((item) => item.pendienteOriginal > 0 && item.disponible === 0)
                  ? "No cuentas con existencias de uno o más productos solicitados."
                  : itemsRevision.some((item) => item.pendienteOriginal > item.disponible)
                    ? "Tu stock es insuficiente para atender completamente esta solicitud."
                    : "Cuentas con existencias suficientes para atender esta solicitud."}
                {itemsRevision.some((item) => item.pendienteOriginal > item.disponible) &&
                  " Puedes crear una solicitud al Administrador con los bienes faltantes."}
              </p>
            )}

            <div className="bloque-observacion-admin-solicitud">
              {mostrarObservacionRespuesta ? (
                <div className="campo-observacion-admin-solicitud">
                  <label>Observación</label>
                  <textarea
                    value={observacionAtencion}
                    onChange={(e) => setObservacionAtencion(e.target.value)}
                    placeholder="Escribe una observación sobre la atención."
                  />
                  <button
                    className="boton-cancelar-observacion-solicitud"
                    type="button"
                    onClick={() => { setObservacionAtencion(""); setMostrarObservacionRespuesta(false); }}
                  >Cancelar</button>
                </div>
              ) : (
                <button
                  className="boton-agregar-observacion-solicitud"
                  type="button"
                  onClick={() => setMostrarObservacionRespuesta(true)}
                >+ Agregar observación</button>
              )}
            </div>

            <div className="modal-acciones modal-acciones-solicitud">
              <button
                className="boton-secundario"
                type="button"
                disabled={guardandoAtencion || !itemsRevision.some((item) => item.pendienteOriginal > item.disponible)}
                onClick={abrirSolicitudBasadaEnRecibida}
              >
                Solicitar al Administrador
              </button>
              <button className="boton-secundario" type="button" disabled={guardandoAtencion} onClick={prepararRechazoRecibida}>
                Rechazar
              </button>
              <button
                className="boton-principal"
                type="button"
                disabled={guardandoAtencion || !itemsRevision.some((item) => item.cantidadEntregada + item.cantidadRechazada > 0)}
                onClick={prepararAtencionRecibida}
              >
                {itemsRevision.reduce((total, item) => total + item.cantidadPendiente, 0) === 0
                  ? "Aceptar solicitud"
                  : "Aceptar parcialmente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {solicitudGestion && confirmacionAtencion && (
        <div className="modal-fondo modal-fondo-confirmacion">
          <div className="modal-contenedor modal-confirmacion-solicitud">
            <div className="modal-header">
              <div>
                <h2>{confirmacionAtencion === "rechazar" ? "Rechazar solicitud" : "Confirmar atención"}</h2>
                <p>{confirmacionAtencion === "rechazar"
                  ? "Se rechazarán solamente las cantidades pendientes. Las entregas anteriores no se modificarán."
                  : "Se registrarán las cantidades seleccionadas y se descontará únicamente el stock realmente entregado."}</p>
              </div>
              <button className="modal-cerrar" type="button" onClick={() => setConfirmacionAtencion(null)}><X size={20} /></button>
            </div>
            <div className="modal-acciones">
              <button className="boton-secundario" type="button" onClick={() => setConfirmacionAtencion(null)}>Cancelar</button>
              <button
                className={`boton-principal ${confirmacionAtencion === "rechazar" ? "boton-confirmar-rechazo" : ""}`}
                type="button"
                disabled={guardandoAtencion}
                onClick={() => void guardarAtencionRecibida()}
              >{guardandoAtencion ? "Guardando..." : "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SolicitudesSupervisor;
