import { Box, Building2, Paintbrush, Utensils } from "lucide-react";
import { useNavigate } from "react-router-dom";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import { useUsuarios } from "../../contexto/UsuariosContext";

function PanelAdmin() {
  const navigate = useNavigate();
  const { bodegasDisponibles } = useUsuarios();

  const inventarioGeneralAdmin = bodegasDisponibles.find(
    (bodega) => bodega.tipo === "inventario_general",
  );
  const bodegasPrincipalesAdmin = bodegasDisponibles.filter(
    (bodega) => bodega.tipo === "principal",
  );
  const sucursalesTastyAdmin = bodegasDisponibles.filter(
    (bodega) => bodega.tipo === "sucursal",
  );

  return (
    <div className="pagina-admin">
      <EncabezadoPagina
        titulo="Panel de Administración"
        descripcion="Accesos directos a las secciones principales del sistema"
      />

      <section className="seccion-dashboard seccion-compacta">
        <div className="seccion-dashboard-header">
          <div>
            <h2>Inventario general</h2>
          </div>
        </div>

        <button
          type="button"
          className="tarjeta-inventario-general tarjeta-clickable"
          onClick={() => navigate("/admin/inventario")}
        >
          <div className="icono-bodega icono-inventario">
            <Box size={24} />
          </div>

          <div className="inventario-info">
            <h3>{inventarioGeneralAdmin?.nombre || "Inventario General"}</h3>
            <p>
              {inventarioGeneralAdmin?.descripcion ||
                "Bodega central del inventario institucional."}
            </p>
          </div>
        </button>
      </section>

      <section className="seccion-dashboard seccion-compacta">
        <div className="seccion-dashboard-header">
          <div>
            <h2>Bodegas</h2>
          </div>
        </div>

        <div className="grid-bodegas">
          {bodegasPrincipalesAdmin.map((bodega) => {
            const nombreBodega = bodega.nombre.toLowerCase();
            const esTasty = nombreBodega.includes("gastronomía");
            const esLimpieza = nombreBodega.includes("limpieza");
            const esOficina = nombreBodega.includes("oficina");

            return (
              <button
                type="button"
                className="tarjeta-bodega-admin tarjeta-clickable"
                key={bodega.id}
                onClick={() => navigate(`/admin/bodegas/${bodega.id}`)}
              >
                <div className="tarjeta-bodega-superior">
                  <div
                    className={`icono-bodega ${
                      esTasty
                        ? "icono-gastronomia"
                        : esLimpieza
                          ? "icono-limpieza"
                          : esOficina
                            ? "icono-oficina"
                            : "icono-bodega-generica"
                    }`}
                  >
                    {esTasty ? (
                      <Utensils size={23} />
                    ) : esLimpieza ? (
                      <Paintbrush size={23} />
                    ) : (
                      <Building2 size={23} />
                    )}
                  </div>
                </div>

                <h3>{bodega.nombre}</h3>
                <p>{bodega.descripcion}</p>

              </button>
            );
          })}
        </div>
      </section>

      <section className="seccion-dashboard seccion-compacta">
        <div className="seccion-dashboard-header">
          <div>
            <h2>Tastys Gastronomía</h2>
          </div>
        </div>

        <div className="grid-sucursales">
          {sucursalesTastyAdmin.map((sucursal) => (
            <button
              type="button"
              className="tarjeta-sucursal-admin tarjeta-clickable"
              key={sucursal.id}
              onClick={() => navigate(`/admin/bodegas/${sucursal.id}`)}
            >
              <div className="sucursal-header">
                <div className="icono-sucursal icono-gastronomia">
                  <Utensils size={19} />
                </div>

                <h3>{sucursal.nombre}</h3>
              </div>

              <p>{sucursal.descripcion}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default PanelAdmin;