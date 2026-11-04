import {

  ArrowDownAZ,

  ArrowUpAZ,

  FileText,

  Paintbrush,

  RotateCcw,

  Search,

  X,

} from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";

import TablaBase from "../../componentes/TablaBase";

import { useInventario } from "../../contexto/InventarioContext";

import { useUsuarios } from "../../contexto/UsuariosContext";

import { LIMITE_REVERSA_MS } from "../../dominio/reversiones";

import {

  obtenerCustodioAsignado,

  obtenerEtiquetaAsignacion,

} from "../../utilidades/asignacionesUsuarios";

import type { Movimiento, TipoMovimiento } from "../../tipos/movimiento";

import CampoDesplegable from "../../componentes/CampoDesplegable";
import {
  convertirTextoFechaAIso,
  crearFechaIsoLocal,
  DIAS_CALENDARIO,
  formatearFechaFiltro,
  MESES_CALENDARIO,
  normalizarEntradaFecha,
  obtenerFechaHoraOrden,
  obtenerFechaIso,
  formatearFechaMovimiento,
} from "../../utilidades/fechas";

type FiltroTipoMovimiento =

  | "todos"

  | "entrada"

  | "transferencia"

  | "modificacion"

  | "baja";

type OrdenMovimientos = "recientes" | "antiguos" | "az" | "za";

function obtenerTextoTipo(tipo: TipoMovimiento) {

  if (tipo === "entrada") return "Entrada";

  if (tipo === "transferencia" || tipo === "salida") return "Transferencia";

  if (tipo === "baja") return "Baja";

  return "Modificación";

}

function obtenerTipoNormalizado(tipo: TipoMovimiento): FiltroTipoMovimiento {

  if (tipo === "salida") return "transferencia";

  if (tipo === "ajuste") return "modificacion";

  if (tipo === "entrada" || tipo === "transferencia" || tipo === "baja") {

    return tipo;

  }

  return "modificacion";

}

function limpiarNombreBodega(nombreBodega: string) {

  if (!nombreBodega) return "No especificado";

  const nombreLimpio = nombreBodega

    .replace("Bodega ", "")

    .replace("Gastronomía Tasty", "Gastronomía")

    .replace("Producto dado de baja", "")

    .trim();

  if (nombreLimpio.toLowerCase() === "epuleam ep") {

    return "Inventario General";

  }

  return nombreLimpio;

}

function normalizarTexto(texto: string) {

  return texto.trim().toLowerCase();

}

function obtenerObservacionMovimiento(observacion: string) {

  const texto = observacion.trim();

  if (!texto) return "Sin observación";

  return (

    texto

      .replace(/^Reversi[oó]n\s+de\s+atenci[oó]n\s+de\s+solicitud\.\s*Motivo:\s*/i, "")

      .replace(/^Reversi[oó]n\s+de\s+rechazo\s+de\s+solicitud\.\s*Motivo:\s*/i, "")

      .replace(/^Reversi[oó]n\s+de\s+baja\.\s*Motivo:\s*/i, "")

      .replace(/^Motivo:\s*/i, "")

      .trim() || "Sin observación"

  );

}

interface SelectorFechaMovimientoProps {

  valor: string;

  alCambiar: (valor: string) => void;

}

