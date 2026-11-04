import {
  ArrowDownAZ,
  ArrowUpAZ,
  Box,
  Paintbrush,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import TablaBase from "../../componentes/TablaBase";
import CampoDesplegable from "../../componentes/CampoDesplegable";

import { useAuth } from "../../contexto/AuthContext";
import {
  limpiarPrefijoBodega as limpiarNombreBodega,
  obtenerBodegasPrincipalesUsuario,
  obtenerSucursalesTastyUsuario,
} from "../../dominio/bodegas";
import {
  esBienVisible,
  obtenerBodegaProducto,
  obtenerClaseIconoBodega,
  obtenerIconoBodega,
  obtenerTituloBodega,
} from "../../dominio/inventarioVisual";
import { useConfiguracion } from "../../contexto/ConfiguracionContext";
import { useInventario } from "../../contexto/InventarioContext";
import type { Producto } from "../../tipos/producto";

type OrdenInventario = "asc" | "desc";

function normalizarTexto(etiqueta: string) {
  return etiqueta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function obtenerTextoEstadoBien(estadoBien: string) {
  const estado = normalizarTexto(estadoBien || "bueno");

  if (estado === "regular" || estado === "medio") return "Medio";
  if (estado === "malo") return "Malo";

  return "Bueno";
}

function obtenerClaseEstadoBien(estadoBien: string) {
  const estado = normalizarTexto(estadoBien || "bueno");

  if (estado === "regular" || estado === "medio") return "regular";
  if (estado === "malo") return "malo";

  return "bueno";
}

function PanelResponsable() {
  const navigate = useNavigate();
  const { usuarioActual } = useAuth();
  const { productos } = useInventario();
  const { categoriasActivas } = useConfiguracion();

  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [bodegaFiltro, setBodegaFiltro] = useState("todas");
  const [ordenInventario, setOrdenInventario] = useState<OrdenInventario>("asc");
  const [detalleProducto, setDetalleProducto] = useState<Producto | null>(null);

  const bodegasPrincipales = useMemo(
    () => obtenerBodegasPrincipalesUsuario(usuarioActual),
    [usuarioActual]
  );

  const sucursalesTasty = useMemo(
    () => obtenerSucursalesTastyUsuario(usuarioActual),
    [usuarioActual]
  );

  const bodegasFiltroDisponibles = useMemo(() => {
    const bodegas = productos
      .filter(esBienVisible)
      .map((producto) => obtenerBodegaProducto(producto));

    return Array.from(new Set(bodegas)).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  }, [productos]);

  const productosInventarioGeneral = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    const filtrados = productos.filter((producto) => {
      const coincideBusqueda =
        texto === "" ||
        normalizarTexto(producto.codigo || "").includes(texto) ||
        normalizarTexto(producto.codigoUleam || "").includes(texto) ||
        normalizarTexto(producto.descripcion || "").includes(texto) ||
        normalizarTexto(producto.categoria || "").includes(texto);

      const coincideCategoria =
        categoriaFiltro === "todas" ? true : producto.categoria === categoriaFiltro;

      const coincideEstado =
        estadoFiltro === "todos"
          ? true
          : obtenerClaseEstadoBien(String(producto.estadoBien || "bueno")) === estadoFiltro;

      const coincideTipo =
        tipoFiltro === "todos" ? true : producto.tipoProducto === tipoFiltro;

      const coincideBodega =
        bodegaFiltro === "todas"
          ? true
          : obtenerBodegaProducto(producto) === bodegaFiltro;

      return (
        esBienVisible(producto) &&
        coincideBusqueda &&
        coincideCategoria &&
        coincideEstado &&
        coincideTipo &&
        coincideBodega
      );
    });

    return [...filtrados].sort((a, b) => {
      const comparacion = a.descripcion.localeCompare(b.descripcion, "es", {
        sensitivity: "base",
      });

      return ordenInventario === "asc" ? comparacion : comparacion * -1;
    });
  }, [
    productos,
    busqueda,
    categoriaFiltro,
    estadoFiltro,
    tipoFiltro,
    bodegaFiltro,
    ordenInventario,
  ]);

  const seleccionarBodega = (bodega: string) => {
    sessionStorage.setItem("epuleam_bodega_responsable", bodega);
    navigate("/responsable/mi-bodega");
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setCategoriaFiltro("todas");
    setEstadoFiltro("todos");
    setTipoFiltro("todos");
    setBodegaFiltro("todas");
    setOrdenInventario("asc");
  };

  const filtrosActivos =
    busqueda.trim() !== "" ||
    categoriaFiltro !== "todas" ||
    estadoFiltro !== "todos" ||
    tipoFiltro !== "todos" ||
    bodegaFiltro !== "todas" ||
    ordenInventario !== "asc";

  return (
    <div className="pagina-admin pagina-responsable pagina-supervisor-inicio">
      <EncabezadoPagina
        titulo="Inicio"
        descripcion="Consulta el Inventario General y accede a tus sucursales asignadas."
      />

      <section className="seccion-dashboard responsable-inventario-general-panel">
        <div className="seccion-dashboard-header solicitudes-header-simple">
          <div>
            <h2 className="titulo-con-icono-inventario"><span className="icono-bodega icono-bodega-inventario"><Box size={20} /></span>Inventario General</h2>
            <p>Consulta los bienes disponibles del sistema en modo visualización.</p>
          </div>
        </div>

        <div className="responsable-filtros responsable-filtros-inventario">
          <div className="buscador-input-contenedor responsable-buscador">
            <Search size={18} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar bien..."
            />
          </div>

          <CampoDesplegable
            valor={categoriaFiltro}
            alCambiar={setCategoriaFiltro}
            ariaLabel="Filtrar por categoría"
            opciones={[
              { valor: "todas", texto: "Todas las categorías" },
              ...categoriasActivas.map((categoria) => ({
                valor: categoria.nombre,
                texto: categoria.nombre,
              })),
            ]}
            anchoMinimo={230}
          />

          <CampoDesplegable
            valor={estadoFiltro}
            alCambiar={setEstadoFiltro}
            ariaLabel="Filtrar por estado"
            opciones={[
              { valor: "todos", texto: "Todo estado" },
              { valor: "bueno", texto: "Bueno" },
              { valor: "regular", texto: "Medio" },
              { valor: "malo", texto: "Malo" },
            ]}
            anchoMinimo={190}
          />

          <CampoDesplegable
            valor={tipoFiltro}
            alCambiar={setTipoFiltro}
            ariaLabel="Filtrar por tipo"
            opciones={[
              { valor: "todos", texto: "Todo tipo" },
              { valor: "consumible", texto: "Consumible" },
              { valor: "no_consumible", texto: "No consumible" },
            ]}
            anchoMinimo={190}
          />

          <CampoDesplegable
            valor={bodegaFiltro}
            alCambiar={setBodegaFiltro}
            ariaLabel="Filtrar por bodega"
            opciones={[
              { valor: "todas", texto: "Todas las bodegas" },
              ...bodegasFiltroDisponibles.map((bodega) => ({
                valor: bodega,
                texto: bodega,
              })),
            ]}
            anchoMinimo={190}
          />

          <button
            className="boton-filtro boton-filtro-icono"
            type="button"
            title={ordenInventario === "asc" ? "Orden A-Z" : "Orden Z-A"}
            onClick={() =>
              setOrdenInventario((ordenActual) =>
                ordenActual === "asc" ? "desc" : "asc"
              )
            }
          >
            {ordenInventario === "asc" ? (
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

        <div className="responsable-tabla-scroll responsable-tabla-panel responsable-inventario-tabla">
          <TablaBase
            columnas={["Código", "Bien", "Categoría", "Atributo", "Bodega", "Cantidad", "Estado", "Acciones"]}
            mensajeVacio="No existen bienes disponibles para visualizar"
          >
            {productosInventarioGeneral.length > 0
              ? productosInventarioGeneral.map((producto) => (
                  <tr key={producto.id}>
                    <td>{producto.codigo}</td>
                    <td>{producto.descripcion}</td>
                    <td>{producto.categoria || "Sin categoría"}</td>
                    <td>
                      {producto.tipoProducto === "no_consumible"
                        ? producto.empresa || "No registrado"
                        : "No aplica"}
                    </td>
                    <td>{obtenerBodegaProducto(producto)}</td>
                    <td>{producto.cantidad}</td>
                    <td>
                      <span
                        className={`badge-bien badge-bien-${obtenerClaseEstadoBien(
                          String(producto.estadoBien || "bueno")
                        )}`}
                      >
                        {obtenerTextoEstadoBien(String(producto.estadoBien || "bueno"))}
                      </span>
                    </td>
                    <td>
                      <button
                        className="boton-icono-tabla boton-icono-alerta"
                        type="button"
                        title="Ver información"
                        onClick={() => setDetalleProducto(producto)}
                      >
                        !
                      </button>
                    </td>
                  </tr>
                ))
              : null}
          </TablaBase>
        </div>
      </section>

      {bodegasPrincipales.length > 0 && (
      <section className="seccion-dashboard seccion-compacta">
        <div className="seccion-dashboard-header solicitudes-header-simple">
          <div>
            <h2>Bodegas asignadas</h2>
            <p>Selecciona una bodega para revisar su inventario.</p>
          </div>
        </div>

        <div
          className="responsable-bodegas-admin-grid"
          style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        >
          {bodegasPrincipales.length > 0 ? (
            bodegasPrincipales.map((bodega) => {
              const IconoBodega = obtenerIconoBodega(bodega);

              return (
                <button
                  key={bodega}
                  className="responsable-card-bodega-admin"
                  type="button"
                  onClick={() => seleccionarBodega(bodega)}
                >
                  <span className={`icono-bodega ${obtenerClaseIconoBodega(bodega)}`}>
                    <IconoBodega size={23} />
                  </span>

                  <strong>{obtenerTituloBodega(bodega)}</strong>
                </button>
              );
            })
          ) : (
            <div className="responsable-bodega-vacia">
              No tienes bodegas generales asignadas por el momento.
            </div>
          )}
        </div>
      </section>
      )}

      <section className="seccion-dashboard seccion-compacta">
        <div className="seccion-dashboard-header solicitudes-header-simple">
          <div>
            <h2>Sucursales Tasty</h2>
            <p>Accede únicamente a las sucursales gastronómicas habilitadas.</p>
          </div>
        </div>

        {sucursalesTasty.length > 0 ? (
          <div
            className="responsable-bodegas-admin-grid responsable-sucursales-grid"
            style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
          >
            {sucursalesTasty.map((bodega) => {
              const IconoBodega = obtenerIconoBodega(bodega);

              return (
                <button
                  key={bodega}
                  className="responsable-card-bodega-admin"
                  type="button"
                  onClick={() => seleccionarBodega(bodega)}
                >
                  <span className={`icono-bodega ${obtenerClaseIconoBodega(bodega)}`}>
                    <IconoBodega size={23} />
                  </span>

                  <strong>{limpiarNombreBodega(bodega)}</strong>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="responsable-bodega-vacia">
            No tienes asignada ninguna sucursal de Tasty.
          </div>
        )}
      </section>

      {detalleProducto && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-responsable-detalle">
            <div className="modal-header">
              <div>
                <h2>Información del bien</h2>
                <p>Detalle general del producto en modo visualización.</p>
              </div>

              <div className="modal-solicitud-header-acciones">
                <span
                  className={`badge-bien badge-bien-${obtenerClaseEstadoBien(
                    String(detalleProducto.estadoBien || "bueno")
                  )}`}
                >
                  {obtenerTextoEstadoBien(String(detalleProducto.estadoBien || "bueno"))}
                </span>

                <button
                  className="modal-cerrar"
                  type="button"
                  onClick={() => setDetalleProducto(null)}
                  title="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="detalle-producto-grid detalle-solicitud-grid-mejorada">
              <div>
                <span>Código</span>
                <strong>{detalleProducto.codigo || "No registrado"}</strong>
              </div>
              <div>
                <span>Código ULEAM</span>
                <strong>{detalleProducto.codigoUleam || "No registrado"}</strong>
              </div>
              <div>
                <span>Bien</span>
                <strong>{detalleProducto.descripcion}</strong>
              </div>
              <div>
                <span>Categoría</span>
                <strong>{detalleProducto.categoria || "Sin categoría"}</strong>
              </div>
              <div>
                <span>Bodega</span>
                <strong>{obtenerBodegaProducto(detalleProducto)}</strong>
              </div>
              <div>
                <span>Cantidad</span>
                <strong>{detalleProducto.cantidad}</strong>
              </div>
              <div>
                <span>Tipo</span>
                <strong>
                  {detalleProducto.tipoProducto === "no_consumible"
                    ? "No consumible"
                    : "Consumible"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PanelResponsable;
