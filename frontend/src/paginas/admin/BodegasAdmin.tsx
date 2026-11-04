import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  Building2,
  Edit,
  Plus,
  Paintbrush,
  Search,
  Utensils,
  Warehouse,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import { clienteApi } from "../../api/clienteApi";
import TablaBase from "../../componentes/TablaBase";

import { useConfiguracion } from "../../contexto/ConfiguracionContext";
import { useUsuarios } from "../../contexto/UsuariosContext";
import {
  esSucursalTasty,
  formatearNombresUsuarios,
  obtenerResponsablesSucursal,
  obtenerSupervisoresBodega,
} from "../../utilidades/asignacionesUsuarios";
import {
  useInventario,
  type InventarioBodega,
} from "../../contexto/InventarioContext";
import type { Bodega } from "../../tipos/bodega";
import CampoDesplegable from "../../componentes/CampoDesplegable";

interface FormularioBodega {
  nombre: string;
  descripcion: string;
}

interface MensajeSistema {
  tipo: "exito" | "error";
  texto: string;
}

interface BodegaBackend {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: "inventario_general" | "principal" | "sucursal";
  estado: "activa" | "inactiva";
  esSistema: boolean;
  bodegaPadreId: string | null;
  bodegaPadre: {
    id: string;
    nombre: string;
  } | null;
}

function convertirBodegaBackend(bodega: BodegaBackend): Bodega {
  return {
    id: bodega.id,
    nombre: bodega.nombre,
    descripcion: bodega.descripcion || "",
    ubicacion: "",
    responsable: "",
    estado: bodega.estado,
    stockTotal: 0,
    tipo: bodega.tipo,
    esSistema: bodega.esSistema,
    bodegaPadreId: bodega.bodegaPadreId,
    bodegaPadre: bodega.bodegaPadre,
  };
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
  return "No se pudo completar la operación de bodegas.";
}

type OrdenInventario = "asc" | "desc";
type FiltroEstadoBien = "todos" | "bueno" | "regular" | "malo";

function obtenerTextoEstadoBien(estado?: string) {
  if (estado === "regular") return "Medio";
  if (estado === "malo") return "Malo";
  return "Bueno";
}