function SelectorFechaMovimiento({ valor, alCambiar }: SelectorFechaMovimientoProps) {

  const contenedorRef = useRef<HTMLDivElement | null>(null);

  const [abierto, setAbierto] = useState(false);

  const [textoFecha, setTextoFecha] = useState(() => formatearFechaFiltro(valor));

  const [fechaInvalida, setFechaInvalida] = useState(false);

  const [mesVisible, setMesVisible] = useState(() => {

    if (valor) {

      const [anio, mes] = valor.split("-").map(Number);

      if (anio && mes) return new Date(anio, mes - 1, 1);

    }

    const hoy = new Date();

    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  });

  useEffect(() => {

    const cerrarAlHacerClickFuera = (evento: MouseEvent) => {

      if (

        contenedorRef.current &&

        !contenedorRef.current.contains(evento.target as Node)

      ) {

        setAbierto(false);

      }

    };

    document.addEventListener("mousedown", cerrarAlHacerClickFuera);

    return () => document.removeEventListener("mousedown", cerrarAlHacerClickFuera);

  }, []);

  useEffect(() => {

    setTextoFecha(formatearFechaFiltro(valor));

    setFechaInvalida(false);

    if (!valor) return;

    const [anio, mes] = valor.split("-").map(Number);

    if (anio && mes) setMesVisible(new Date(anio, mes - 1, 1));

  }, [valor]);

  const anio = mesVisible.getFullYear();

  const mes = mesVisible.getMonth();

  const primerDia = new Date(anio, mes, 1);

  const desplazamientoLunes = (primerDia.getDay() + 6) % 7;

  const diasMes = new Date(anio, mes + 1, 0).getDate();

  const celdas = Array.from({ length: desplazamientoLunes + diasMes }, (_, indice) => {

    if (indice < desplazamientoLunes) return null;

    return indice - desplazamientoLunes + 1;

  });

  const hoyIso = crearFechaIsoLocal(new Date());

  const cambiarMes = (desplazamiento: number) => {

    setMesVisible(new Date(anio, mes + desplazamiento, 1));

  };

  const aplicarTextoFecha = () => {

    if (!textoFecha.trim()) {

      setFechaInvalida(false);

      alCambiar("");

      return;

    }

    const fechaIso = convertirTextoFechaAIso(textoFecha);

    if (!fechaIso) {

      setFechaInvalida(true);

      return;

    }

    setFechaInvalida(false);

    alCambiar(fechaIso);

    const [nuevoAnio, nuevoMes] = fechaIso.split("-").map(Number);

    setMesVisible(new Date(nuevoAnio, nuevoMes - 1, 1));

  };

  const seleccionarDia = (dia: number) => {

    const fechaIso = crearFechaIsoLocal(new Date(anio, mes, dia));

    alCambiar(fechaIso);

    setTextoFecha(formatearFechaFiltro(fechaIso));

    setFechaInvalida(false);

    setAbierto(false);

  };

  const seleccionarHoy = () => {

    const hoy = new Date();

    const fechaIso = crearFechaIsoLocal(hoy);

    alCambiar(fechaIso);

    setTextoFecha(formatearFechaFiltro(fechaIso));

    setFechaInvalida(false);

    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));

    setAbierto(false);

  };

  const limpiar = () => {

    alCambiar("");

    setTextoFecha("");

    setFechaInvalida(false);

    setAbierto(false);

  };

  return (

    <div className="movimientos-fecha-selector" ref={contenedorRef}>

      <div

        className={`movimientos-fecha-filtro${abierto ? " movimientos-fecha-filtro--abierto" : ""}${fechaInvalida ? " movimientos-fecha-filtro--invalido" : ""}`}

      >

        <button

          className="movimientos-fecha-filtro__calendario"

          type="button"

          aria-label="Abrir calendario"

          aria-haspopup="dialog"

          aria-expanded={abierto}

          title="Seleccionar fecha"

          onMouseDown={(evento) => evento.preventDefault()}

          onClick={() => setAbierto((estado) => !estado)}

        >

          <span className="movimientos-fecha-filtro__marca" aria-hidden="true" />

        </button>

        <input

          type="text"

          inputMode="numeric"

          value={textoFecha}

          placeholder="dd/mm/aaaa"

          aria-label="Filtrar por fecha"

          maxLength={10}

          onChange={(evento) => {

            const textoNormalizado = normalizarEntradaFecha(evento.target.value);

            setTextoFecha(textoNormalizado);

            setFechaInvalida(false);

            if (!textoNormalizado) alCambiar("");

          }}

          onBlur={aplicarTextoFecha}

          onKeyDown={(evento) => {

            if (evento.key === "Enter") {

              aplicarTextoFecha();

              (evento.currentTarget as HTMLInputElement).blur();

            }

          }}

        />

      </div>

      {abierto && (

        <div className="movimientos-calendario" role="dialog" aria-label="Seleccionar fecha">

          <div className="movimientos-calendario__cabecera">

            <button

              type="button"

              className="movimientos-calendario__navegacion"

              aria-label="Mes anterior"

              onClick={() => cambiarMes(-1)}

            >

              ‹

            </button>

            <strong>{`${MESES_CALENDARIO[mes]} de ${anio}`}</strong>

            <button

              type="button"

              className="movimientos-calendario__navegacion"

              aria-label="Mes siguiente"

              onClick={() => cambiarMes(1)}

            >

              ›

            </button>

          </div>

          <div className="movimientos-calendario__semana" aria-hidden="true">

            {DIAS_CALENDARIO.map((dia) => (

              <span key={dia}>{dia}</span>

            ))}

          </div>

          <div className="movimientos-calendario__dias">

            {celdas.map((dia, indice) => {

              if (!dia) {

                return <span className="movimientos-calendario__vacio" key={`vacio-${indice}`} />;

              }

              const fechaIso = crearFechaIsoLocal(new Date(anio, mes, dia));

              const seleccionado = fechaIso === valor;

              const esHoy = fechaIso === hoyIso;

              return (

                <button

                  type="button"

                  key={fechaIso}

                  className={[

                    "movimientos-calendario__dia",

                    seleccionado ? "movimientos-calendario__dia--seleccionado" : "",

                    esHoy ? "movimientos-calendario__dia--hoy" : "",

                  ]

                    .filter(Boolean)

                    .join(" ")}

                  aria-pressed={seleccionado}

                  onClick={() => seleccionarDia(dia)}

                >

                  {dia}

                </button>

              );

            })}

          </div>

          <div className="movimientos-calendario__pie">

            <button type="button" onClick={limpiar} disabled={!valor && !textoFecha}>

              Borrar

            </button>

            <button type="button" onClick={seleccionarHoy}>

              Hoy

            </button>

          </div>

        </div>

      )}

    </div>

  );

}

