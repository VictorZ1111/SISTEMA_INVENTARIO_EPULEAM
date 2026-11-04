import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  Box,
  Building2,
  Paintbrush,
  Search,
  Utensils,
  Warehouse,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import TablaBase from "../../componentes/TablaBase";
import CampoDesplegable from "../../componentes/CampoDesplegable";

import { useAuth } from "../../contexto/AuthContext";
import {
  SUCURSALES_TASTY,
  esBodegaGastronomiaAgrupada,
  obtenerBodegasPrincipalesUsuario,
  obtenerSucursalesTastyUsuario,
} from "../../dominio/bodegas";
import { useUsuarios } from "../../contexto/UsuariosContext";
import { obtenerSupervisorBodega } from "../../utilidades/asignacionesUsuarios";
import { useConfiguracion } from "../../contexto/ConfiguracionContext";
import {
  useInventario,
  type InventarioBodega,
} from "../../contexto/InventarioContext";

type OrdenBienes = "asc" | "desc";
type FiltroEstadoBien = "todos" | "bueno" | "regular" | "malo";

function limpiarNombreBodega(bodega: string) {
  return bodega.replace(/^Bodega\s+/i, "").trim();
}

function normalizarTexto(etiqueta: string) {
  return etiqueta
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function obtenerDescripcionBodega(bodega: string) {
  const nombre = normalizarTexto(limpiarNombreBodega(bodega));

  if (nombre.includes("limpieza")) return "Inventario de aseo e higiene institucional.";
  if (nombre.includes("oficina")) return "Bienes y suministros administrativos asignados.";
  if (nombre.includes("gastronom")) {
    return "Inventario general de las sucursales Tasty asignadas.";
  }
  if (nombre.includes("tasty")) return "Sucursal gastronómica asignada a tu responsabilidad.";
  if (nombre.includes("inventario") || nombre.includes("general")) {
    return "Registro general de bienes institucionales.";
  }

  return "Bodega asignada para consulta de inventario.";
}

function obtenerIconoBodega(bodega: string) {
  const nombre = normalizarTexto(limpiarNombreBodega(bodega));

  if (nombre.includes("limpieza")) return Paintbrush;
  if (nombre.includes("oficina")) return Building2;
  if (nombre.includes("gastronom") || nombre.includes("tasty")) return Utensils;
  if (nombre.includes("inventario") || nombre.includes("general")) return Box;

  return Warehouse;
}

function obtenerClaseBodega(bodega: string) {
  const nombre = normalizarTexto(limpiarNombreBodega(bodega));

  if (nombre.includes("limpieza")) return "icono-bodega-limpieza";
  if (nombre.includes("oficina")) return "icono-bodega-oficina";
  if (nombre.includes("gastronom") || nombre.includes("tasty")) {
    return "icono-bodega-gastronomia";
  }
  if (nombre.includes("inventario") || nombre.includes("general")) {
    return "icono-bodega-inventario";
  }

  return "icono-bodega-generica";
}

function obtenerTextoEstadoBien(estado: string | undefined) {
  const estadoNormalizado = normalizarTexto(estado || "bueno");

  if (estadoNormalizado === "regular" || estadoNormalizado === "medio") return "Medio";
  if (estadoNormalizado === "malo" || estadoNormalizado === "bajo") return "Bajo";

  return "Bueno";
}

function obtenerClaseEstadoBien(estado: string | undefined) {
  const estadoNormalizado = normalizarTexto(estado || "bueno");

  if (estadoNormalizado === "regular" || estadoNormalizado === "medio") return "regular";
  if (estadoNormalizado === "malo" || estadoNormalizado === "bajo") return "malo";

  return "bueno";
}

function obtenerEstadoBien(
  item: InventarioBodega,
  productos: ReturnType<typeof useInventario>["productos"]
) {
  const producto =
    item.producto ||
    productos.find((productoActual) => productoActual.id === item.productoId);

  return obtenerClaseEstadoBien(String(producto?.estadoBien || "bueno"));
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

function MiBodegaResponsable() {
  const { usuarioActual } = useAuth();
  const { usuarios } = useUsuarios();
  const { obtenerInventarioPorBodega, productos } = useInventario();
  const { categoriasActivas } = useConfiguracion();

  const bodegasPrincipales = useMemo(
    () => obtenerBodegasPrincipalesUsuario(usuarioActual),
    [usuarioActual]
  );

  const sucursalesTasty = useMemo(
    () => obtenerSucursalesTastyUsuario(usuarioActual),
    [usuarioActual]
  );

  const [busqueda, setBusqueda] = useState("");
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstadoBien>("todos");
  const [orden, setOrden] = useState<OrdenBienes>("asc");
  const [detalleBien, setDetalleBien] = useState<InventarioBodega | null>(null);

  useEffect(() => {
    const bodegaGuardada = sessionStorage.getItem("epuleam_bodega_responsable");

    if (!bodegaGuardada) return;

    const bodegasPermitidas = [...bodegasPrincipales, ...sucursalesTasty];
    const existeAsignacion = bodegasPermitidas.some(
      (bodega) => normalizarTexto(bodega) === normalizarTexto(bodegaGuardada)
    );

    if (existeAsignacion) {
      setBodegaSeleccionada(bodegaGuardada);
    }

    sessionStorage.removeItem("epuleam_bodega_responsable");
  }, [bodegasPrincipales, sucursalesTasty]);

  const inventarioUsuario = useMemo(() => {
    if (!bodegaSeleccionada) return [];

    if (esBodegaGastronomiaAgrupada(bodegaSeleccionada)) {
      return SUCURSALES_TASTY.flatMap((sucursal) =>
        obtenerInventarioPorBodega(sucursal)
      );
    }

    return obtenerInventarioPorBodega(bodegaSeleccionada);
  }, [bodegaSeleccionada, obtenerInventarioPorBodega]);

  const categoriasDisponibles = useMemo(() => {
    return [...categoriasActivas].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
    );
  }, [categoriasActivas]);

  const bienesFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    const filtrados = inventarioUsuario.filter((item) => {
      const estadoBien = obtenerEstadoBien(item, productos);
      const contenido = normalizarTexto(
        `${item.codigo} ${item.descripcion} ${item.categoria} ${item.bodega} ${obtenerTextoEstadoBien(estadoBien)}`
      );

      const coincideBusqueda = texto === "" || contenido.includes(texto);
      const coincideCategoria =
        categoriaFiltro === "todas" ? true : item.categoria === categoriaFiltro;
      const coincideEstado =
        estadoFiltro === "todos" ? true : estadoBien === estadoFiltro;

      return coincideBusqueda && coincideCategoria && coincideEstado;
    });

    return [...filtrados].sort((a, b) => {
      const comparacionFecha =
        obtenerDiaOrden(b.fechaAsignacion) - obtenerDiaOrden(a.fechaAsignacion);

      if (comparacionFecha !== 0) return comparacionFecha;

      const comparacionAlfabetica = a.descripcion.localeCompare(
        b.descripcion,
        "es",
        { sensitivity: "base" }
      );

      return orden === "asc"
        ? comparacionAlfabetica
        : comparacionAlfabetica * -1;
    });
  }, [inventarioUsuario, productos, busqueda, categoriaFiltro, estadoFiltro, orden]);

  const seleccionarBodega = (bodega: string) => {
    setBodegaSeleccionada(bodega);
    setBusqueda("");
    setCategoriaFiltro("todas");
    setEstadoFiltro("todos");
    setOrden("asc");
  };

  const volverABodegas = () => {
    setBodegaSeleccionada("");
    setBusqueda("");
    setCategoriaFiltro("todas");
    setEstadoFiltro("todos");
    setOrden("asc");
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setCategoriaFiltro("todas");
    setEstadoFiltro("todos");
    setOrden("asc");
  };

  const filtrosActivos =
    busqueda.trim() !== "" ||
    categoriaFiltro !== "todas" ||
    estadoFiltro !== "todos" ||
    orden !== "asc";

  const mostrarSucursalEnTabla =
    bodegaSeleccionada !== "" && esBodegaGastronomiaAgrupada(bodegaSeleccionada);

  return (
    <div className="pagina-admin pagina-responsable">
      {bodegaSeleccionada && (
        <button className="boton-volver" type="button" onClick={volverABodegas}>
          <ArrowLeft size={18} />
          Volver
        </button>
      )}

      <EncabezadoPagina
        titulo="Mis bodegas"
        descripcion="Consulta el inventario de las bodegas asignadas a tu supervisión."
      />

      {!bodegaSeleccionada ? (
        <section className="seccion-dashboard">
          <div className="seccion-dashboard-header solicitudes-header-simple">
            <div>
              <h2>Bodegas asignadas</h2>
              <p>Selecciona una bodega para ingresar a su inventario.</p>
            </div>
          </div>

          <div className="responsable-bodegas-accesos responsable-bodegas-admin-estilo">
            {bodegasPrincipales.length > 0 ? (
              bodegasPrincipales.map((bodega) => {
                const IconoBodega = obtenerIconoBodega(bodega);

                return (
                  <button
                    key={bodega}
                    className="responsable-bodega-card responsable-bodega-card-admin"
                    type="button"
                    onClick={() => seleccionarBodega(bodega)}
                  >
                    <span
                      className={`responsable-bodega-icono ${obtenerClaseBodega(bodega)}`}
                    >
                      <IconoBodega size={22} />
                    </span>

                    <span className="responsable-bodega-card-info">
                      <strong>{limpiarNombreBodega(bodega)}</strong>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    Supervisor: {obtenerSupervisorBodega(usuarios, bodega)?.nombre || "Sin supervisor asignado"}
                  </span>
                      <p>{obtenerDescripcionBodega(bodega)}</p>
                    </span>
                  </button>
                );
              })
            ) : (
              <div
                className="responsable-bodega-vacia"
                style={{ gridColumn: "1 / -1", width: "100%" }}
              >
                No tienes bodegas asignadas.
              </div>
            )}
          </div>

          <div className="seccion-dashboard seccion-compacta responsable-sucursales-seccion">
            <div className="seccion-dashboard-header solicitudes-header-simple">
              <div>
                <h2>Sucursales Tasty</h2>
                <p>Accede a las sucursales gastronómicas habilitadas para tu usuario.</p>
              </div>
            </div>

            {sucursalesTasty.length > 0 ? (
              <div className="responsable-bodegas-accesos responsable-bodegas-admin-estilo responsable-sucursales-grid">
                {sucursalesTasty.map((bodega) => {
                  const IconoBodega = obtenerIconoBodega(bodega);

                  return (
                    <button
                      key={bodega}
                      className="responsable-bodega-card responsable-bodega-card-admin"
                      type="button"
                      onClick={() => seleccionarBodega(bodega)}
                    >
                      <span
                        className={`responsable-bodega-icono ${obtenerClaseBodega(bodega)}`}
                      >
                        <IconoBodega size={22} />
                      </span>

                      <span className="responsable-bodega-card-info">
                        <strong>{limpiarNombreBodega(bodega)}</strong>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="responsable-bodega-vacia">
                No tienes asignada ninguna sucursal de Tasty.
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="seccion-dashboard">
          <div className="seccion-dashboard-header solicitudes-header-simple">
            <div>
              <h2>Inventario de {limpiarNombreBodega(bodegaSeleccionada)}</h2>
              <p>Bienes registrados para la bodega seleccionada.</p>
            </div>
          </div>

          <div className="responsable-filtros-bodega-completos">
            <div className="buscador-input-contenedor responsable-buscador">
              <Search size={18} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar bien..."
              />
            </div>

            <CampoDesplegable
              className="filtro-categoria"
              valor={categoriaFiltro}
              alCambiar={setCategoriaFiltro}
              opciones={[
                { valor: "todas", etiqueta: "Todas las categorías" },
                ...categoriasDisponibles.map((categoria) => ({
                  valor: categoria.nombre,
                  etiqueta: categoria.nombre,
                })),
              ]}
            />

            <CampoDesplegable
              className="filtro-estado"
              valor={estadoFiltro}
              alCambiar={(valor) => setEstadoFiltro(valor as FiltroEstadoBien)}
              opciones={[
                { valor: "todos", etiqueta: "Todo estado" },
                { valor: "bueno", etiqueta: "Bueno" },
                { valor: "regular", etiqueta: "Medio" },
                { valor: "malo", etiqueta: "Bajo" },
              ]}
            />

            <button
              className="boton-filtro boton-filtro-icono"
              type="button"
              title={orden === "asc" ? "Orden A-Z" : "Orden Z-A"}
              onClick={() =>
                setOrden((actual) => (actual === "asc" ? "desc" : "asc"))
              }
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

          <div className="responsable-tabla-scroll inventario-bodega-tabla-ajustada">
            <TablaBase
              columnas={[
                "Código",
                "Bien",
                "Categoría",
                "Atributo",
                ...(mostrarSucursalEnTabla ? ["Sucursal"] : []),
                "Cantidad",
                "Estado",
                "Fecha asignación",
                "Acciones",
              ]}
              mensajeVacio={
                categoriaFiltro !== "todas"
                  ? "No hay bienes registrados en esta categoría para la bodega seleccionada"
                  : "No hay bienes asignados a esta bodega"
              }
            >
              {bienesFiltrados.length > 0
                ? bienesFiltrados.map((item) => {
                    const estadoBien = obtenerEstadoBien(item, productos);

                    return (
                      <tr key={item.id}>
                        <td>{item.codigo}</td>
                        <td>{item.descripcion}</td>
                        <td>{item.categoria}</td>
                        <td>
                          {productos.find((producto) => producto.id === item.productoId)
                            ?.tipoProducto === "no_consumible"
                            ? productos.find((producto) => producto.id === item.productoId)
                                ?.empresa || "No registrado"
                            : "No aplica"}
                        </td>
                        {mostrarSucursalEnTabla && (
                          <td>{limpiarNombreBodega(item.bodega)}</td>
                        )}
                        <td>{item.cantidad}</td>
                        <td>
                          <span className={`badge-bien badge-bien-${estadoBien}`}>
                            {obtenerTextoEstadoBien(estadoBien)}
                          </span>
                        </td>
                        <td>{item.fechaAsignacion}</td>
                        <td>
                          <button
                            className="boton-icono-tabla boton-icono-alerta"
                            type="button"
                            title="Ver información"
                            onClick={() => setDetalleBien(item)}
                          >
                            !
                          </button>
                        </td>
                      </tr>
                    );
                  })
                : null}
            </TablaBase>
          </div>
        </section>
      )}

      {detalleBien && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-responsable-detalle">
            <div className="modal-header">
              <div>
                <h2>Información del bien</h2>
                <p>Detalle del bien asignado a tu bodega.</p>
              </div>

              <div className="modal-solicitud-header-acciones">
                <span
                  className={`badge-bien badge-bien-${obtenerEstadoBien(
                    detalleBien,
                    productos
                  )}`}
                >
                  {obtenerTextoEstadoBien(obtenerEstadoBien(detalleBien, productos))}
                </span>

                <button
                  className="modal-cerrar"
                  type="button"
                  onClick={() => setDetalleBien(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="detalle-producto-grid detalle-solicitud-grid-mejorada">
              <div>
                <span>Código</span>
                <strong>{detalleBien.codigo}</strong>
              </div>

              <div>
                <span>Bien</span>
                <strong>{detalleBien.descripcion}</strong>
              </div>

              <div>
                <span>Categoría</span>
                <strong>{detalleBien.categoria}</strong>
              </div>

              <div>
                <span>Cantidad</span>
                <strong>{detalleBien.cantidad}</strong>
              </div>

              <div>
                <span>Bodega</span>
                <strong>{limpiarNombreBodega(detalleBien.bodega)}</strong>
              </div>

              <div>
                <span>Fecha asignación</span>
                <strong>{detalleBien.fechaAsignacion}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MiBodegaResponsable;