function obtenerClaseEstadoBien(estado?: string) {
  if (estado === "regular") return "regular";
  if (estado === "malo") return "malo";
  return "bueno";
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

const formularioInicial: FormularioBodega = {
  nombre: "",
  descripcion: "",
};

function BodegasAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { categoriasActivas } = useConfiguracion();
  const { usuarios, recargarUsuarios } = useUsuarios();
  const { obtenerInventarioPorBodega, obtenerProductoPorId } = useInventario();

  const obtenerTextoSupervisores = (nombreBodega: string) =>
    formatearNombresUsuarios(
      obtenerSupervisoresBodega(usuarios, nombreBodega),
      "Sin supervisor asignado"
    );

  const obtenerTextoResponsables = (nombreSucursal: string) =>
    formatearNombresUsuarios(
      obtenerResponsablesSucursal(usuarios, nombreSucursal),
      "Sin responsable asignado"
    );

  const [busqueda, setBusqueda] = useState("");
  const [busquedaInventario, setBusquedaInventario] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [estadoFiltroInventario, setEstadoFiltroInventario] =
    useState<FiltroEstadoBien>("todos");
  const [ordenInventario, setOrdenInventario] =
    useState<OrdenInventario>("asc");

  const [modalBodegaAbierto, setModalBodegaAbierto] = useState(false);
  const [bienDetalle, setBienDetalle] = useState<InventarioBodega | null>(null);
  const [bodegaEditando, setBodegaEditando] = useState<Bodega | null>(null);
  const [mensajeSistema, setMensajeSistema] =
    useState<MensajeSistema | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioBodega>(formularioInicial);

  const [bodegasSistema, setBodegasSistema] = useState<Bodega[]>([]);
  const cargarBodegas = useCallback(async () => {
    try {
      const { data } = await clienteApi.get<BodegaBackend[]>("/bodegas");
      setBodegasSistema(data.map(convertirBodegaBackend));
    } catch (error) {
      mostrarMensaje("error", obtenerMensajeError(error));
      setBodegasSistema([]);
    }
  }, []);

  useEffect(() => {
    void cargarBodegas();
  }, [cargarBodegas]);

  const bodegasListado: Bodega[] = useMemo(
    () => bodegasSistema.filter((bodega) => bodega.tipo === "principal"),
    [bodegasSistema],
  );

  const gastronomiaTasty = useMemo(
    () =>
      bodegasListado.find(
        (bodega) => bodega.nombre.toLowerCase() === "gastronomía tasty",
      ),
    [bodegasListado],
  );

  const sucursalesTastyEditadas = useMemo(
    () =>
      bodegasSistema.filter(
        (bodega) =>
          bodega.tipo === "sucursal" &&
          Boolean(gastronomiaTasty) &&
          (bodega.bodegaPadreId === String(gastronomiaTasty?.id) ||
            bodega.bodegaPadre?.nombre.toLowerCase() === "gastronomía tasty"),
      ),
    [bodegasSistema, gastronomiaTasty],
  );

  const bodegasDisponibles: Bodega[] = useMemo(
    () => [...bodegasListado, ...sucursalesTastyEditadas],
    [bodegasListado, sucursalesTastyEditadas],
  );

  const bodegaSeleccionada = id
    ? bodegasDisponibles.find((bodega) => String(bodega.id) === id)
    : null;

  const esGastronomiaTasty =
    bodegaSeleccionada?.nombre.toLowerCase() === "gastronomía tasty";

  const esBodegaSeleccionadaSucursalTasty = Boolean(
    bodegaSeleccionada &&
      sucursalesTastyEditadas.some(
        (sucursal) => sucursal.id === bodegaSeleccionada.id
      )
  );

  const filtrosInventarioActivos =
    busquedaInventario.trim() !== "" ||
    categoriaFiltro !== "todas" ||
    estadoFiltroInventario !== "todos" ||
    ordenInventario !== "asc";

  const mostrarMensaje = (tipo: MensajeSistema["tipo"], texto: string) => {
    setMensajeSistema({ tipo, texto });

    window.setTimeout(() => {
      setMensajeSistema(null);
    }, 3200);
  };

  const obtenerIconoBodega = (bodega: Bodega) => {
    const nombre = bodega.nombre.toLowerCase();

    if (nombre.includes("tasty") || nombre.includes("gastronomía")) {
      return <Utensils size={21} />;
    }

    if (nombre.includes("limpieza")) {
      return <Paintbrush size={21} />;
    }

    if (nombre.includes("oficina")) {
      return <Building2 size={21} />;
    }

    return <Warehouse size={21} />;
  };


  const obtenerColorIconoBodega = (nombreBodega: string) => {
    const nombre = nombreBodega.toLowerCase();

    if (nombre.includes("tasty") || nombre.includes("gastronomía")) {
      return { background: "#ffedd5", color: "#ea580c" };
    }

    if (nombre.includes("limpieza")) {
      return { background: "#dbeafe", color: "#1d4ed8" };
    }

    if (nombre.includes("oficina")) {
      return { background: "#dcfce7", color: "#15803d" };
    }

    return { background: "#f3eadf", color: "#8b5e34" };
  };

  const navegarABodega = (bodega: Bodega) => {
    navigate(`/admin/bodegas/${bodega.id}`);
  };

  const volverDesdeDetalle = () => {
    if (esBodegaSeleccionadaSucursalTasty && gastronomiaTasty) {
      navigate(`/admin/bodegas/${gastronomiaTasty.id}`);
      return;
    }

    navigate("/admin/bodegas");
  };

  const actualizarCampo = <K extends keyof FormularioBodega>(
    campo: K,
    valor: FormularioBodega[K]
  ) => {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));
  };

  const abrirModalCrear = () => {
    setBodegaEditando(null);
    setFormulario(formularioInicial);
    setModalBodegaAbierto(true);
  };

  const abrirModalEditar = (bodega: Bodega) => {
    if (bodega.esSistema) {
      mostrarMensaje(
        "error",
        "Las bodegas oficiales del sistema están protegidas y no pueden editarse.",
      );
      return;
    }

    setBodegaEditando(bodega);

    setFormulario({
      nombre: bodega.nombre,
      descripcion: bodega.descripcion,
    });

    setModalBodegaAbierto(true);
  };

  const cerrarModalBodega = () => {
    setBodegaEditando(null);
    setFormulario(formularioInicial);
    setModalBodegaAbierto(false);
  };

  const limpiarFiltrosInventario = () => {
    setBusquedaInventario("");
    setCategoriaFiltro("todas");
    setEstadoFiltroInventario("todos");
    setOrdenInventario("asc");
  };

  const guardarBodega = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nombre = formulario.nombre.trim();
    const descripcion = formulario.descripcion.trim();

    if (nombre.length < 3) {
      mostrarMensaje(
        "error",
        "El nombre de la bodega debe tener al menos 3 caracteres.",
      );
      return;
    }

    if (descripcion.length < 6) {
      mostrarMensaje(
        "error",
        "Agrega una descripción más clara para la bodega.",
      );
      return;
    }

    const existeBodega = bodegasSistema.some(
      (bodega) =>
        bodega.nombre.trim().toLowerCase() === nombre.toLowerCase() &&
        String(bodega.id) !== String(bodegaEditando?.id ?? ""),
    );

    if (existeBodega) {
      mostrarMensaje("error", "Ya existe una bodega registrada con ese nombre.");
      return;
    }

    try {
      if (bodegaEditando) {
        if (bodegaEditando.esSistema) {
          mostrarMensaje(
            "error",
            "Las bodegas oficiales del sistema están protegidas y no pueden editarse.",
          );
          return;
        }

        await clienteApi.patch(`/bodegas/${bodegaEditando.id}`, {
          nombre,
          descripcion,
        });
      } else {
        await clienteApi.post("/bodegas", {
          nombre,
          descripcion,
          tipo: "principal",
        });
      }

      await cargarBodegas();
      await recargarUsuarios();

      const fueEdicion = Boolean(bodegaEditando);
      cerrarModalBodega();
      mostrarMensaje(
        "exito",
        fueEdicion
          ? "Bodega actualizada correctamente."
          : "Bodega creada correctamente.",
      );
    } catch (error) {
      mostrarMensaje("error", obtenerMensajeError(error));
    }
  };

  const bodegasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return bodegasListado;

    return bodegasListado.filter(
      (bodega) =>
        bodega.nombre.toLowerCase().includes(texto) ||
        bodega.descripcion.toLowerCase().includes(texto)
    );
  }, [busqueda, bodegasListado]);

  const inventarioSeleccionado = useMemo(() => {
    if (!bodegaSeleccionada) return [];

    if (esGastronomiaTasty) {
      const nombresBodegasTasty = [
        bodegaSeleccionada.nombre,
        ...sucursalesTastyEditadas.map((sucursal) => sucursal.nombre),
      ];

      return nombresBodegasTasty.flatMap((nombreBodega) =>
        obtenerInventarioPorBodega(nombreBodega)
      );
    }

    return obtenerInventarioPorBodega(bodegaSeleccionada.nombre);
  }, [
    bodegaSeleccionada,
    esGastronomiaTasty,
    obtenerInventarioPorBodega,
    sucursalesTastyEditadas,
  ]);

  const inventarioFiltrado = useMemo(() => {
    const texto = busquedaInventario.trim().toLowerCase();

    const inventario = inventarioSeleccionado.filter((item) => {
      const coincideBusqueda =
        texto === "" ||
        item.codigo.toLowerCase().includes(texto) ||
        item.descripcion.toLowerCase().includes(texto) ||
        item.categoria.toLowerCase().includes(texto);

      const coincideCategoria =
        categoriaFiltro === "todas" ? true : item.categoria === categoriaFiltro;

      const productoRelacionado = obtenerProductoPorId(item.productoId);
      const estadoItem = obtenerClaseEstadoBien(productoRelacionado?.estadoBien);
      const coincideEstado =
        estadoFiltroInventario === "todos" ? true : estadoItem === estadoFiltroInventario;

      return coincideBusqueda && coincideCategoria && coincideEstado;
    });

    return [...inventario].sort((a, b) => {
      const comparacionFecha =
        obtenerDiaOrden(b.fechaAsignacion) - obtenerDiaOrden(a.fechaAsignacion);

      if (comparacionFecha !== 0) return comparacionFecha;

      const comparacionAlfabetica = a.descripcion.localeCompare(
        b.descripcion,
        "es",
        { sensitivity: "base" }
      );

      return ordenInventario === "asc"
        ? comparacionAlfabetica
        : comparacionAlfabetica * -1;
    });
  }, [
    inventarioSeleccionado,
    busquedaInventario,
    categoriaFiltro,
    estadoFiltroInventario,
    ordenInventario,
    obtenerProductoPorId,
  ]);

  if (bodegaSeleccionada) {
    return (
      <div className="pagina-admin">
        {mensajeSistema && (
          <div
            style={{
              position: "fixed",
              top: "24px",
              right: "28px",
              zIndex: 150,
              padding: "14px 18px",
              borderRadius: "12px",
              background:
                mensajeSistema.tipo === "exito" ? "#dcfce7" : "#fee2e2",
              color: mensajeSistema.tipo === "exito" ? "#15803d" : "#b91c1c",
              border:
                mensajeSistema.tipo === "exito"
                  ? "1px solid #bbf7d0"
                  : "1px solid #fecaca",
              fontWeight: 700,
              boxShadow: "0 14px 30px rgba(15, 23, 42, 0.14)",
            }}
          >
            {mensajeSistema.texto}
          </div>
        )}

        <button
          className="boton-volver"
          type="button"
          onClick={volverDesdeDetalle}
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <EncabezadoPagina
          titulo={bodegaSeleccionada.nombre}
          descripcion={
            esGastronomiaTasty
              ? "Bodega general de Gastronomía Tasty."
              : bodegaSeleccionada.descripcion
          }
        />

        <section className="seccion-dashboard">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "18px",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              background: "#ffffff",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "15px",
                background: obtenerColorIconoBodega(bodegaSeleccionada.nombre).background,
                color: obtenerColorIconoBodega(bodegaSeleccionada.nombre).color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {obtenerIconoBodega(bodegaSeleccionada)}
            </div>

            <div style={{ flex: 1 }}>
              <h2
                style={{
                  margin: "0 0 5px",
                  color: "#111827",
                  fontSize: "22px",
                  fontWeight: 800,
                }}
              >
                {bodegaSeleccionada.nombre}
              </h2>

              <p
                style={{
                  margin: "0 0 8px",
                  color: "#64748b",
                  fontSize: "15px",
                  lineHeight: "1.45",
                }}
              >
                {bodegaSeleccionada.descripcion}
              </p>

              <div style={{ display: "grid", gap: "4px" }}>
                <div>
                  <span
                    style={{
                      color: "#64748b",
                      fontSize: "14px",
                    }}
                  >
                    Supervisor:
                  </span>

                  <strong
                    style={{
                      marginLeft: "6px",
                      color: "#111827",
                      fontSize: "14px",
                    }}
                  >
                    {obtenerTextoSupervisores(bodegaSeleccionada.nombre)}
                  </strong>
                </div>

                {esSucursalTasty(bodegaSeleccionada.nombre) && (
                  <div>
                    <span
                      style={{
                        color: "#64748b",
                        fontSize: "14px",
                      }}
                    >
                      Responsable:
                    </span>

                    <strong
                      style={{
                        marginLeft: "6px",
                        color: "#111827",
                        fontSize: "14px",
                      }}
                    >
                      {obtenerTextoResponsables(bodegaSeleccionada.nombre)}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <button
              className="boton-secundario"
              type="button"
              onClick={() => abrirModalEditar(bodegaSeleccionada)}
            >
              <Edit size={17} />
              Editar
            </button>
          </div>
        </section>

        <section className="seccion-dashboard seccion-inventario-bodega">
          <div className="seccion-dashboard-header">
            <div>
              <h2>
                {esGastronomiaTasty
                  ? "Inventario general de Gastronomía Tasty"
                  : "Inventario de bodega"}
              </h2>
              <p>
                {esGastronomiaTasty
                  ? "Bienes físicos asignados a Gastronomía Tasty y sus sucursales."
                  : "Bienes asignados a esta bodega."}
              </p>
            </div>
          </div>

          <div className="buscador-tabla" style={{ alignItems: "center" }}>
            <div className="buscador-input-contenedor">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar bien por código, nombre o categoría..."
                value={busquedaInventario}
                onChange={(e) => setBusquedaInventario(e.target.value)}
              />
            </div>

            <CampoDesplegable
              valor={categoriaFiltro}
              alCambiar={setCategoriaFiltro}
              opciones={[
                { valor: "todas", texto: "Todas las categorías" },
                ...categoriasActivas.map((categoria) => ({
                  valor: categoria.nombre,
                  texto: categoria.nombre,
                })),
              ]}
              ariaLabel="Filtrar por categoría"
              ancho={280}
              anchoMinimo={280}
              anchoMenu={280}
            />

            <CampoDesplegable
              valor={estadoFiltroInventario}
              alCambiar={(valor) => setEstadoFiltroInventario(valor as FiltroEstadoBien)}
              opciones={[
                { valor: "todos", texto: "Todo estado" },
                { valor: "bueno", texto: "Bueno" },
                { valor: "regular", texto: "Medio" },
                { valor: "malo", texto: "Malo" },
              ]}
              ariaLabel="Filtrar por estado"
              ancho={210}
              anchoMinimo={210}
              anchoMenu={210}
            />

            <button
              type="button"
              onClick={() =>
                setOrdenInventario((ordenActual) =>
                  ordenActual === "asc" ? "desc" : "asc"
                )
              }
              title={
                ordenInventario === "asc"
                  ? "Orden ascendente"
                  : "Orden descendente"
              }
              style={{
                width: "54px",
                height: "45px",
                minWidth: "54px",
                padding: 0,
                margin: 0,
                boxSizing: "border-box",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                lineHeight: 0,
              }}
            >
              {ordenInventario === "asc" ? (
                <ArrowDownAZ size={19} />
              ) : (
                <ArrowUpAZ size={19} />
              )}
            </button>

            <button
              type="button"
              onClick={limpiarFiltrosInventario}
              disabled={!filtrosInventarioActivos}
              title="Limpiar filtros"
              style={{
                width: "54px",
                height: "45px",
                minWidth: "54px",
                padding: 0,
                margin: 0,
                boxSizing: "border-box",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: filtrosInventarioActivos ? 1 : 0.55,
                cursor: filtrosInventarioActivos ? "pointer" : "not-allowed",
                lineHeight: 0,
              }}
            >
              <Paintbrush size={18} />
            </button>
          </div>

          <div className="inventario-bodega-tabla-ajustada">
            <TablaBase
              columnas={[
                "Código",
                "Bien",
                "Categoría",
                "Atributo",
                "Cantidad",
                "Estado",
                "Fecha asignación",
                "Acciones",
              ]}
              mensajeVacio="Esta bodega aún no tiene bienes asignados"
            >
            {inventarioFiltrado.length > 0
              ? inventarioFiltrado.map((item) => (
                  <tr key={`${item.id}-${item.bodega}`}>
                    <td>
                      <strong>{item.codigo}</strong>
                    </td>

                    <td>
                      <strong>{item.descripcion}</strong>
                    </td>

                    <td>{item.categoria}</td>

                    <td>
                      {obtenerProductoPorId(item.productoId)?.tipoProducto === "no_consumible"
                        ? obtenerProductoPorId(item.productoId)?.empresa || "No registrado"
                        : "No aplica"}
                    </td>

                    <td>
                      <strong>{item.cantidad}</strong>
                    </td>

                    <td>
                      {(() => {
                        const productoRelacionado = obtenerProductoPorId(item.productoId);
                        const estadoClase = obtenerClaseEstadoBien(productoRelacionado?.estadoBien);

                        return (
                          <span className={`badge-bien badge-bien-${estadoClase}`}>
                            {obtenerTextoEstadoBien(productoRelacionado?.estadoBien)}
                          </span>
                        );
                      })()}
                    </td>

                    <td>{item.fechaAsignacion}</td>

                    <td>
                      <div className="acciones-tabla">
                        <button
                          className="boton-icono-tabla"
                          type="button"
                          title="Ver información"
                          onClick={() => setBienDetalle(item)}
                        >
                          <span className="boton-info-bien">!</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
            </TablaBase>
          </div>
        </section>

        {esGastronomiaTasty && (
          <section className="seccion-dashboard">
            <div className="seccion-dashboard-header">
              <div>
                <h2>Sucursales Tasty</h2>
                <p>
                  Selecciona una sucursal para revisar su inventario individual.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "14px",
                alignItems: "stretch",
              }}
            >
              {sucursalesTastyEditadas.map((sucursal) => (
                <button
                  key={sucursal.id}
                  type="button"
                  onClick={() => navigate(`/admin/bodegas/${sucursal.id}`)}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "15px",
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                    minHeight: "145px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "#f97316",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "10px",
                      flexShrink: 0,
                    }}
                  >
                    <Utensils size={19} />
                  </div>

                  <h3
                    style={{
                      margin: "0 0 6px",
                      color: "#111827",
                      fontSize: "16px",
                      fontWeight: 800,
                    }}
                  >
                    {sucursal.nombre}
                  </h3>

                  <p
                    style={{
                      margin: "0 0 10px",
                      color: "#64748b",
                      fontSize: "13px",
                      lineHeight: "1.35",
                      flex: 1,
                    }}
                  >
                    {sucursal.descripcion}
                  </p>

                  <div style={{ display: "grid", gap: "3px" }}>
                    <div>
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "13px",
                        }}
                      >
                        Supervisor:
                      </span>

                      <strong
                        style={{
                          marginLeft: "5px",
                          color: "#111827",
                          fontSize: "13px",
                        }}
                      >
                        {obtenerTextoSupervisores(sucursal.nombre)}
                      </strong>
                    </div>

                    <div>
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "13px",
                        }}
                      >
                        Responsable:
                      </span>

                      <strong
                        style={{
                          marginLeft: "5px",
                          color: "#111827",
                          fontSize: "13px",
                        }}
                      >
                        {obtenerTextoResponsables(sucursal.nombre)}
                      </strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {bienDetalle && (
          <div className="modal-fondo">
            <div className="modal-contenedor modal-detalle-producto modal-detalle-bodega-compacto" style={{ maxWidth: 1100 }}>
              <div className="modal-header">
                <div>
                  <h2>Información del bien</h2>
                </div>

                <button
                  className="modal-cerrar"
                  type="button"
                  onClick={() => setBienDetalle(null)}
                >
                  <X size={20} />
                </button>
              </div>

              {(() => {
                const productoRelacionado = obtenerProductoPorId(
                  bienDetalle.productoId
                );

                const detalles = [
                  { campo: "Código", valor: bienDetalle.codigo },
                  { campo: "Bien", valor: bienDetalle.descripcion },
                  { campo: "Categoría", valor: bienDetalle.categoria },
                  { campo: "Cantidad", valor: String(bienDetalle.cantidad) },
                  { campo: "Bodega", valor: bienDetalle.bodega.replace("Bodega ", "") },
                  { campo: "Fecha de asignación", valor: bienDetalle.fechaAsignacion },
                  { campo: "Código ULEAM", valor: productoRelacionado?.codigoUleam },
                  { campo: "Tipo", valor: productoRelacionado?.tipoProducto === "consumible" ? "Consumible" : "No consumible" },
                  { campo: "Atributo", valor: productoRelacionado?.tipoProducto === "no_consumible" ? productoRelacionado?.empresa || "No registrado" : "No aplica" },
                  { campo: "Estado", valor: productoRelacionado?.estadoBien === "bueno" ? "Bueno" : productoRelacionado?.estadoBien === "regular" ? "Medio" : productoRelacionado?.estadoBien === "malo" ? "Malo" : undefined },
                  { campo: "Serie", valor: productoRelacionado?.serie },
                  { campo: "Modelo", valor: productoRelacionado?.modelo },
                  { campo: "Marca", valor: productoRelacionado?.marca },
                  { campo: "Material", valor: productoRelacionado?.material },
                  { campo: "Color", valor: productoRelacionado?.color },
                  { campo: "Dimensiones", valor: productoRelacionado?.dimensiones },
                  { campo: "Procedencia", valor: productoRelacionado?.procedencia },
                ];

                return (
                  <>
                    <div className="detalle-producto-grid detalle-producto-grid-compacto">
                      {detalles.map((item) => (
                        <div key={item.campo} className="detalle-producto-item">
                          <span>{item.campo}</span>
                          <p>{item.valor || "No especificado"}</p>
                        </div>
                      ))}

                      <div className="detalle-producto-item detalle-producto-observacion">
                        <span>Observación</span>
                        <p>{productoRelacionado?.observacion || "Sin observación"}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {modalBodegaAbierto && (
          <div className="modal-fondo">
            <div className="modal-contenedor" style={{ maxWidth: 620 }}>
              <div className="modal-header">
                <div>
                  <h2>{bodegaEditando ? "Editar bodega" : "Nueva bodega"}</h2>
                  <p>
                    {bodegaEditando
                      ? "Actualiza los datos principales de la bodega."
                      : "Registra una bodega institucional dentro del sistema."}
                  </p>
                </div>

                <button
                  className="modal-cerrar"
                  type="button"
                  onClick={cerrarModalBodega}
                >
                  <X size={20} />
                </button>
              </div>

              <form className="formulario-modal" onSubmit={guardarBodega}>
                <div className="grid-formulario">
                  <div className="campo-formulario campo-completo">
                    <label>Nombre de la bodega *</label>
                    <input
                      required
                      value={formulario.nombre}
                      onChange={(e) =>
                        actualizarCampo("nombre", e.target.value)
                      }
                      placeholder="Ej: Bodega Tecnológica"
                    />
                  </div>

                  <div className="campo-formulario campo-completo">
                    <label>Descripción *</label>
                    <input
                      required
                      value={formulario.descripcion}
                      onChange={(e) =>
                        actualizarCampo("descripcion", e.target.value)
                      }
                      placeholder="Ej: Almacén de equipos y recursos tecnológicos."
                    />
                  </div>
                </div>

                <div className="modal-acciones">
                  <button
                    className="boton-secundario"
                    type="button"
                    onClick={cerrarModalBodega}
                  >
                    Cancelar
                  </button>

                  <button
                    className="boton-principal"
                    type="submit"
                  >
                    {bodegaEditando ? "Guardar cambios" : "Guardar bodega"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pagina-admin">
      <EncabezadoPagina
        titulo="Gestión de Bodegas"
        descripcion="Administra las bodegas principales y sus datos registrados."
      />

      {mensajeSistema && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "28px",
            zIndex: 150,
            padding: "14px 18px",
            borderRadius: "12px",
            background:
              mensajeSistema.tipo === "exito" ? "#dcfce7" : "#fee2e2",
            color: mensajeSistema.tipo === "exito" ? "#15803d" : "#b91c1c",
            border:
              mensajeSistema.tipo === "exito"
                ? "1px solid #bbf7d0"
                : "1px solid #fecaca",
            fontWeight: 700,
            boxShadow: "0 14px 30px rgba(15, 23, 42, 0.14)",
          }}
        >
          {mensajeSistema.texto}
        </div>
      )}

      <section className="seccion-dashboard">
        <div className="seccion-dashboard-header">
          <div>
            <h2>Listado de bodegas</h2>
            <p>Selecciona una bodega para revisar su inventario asignado.</p>
          </div>

          <button
            className="boton-principal"
            type="button"
            onClick={abrirModalCrear}
          >
            <Plus size={18} />
            Nueva bodega
          </button>
        </div>

        <div className="buscador-tabla">
          <div className="buscador-input-contenedor">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar bodega..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "14px",
            alignItems: "stretch",
          }}
        >
          {bodegasFiltradas.map((bodega) => {
            return (
              <button
                key={bodega.id}
                type="button"
                onClick={() => navegarABodega(bodega)}
                style={{
                  width: "100%",
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "16px",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                  minHeight: "150px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "13px",
                    background: obtenerColorIconoBodega(bodega.nombre).background,
                    color: obtenerColorIconoBodega(bodega.nombre).color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginBottom: "11px",
                  }}
                >
                  {obtenerIconoBodega(bodega)}
                </div>

                <h3
                  style={{
                    margin: "0 0 7px",
                    color: "#111827",
                    fontSize: "17px",
                    fontWeight: 800,
                  }}
                >
                  {bodega.nombre}
                </h3>

                <p
                  style={{
                    margin: "0 0 11px",
                    color: "#64748b",
                    fontSize: "13.5px",
                    lineHeight: "1.35",
                    flex: 1,
                  }}
                >
                  {bodega.descripcion}
                </p>

                <div
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    paddingTop: "9px",
                    display: "grid",
                    gap: "3px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: "#64748b",
                        fontSize: "13px",
                      }}
                    >
                      Supervisor:
                    </span>

                    <strong
                      style={{
                        marginLeft: "5px",
                        color: "#111827",
                        fontSize: "13.5px",
                      }}
                    >
                      {obtenerTextoSupervisores(bodega.nombre)}
                    </strong>
                  </div>

                  {esSucursalTasty(bodega.nombre) && (
                    <div>
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "13px",
                        }}
                      >
                        Responsable:
                      </span>

                      <strong
                        style={{
                          marginLeft: "5px",
                          color: "#111827",
                          fontSize: "13.5px",
                        }}
                      >
                        {obtenerTextoResponsables(bodega.nombre)}
                      </strong>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {modalBodegaAbierto && (
        <div className="modal-fondo">
          <div className="modal-contenedor" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div>
                <h2>{bodegaEditando ? "Editar bodega" : "Nueva bodega"}</h2>
                <p>
                  {bodegaEditando
                    ? "Actualiza los datos principales de la bodega."
                    : "Registra una bodega institucional dentro del sistema."}
                </p>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={cerrarModalBodega}
              >
                <X size={20} />
              </button>
            </div>

            <form className="formulario-modal" onSubmit={guardarBodega}>
              <div className="grid-formulario">
                <div className="campo-formulario campo-completo">
                  <label>Nombre de la bodega *</label>
                  <input
                    required
                    value={formulario.nombre}
                    onChange={(e) => actualizarCampo("nombre", e.target.value)}
                    placeholder="Ej: Bodega Tecnológica"
                  />
                </div>

                <div className="campo-formulario campo-completo">
                  <label>Descripción *</label>
                  <input
                    required
                    value={formulario.descripcion}
                    onChange={(e) =>
                      actualizarCampo("descripcion", e.target.value)
                    }
                    placeholder="Ej: Almacén de equipos y recursos tecnológicos."
                  />
                </div>
              </div>

              <div className="modal-acciones">
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={cerrarModalBodega}
                >
                  Cancelar
                </button>

                <button
                  className="boton-principal"
                  type="submit"
                >
                  {bodegaEditando ? "Guardar cambios" : "Guardar bodega"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BodegasAdmin;