function obtenerDestinoMovimiento(movimiento: Movimiento) {

  if (movimiento.tipo === "baja") {

    const destinoLimpio = limpiarNombreBodega(movimiento.destino);

    if (destinoLimpio) return destinoLimpio;

    return limpiarNombreBodega(movimiento.origen) || "General";

  }

  return limpiarNombreBodega(movimiento.destino) || "General";

}

function generarPdfBlanco(movimiento: Movimiento) {

  const contenidoPdf = `%PDF-1.4

1 0 obj

<< /Type /Catalog /Pages 2 0 R >>

endobj

2 0 obj

<< /Type /Pages /Kids [3 0 R] /Count 1 >>

endobj

3 0 obj

<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>

endobj

4 0 obj

<< /Length 0 >>

stream

endstream

endobj

xref

0 5

0000000000 65535 f

0000000010 00000 n

0000000059 00000 n

0000000116 00000 n

0000000211 00000 n

trailer

<< /Size 5 /Root 1 0 R >>

startxref

260

%%EOF`;

  const archivo = new Blob([contenidoPdf], { type: "application/pdf" });

  const url = URL.createObjectURL(archivo);

  const enlace = document.createElement("a");

  enlace.href = url;

  enlace.download = `movimiento-${movimiento.id}.pdf`;

  document.body.appendChild(enlace);

  enlace.click();

  enlace.remove();

  URL.revokeObjectURL(url);

}

function MovimientosAdmin() {

  const {

    movimientos,

    productos,

    inventarioBodegas,

    reversarMovimientoSolicitud,

  } = useInventario();

  const { usuarios, bodegasDisponibles: bodegasReales } = useUsuarios();

  const [busqueda, setBusqueda] = useState("");

  const [tipoFiltro, setTipoFiltro] =

    useState<FiltroTipoMovimiento>("todos");

  const [bodegaFiltro, setBodegaFiltro] = useState("todas");

  const [fechaFiltro, setFechaFiltro] = useState("");

  const [ordenMovimientos, setOrdenMovimientos] =

    useState<OrdenMovimientos>("recientes");

  const [movimientoDetalle, setMovimientoDetalle] =

    useState<Movimiento | null>(null);

  const [movimientoReversar, setMovimientoReversar] =

    useState<Movimiento | null>(null);

  const [motivoReversion, setMotivoReversion] = useState("");

  const [mensajeSistema, setMensajeSistema] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const bodegasDisponibles = useMemo(() => {

    const nombresNoPermitidos = [

      "",

      "general",

      "inventario general",

      "producto eliminado",

      "producto dado de baja",

      "no especificado",

    ];

    const bodegasBase = bodegasReales.filter(

      (bodega) => bodega.nombre !== "Inventario General"

    );

    const destinosMovimientos = movimientos.map((movimiento) =>

      obtenerDestinoMovimiento(movimiento)

    );

    const nombresBodegas = [

      ...bodegasBase.map((bodega) => bodega.nombre),

      ...destinosMovimientos,

    ];

    const bodegasUnicas = nombresBodegas.reduce<Record<string, string>>(

      (mapa, nombreBodega) => {

        const nombreLimpio = limpiarNombreBodega(nombreBodega);

        const clave = nombreLimpio.toLowerCase();

        if (!nombresNoPermitidos.includes(clave)) {

          mapa[clave] = nombreLimpio;

        }

        return mapa;

      },

      {}

    );

    return Object.values(bodegasUnicas).sort((a, b) =>

      a.localeCompare(b, "es", { sensitivity: "base" })

    );

  }, [bodegasReales, movimientos]);

  const obtenerResponsableDestino = (movimiento: Movimiento) => {

    const destino = obtenerDestinoMovimiento(movimiento);

    return obtenerCustodioAsignado(usuarios, destino);

  };

  const obtenerProductoRelacionado = (movimiento: Movimiento) => {

    const nombreMovimiento = normalizarTexto(movimiento.producto);

    return (

      productos.find((producto) => String(producto.id) === movimiento.productoId) ||

      productos.find(

        (producto) => normalizarTexto(producto.descripcion) === nombreMovimiento

      ) ||

      productos.find((producto) =>

        normalizarTexto(producto.descripcion).includes(nombreMovimiento)

      ) ||

      productos.find((producto) =>

        nombreMovimiento.includes(normalizarTexto(producto.descripcion))

      )

    );

  };

  const obtenerInventarioRelacionado = (movimiento: Movimiento) => {

    const nombreMovimiento = normalizarTexto(movimiento.producto);

    return (

      inventarioBodegas.find((item) => String(item.productoId) === movimiento.productoId) ||

      inventarioBodegas.find(

        (item) => normalizarTexto(item.descripcion) === nombreMovimiento

      ) ||

      inventarioBodegas.find((item) =>

        normalizarTexto(item.descripcion).includes(nombreMovimiento)

      ) ||

      inventarioBodegas.find((item) =>

        nombreMovimiento.includes(normalizarTexto(item.descripcion))

      )

    );

  };

  const obtenerCodigoProductoMovimiento = (movimiento: Movimiento) => {

    const productoRelacionado = obtenerProductoRelacionado(movimiento);

    const inventarioRelacionado = obtenerInventarioRelacionado(movimiento);

    return productoRelacionado?.codigo || inventarioRelacionado?.codigo || "No registrado";

  };

  const obtenerCodigoUleamMovimiento = (movimiento: Movimiento) => {

    const productoRelacionado = obtenerProductoRelacionado(movimiento);

    const inventarioRelacionado = obtenerInventarioRelacionado(movimiento);

    return (

      productoRelacionado?.codigoUleam ||

      productoRelacionado?.codigo ||

      inventarioRelacionado?.codigo ||

      "No registrado"

    );

  };

  const movimientoEstaDentroDeTiempo = (movimiento: Movimiento) => {

    const fechaMovimiento = movimiento.createdAt

      ? new Date(movimiento.createdAt).getTime()

      : Number.NaN;

    if (Number.isNaN(fechaMovimiento)) return false;

    return Date.now() - fechaMovimiento <= LIMITE_REVERSA_MS;

  };

  const movimientoYaFueReversado = (movimiento: Movimiento) => {

    return movimientos.some(

      (item) => item.movimientoOriginalId === String(movimiento.id),

    );

  };

  const esMovimientoConReversa = (movimiento: Movimiento) => {

    const tipoNormalizado = obtenerTipoNormalizado(movimiento.tipo);

    return (

      (tipoNormalizado === "transferencia" || tipoNormalizado === "baja") &&

      movimiento.cantidad > 0

    );

  };

  const puedeReversarMovimiento = (movimiento: Movimiento) => {

    return (

      esMovimientoConReversa(movimiento) &&

      movimientoEstaDentroDeTiempo(movimiento) &&

      !movimientoYaFueReversado(movimiento)

    );

  };

  const obtenerTituloReversionMovimiento = (movimiento: Movimiento) => {

    if (!esMovimientoConReversa(movimiento)) return "Este movimiento no requiere reversión";

    if (movimientoYaFueReversado(movimiento)) return "Este movimiento ya fue reversado";

    if (!movimientoEstaDentroDeTiempo(movimiento)) return "Tiempo vencido: solo se puede reversar durante 3 horas";

    return "Reversar movimiento";

  };

  const mostrarMensaje = (tipo: "exito" | "error", texto: string) => {

    setMensajeSistema({ tipo, texto });

    window.setTimeout(() => {

      setMensajeSistema(null);

    }, 3000);

  };

  const abrirConfirmacionReversion = (movimiento: Movimiento) => {

    setMovimientoReversar(movimiento);

    setMotivoReversion("");

  };

  const cerrarConfirmacionReversion = () => {

    setMovimientoReversar(null);

    setMotivoReversion("");

  };

  const confirmarReversionMovimiento = async () => {

    if (!movimientoReversar) return;

    const resultado = await reversarMovimientoSolicitud(

      movimientoReversar.id,

      motivoReversion

    );

    if (!resultado.exito) {

      mostrarMensaje("error", resultado.mensaje);

      return;

    }

    cerrarConfirmacionReversion();

    mostrarMensaje("exito", resultado.mensaje);

  };

  const movimientosFiltrados = useMemo(() => {

    const texto = normalizarTexto(busqueda);

    const filtrados = movimientos.filter((movimiento) => {

      const tipoNormalizado = obtenerTipoNormalizado(movimiento.tipo);

      const tipoTexto = obtenerTextoTipo(movimiento.tipo).toLowerCase();

      const destino = obtenerDestinoMovimiento(movimiento);

      const responsableDestino = obtenerResponsableDestino(movimiento);

      const coincideBusqueda =

        texto === "" ||

        tipoTexto.startsWith(texto) ||

        movimiento.producto.toLowerCase().startsWith(texto) ||

        destino.toLowerCase().startsWith(texto) ||

        responsableDestino.toLowerCase().startsWith(texto) ||

        movimiento.usuario.toLowerCase().startsWith(texto);

      const esModificacionDeProducto =

        tipoNormalizado !== "modificacion" ||

        Boolean(obtenerProductoRelacionado(movimiento) || obtenerInventarioRelacionado(movimiento));

      const coincideTipo =

        tipoFiltro === "todos" ? true : tipoNormalizado === tipoFiltro;

      const coincideBodega =

        bodegaFiltro === "todas"

          ? true

          : destino === limpiarNombreBodega(bodegaFiltro) ||

            movimiento.destino === bodegaFiltro;

      const coincideFecha =

        fechaFiltro === ""

          ? true

          : obtenerFechaIso(movimiento.fecha) === fechaFiltro;

      return (

        esModificacionDeProducto &&

        coincideBusqueda &&

        coincideTipo &&

        coincideBodega &&

        coincideFecha

      );

    });

    return [...filtrados].sort((a, b) => {

      const comparacionAlfabetica = a.producto.localeCompare(b.producto, "es", {

        sensitivity: "base",

      });

      if (ordenMovimientos === "az") {

        return comparacionAlfabetica || obtenerFechaHoraOrden(b) - obtenerFechaHoraOrden(a);

      }

      if (ordenMovimientos === "za") {

        return comparacionAlfabetica * -1 || obtenerFechaHoraOrden(b) - obtenerFechaHoraOrden(a);

      }

      const comparacionFechaHora = obtenerFechaHoraOrden(b) - obtenerFechaHoraOrden(a);

      if (comparacionFechaHora !== 0) {

        return ordenMovimientos === "recientes"

          ? comparacionFechaHora

          : comparacionFechaHora * -1;

      }

      return comparacionAlfabetica;

    });

  }, [

    movimientos,

    busqueda,

    tipoFiltro,

    bodegaFiltro,

    fechaFiltro,

    ordenMovimientos,

  ]);

  const filtrosActivos =

    busqueda.trim() !== "" ||

    tipoFiltro !== "todos" ||

    bodegaFiltro !== "todas" ||

    fechaFiltro !== "" ||

    ordenMovimientos !== "recientes";

  const limpiarFiltros = () => {

    setBusqueda("");

    setTipoFiltro("todos");

    setBodegaFiltro("todas");

    setFechaFiltro("");

    setOrdenMovimientos("recientes");

  };

  return (

    <div className="pagina-admin">

      <EncabezadoPagina

        titulo="Movimientos"

        descripcion="Historial de entradas, transferencias, modificaciones de productos y bajas del sistema."

      />

      {mensajeSistema && (

        <div className={`mensaje-flotante mensaje-flotante-${mensajeSistema.tipo}`}>

          {mensajeSistema.texto}

        </div>

      )}

      <section className="seccion-dashboard seccion-movimientos-admin seccion-movimientos-sistema">

        <div className="seccion-dashboard-header movimientos-header-simple">

          <div>

            <h2>Historial de movimientos</h2>

            <p>

              Aquí se registran entradas, transferencias, bajas y modificaciones de productos.

            </p>

          </div>

        </div>

        <div className="movimientos-filtros">

          <div className="buscador-input-contenedor movimientos-buscador">

            <Search size={18} />

            <input

              type="text"

              value={busqueda}

              onChange={(e) => setBusqueda(e.target.value)}

              placeholder="Buscar movimiento..."

            />

          </div>

          <CampoDesplegable

            valor={tipoFiltro}

            alCambiar={(valor) => setTipoFiltro(valor as FiltroTipoMovimiento)}

            opciones={[

              { valor: "todos", texto: "Todos los tipos" },

              { valor: "entrada", texto: "Entrada" },

              { valor: "transferencia", texto: "Transferencia" },

              { valor: "baja", texto: "Baja" },

              { valor: "modificacion", texto: "Modificación" },

            ]}

            ariaLabel="Filtrar por tipo de movimiento"

            ancho={210}

          />

          <CampoDesplegable

            valor={bodegaFiltro}

            alCambiar={setBodegaFiltro}

            opciones={[

              { valor: "todas", texto: "Todas las bodegas" },

              ...bodegasDisponibles.map((bodega) => ({

                valor: bodega,

                texto: limpiarNombreBodega(bodega),

              })),

            ]}

            ariaLabel="Filtrar por bodega destino"

            ancho={230}

          />

          <SelectorFechaMovimiento

            valor={fechaFiltro}

            alCambiar={setFechaFiltro}

          />

          <CampoDesplegable

            valor={ordenMovimientos}

            alCambiar={(valor) => setOrdenMovimientos(valor as OrdenMovimientos)}

            opciones={[

              { valor: "recientes", texto: "Más recientes" },

              { valor: "antiguos", texto: "Más antiguos" },

              { valor: "az", texto: "A → Z" },

              { valor: "za", texto: "Z → A" },

            ]}

            ariaLabel="Ordenar movimientos"

            icono={ordenMovimientos === "za" ? ArrowUpAZ : ArrowDownAZ}

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

        <div className="movimientos-tabla-scroll">

          <TablaBase

            columnas={[

              "Tipo",

              "Registro",

              "Destino",

              "Cantidad",

              "Atributo",

              "Custodio",

              "Fecha",

              "Acciones",

            ]}

            mensajeVacio="No existen movimientos registrados"

          >

            {movimientosFiltrados.length > 0

              ? movimientosFiltrados.map((movimiento) => (

                  <tr key={movimiento.id}>

                    <td>

                      <span

                        className={`badge-movimiento badge-movimiento-${obtenerTipoNormalizado(movimiento.tipo)}`}

                      >

                        {obtenerTextoTipo(movimiento.tipo)}

                      </span>

                    </td>

                    <td>{movimiento.producto}</td>

                    <td>{obtenerDestinoMovimiento(movimiento)}</td>

                    <td>{movimiento.cantidad}</td>

                    <td>

                      {obtenerProductoRelacionado(movimiento)?.tipoProducto === "no_consumible"

                        ? obtenerProductoRelacionado(movimiento)?.empresa || "No registrado"

                        : "No aplica"}

                    </td>

                    <td>{obtenerResponsableDestino(movimiento)}</td>

                    <td className="celda-fecha-movimiento">{formatearFechaMovimiento(movimiento.fecha)}</td>

                    <td>

                      <div className="acciones-tabla acciones-movimientos">

                        <button

                          className="boton-icono-tabla"

                          type="button"

                          title="Ver detalle"

                          onClick={() => setMovimientoDetalle(movimiento)}

                        >

                          !

                        </button>

                        <button

                          className="boton-icono-tabla"

                          type="button"

                          title="Generar reporte PDF"

                          onClick={() => generarPdfBlanco(movimiento)}

                        >

                          <FileText size={18} />

                        </button>

                        {esMovimientoConReversa(movimiento) && (

                          <button

                            className="boton-icono-tabla boton-icono-reversar"

                            type="button"

                            title={obtenerTituloReversionMovimiento(movimiento)}

                            disabled={!puedeReversarMovimiento(movimiento)}

                            onClick={() => abrirConfirmacionReversion(movimiento)}

                          >

                            <RotateCcw size={17} />

                          </button>

                        )}

                      </div>

                    </td>

                  </tr>

                ))

              : null}

          </TablaBase>

        </div>

      </section>

      {movimientoDetalle ? (

        <div className="modal-fondo">

          <div className="modal-contenedor modal-detalle-movimiento">

            <div className="modal-header">

              <div>

                <h2>Detalle del movimiento</h2>

                <p>Información registrada en el historial del sistema.</p>

              </div>

              <div className="modal-movimiento-header-acciones">

                <span

                  className={`badge-movimiento badge-movimiento-${obtenerTipoNormalizado(movimientoDetalle.tipo)}`}

                >

                  {obtenerTextoTipo(movimientoDetalle.tipo)}

                </span>

                <button

                  className="modal-cerrar"

                  type="button"

                  onClick={() => setMovimientoDetalle(null)}

                  aria-label="Cerrar detalle"

                >

                  <X size={20} />

                </button>

              </div>

            </div>

            <div className="detalle-movimiento-grid">

              <div>

                <span>Código del producto</span>

                <p>{obtenerCodigoProductoMovimiento(movimientoDetalle)}</p>

              </div>

              <div>

                <span>Código ULEAM</span>

                <p>{obtenerCodigoUleamMovimiento(movimientoDetalle)}</p>

              </div>

              <div>

                <span>Producto</span>

                <p>{movimientoDetalle.producto}</p>

              </div>

              <div>

                <span>Cantidad</span>

                <p>{movimientoDetalle.cantidad}</p>

              </div>

              <div>

                <span>{obtenerEtiquetaAsignacion(obtenerDestinoMovimiento(movimientoDetalle))}</span>

                <p>{obtenerResponsableDestino(movimientoDetalle)}</p>

              </div>

              <div>

                <span>Origen</span>

                <p>{limpiarNombreBodega(movimientoDetalle.origen) || "General"}</p>

              </div>

              <div>

                <span>Destino</span>

                <p>{obtenerDestinoMovimiento(movimientoDetalle)}</p>

              </div>

              <div>

                <span>Registra</span>

                <p>{movimientoDetalle.usuario}</p>

              </div>

              <div>

                <span>Fecha</span>

                <p>{formatearFechaMovimiento(movimientoDetalle.fecha)}</p>

              </div>

              <div className="detalle-movimiento-observacion">

                <span>Observación</span>

                <p>{obtenerObservacionMovimiento(movimientoDetalle.observacion || "")}</p>

              </div>

            </div>

            <div className="modal-acciones">

              <button

                className="boton-principal"

                type="button"

                onClick={() => generarPdfBlanco(movimientoDetalle)}

              >

                Generar PDF

              </button>

            </div>

          </div>

        </div>

      ) : null}

      {movimientoReversar ? (

        <div className="modal-fondo modal-fondo-confirmacion">

          <div className="modal-contenedor modal-confirmacion-solicitud modal-confirmacion-reversion">

            <div className="modal-header">

              <div>

                <h2>Reversar movimiento</h2>

                <p>

                  Esta acción reversará este movimiento, devolverá el bien según corresponda

                  y registrará una nueva modificación sin borrar el historial original.

                </p>

              </div>

              <button

                className="modal-cerrar"

                type="button"

                onClick={cerrarConfirmacionReversion}

                aria-label="Cerrar confirmación"

              >

                <X size={20} />

              </button>

            </div>

            <div className="detalle-producto-grid detalle-reversion-grid">

              <div>

                <span>Producto</span>

                <strong>{movimientoReversar.producto}</strong>

              </div>

              <div>

                <span>Cantidad</span>

                <strong>{movimientoReversar.cantidad}</strong>

              </div>

              <div>

                <span>Origen</span>

                <strong>{obtenerDestinoMovimiento(movimientoReversar)}</strong>

              </div>

              <div>

                <span>Destino</span>

                <strong>{limpiarNombreBodega(movimientoReversar.origen)}</strong>

              </div>

            </div>

            <div className="formulario-modal formulario-reversion-solicitud">

              <div className="campo-formulario campo-completo">

                <label>Motivo de reversión *</label>

                <textarea

                  value={motivoReversion}

                  onChange={(e) => setMotivoReversion(e.target.value)}

                  placeholder="Ej: Se asignó el producto por error."

                />

              </div>

            </div>

            <div className="modal-acciones">

              <button

                className="boton-secundario"

                type="button"

                onClick={cerrarConfirmacionReversion}

              >

                Cancelar

              </button>

              <button

                className="boton-principal"

                type="button"

                disabled={motivoReversion.trim() === ""}

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

export default MovimientosAdmin;
