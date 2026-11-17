import { nombreVisualUsuario } from "../utilidades/nombresVisuales";
import { useEffect, useState } from "react";
import { obtenerSolicitudesRecibidasApi } from "../api/solicitudesApi";
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Users,
  Warehouse,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import logoEpuleam from "../assets/logos/LOGO_EP2.png";
import { useAuth } from "../contexto/AuthContext";
import { useInventario } from "../contexto/InventarioContext";

function BarraLateral() {
  const navigate = useNavigate();
  const { usuarioActual, cerrarSesion } = useAuth();
  const { solicitudes } = useInventario();
  const [pendientesResponsables, setPendientesResponsables] = useState(0);

  useEffect(() => {
    if (usuarioActual?.rol !== "supervisor") {
      setPendientesResponsables(0);
      return;
    }

    let vigente = true;
    const actualizarPendientes = () => {
      void obtenerSolicitudesRecibidasApi()
        .then((datos) => {
          if (vigente) {
            setPendientesResponsables(
              datos.filter((solicitud) =>
                solicitud.estado === "pendiente" || solicitud.estado === "parcial",
              ).length,
            );
          }
        })
        .catch(() => {
          // Un error de red no debe ocultar la navegación ni simular un estado sin pendientes.
        });
    };

    actualizarPendientes();
    window.addEventListener("focus", actualizarPendientes);
    window.addEventListener("epuleam:solicitudes-actualizadas", actualizarPendientes);
    return () => {
      vigente = false;
      window.removeEventListener("focus", actualizarPendientes);
      window.removeEventListener("epuleam:solicitudes-actualizadas", actualizarPendientes);
    };
  }, [usuarioActual?.rol, usuarioActual?.id]);

  const solicitudesPendientes = solicitudes.filter(
    (solicitud) =>
      solicitud.estado === "pendiente" || solicitud.estado === "parcial"
  ).length;

  const salir = () => {
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  const obtenerNombreRol = () => {
    if (usuarioActual?.rol === "admin") return "Administrador";
    if (usuarioActual?.rol === "responsable") return "Responsable";
    return "Supervisor";
  };

  return (
    <aside className="barra-lateral">
      <div className="sidebar-superior">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icono">
            <img
              src={logoEpuleam}
              alt="EPULEAM"
              className="sidebar-logo-imagen"
            />
          </div>

          <div>
            <h2>Sistema de Inventario</h2>
          </div>
        </div>

        <nav className="sidebar-menu">
          {usuarioActual?.rol === "admin" && (
            <>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <LayoutDashboard size={21} />
                <span>Inicio</span>
              </NavLink>

              <NavLink
                to="/admin/usuarios"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <Users size={21} />
                <span>Usuarios</span>
              </NavLink>

              <NavLink
                to="/admin/inventario"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <Package size={21} />
                <span>Inventario General</span>
              </NavLink>

              <NavLink
                to="/admin/bodegas"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <Warehouse size={21} />
                <span>Bodegas</span>
              </NavLink>

              <NavLink
                to="/admin/solicitudes"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <ClipboardList size={21} />
                <span>Solicitudes</span>
                {solicitudesPendientes > 0 && (
                  <span
                    className="sidebar-alerta-solicitudes"
                    title={`${solicitudesPendientes} solicitudes pendientes o parciales`}
                  >
                    !
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/admin/movimientos"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <ArrowLeftRight size={21} />
                <span>Movimientos</span>
              </NavLink>

              <NavLink
                to="/admin/actas"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <FileText size={21} />
                <span>Actas</span>
              </NavLink>

              <NavLink
                to="/admin/reportes"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <BarChart3 size={21} />
                <span>Reportes</span>
              </NavLink>

              <div className="sidebar-separador">Acciones</div>

              <NavLink
                to="/admin/configuracion"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <Settings size={21} />
                <span>Configuración</span>
              </NavLink>
            </>
          )}

          {usuarioActual?.rol === "responsable" && (
            <>
              <NavLink
                to="/responsable"
                end
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <LayoutDashboard size={21} />
                <span>Inicio</span>
              </NavLink>

              <NavLink
                to="/responsable/mi-bodega"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <Warehouse size={21} />
                <span>Mis sucursales</span>
              </NavLink>

              <NavLink
                to="/responsable/solicitudes"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <ClipboardList size={21} />
                <span>Solicitudes</span>
              </NavLink>

              <NavLink
                to="/responsable/movimientos"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <ArrowLeftRight size={21} />
                <span>Movimientos</span>
              </NavLink>
            </>
          )}

          {usuarioActual?.rol === "supervisor" && (
            <>
              <NavLink
                to="/supervisor"
                end
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <LayoutDashboard size={21} />
                <span>Inicio</span>
              </NavLink>

              <NavLink
                to="/supervisor/stock"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <Package size={21} />
                <span>Productos en stock</span>
              </NavLink>

              <NavLink
                to="/supervisor/bodegas"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <Warehouse size={21} />
                <span>Mis bodegas</span>
              </NavLink>

              <NavLink
                to="/supervisor/solicitudes"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <ClipboardList size={21} />
                <span>Solicitudes</span>
                {pendientesResponsables > 0 && (
                  <span
                    className="sidebar-alerta-solicitudes sidebar-alerta-solicitudes-supervisor"
                    title={`${pendientesResponsables} solicitudes de Responsables pendientes o parciales`}
                    aria-label={`${pendientesResponsables} solicitudes recibidas pendientes o parciales`}
                  >!</span>
                )}
              </NavLink>

              <NavLink
                to="/supervisor/movimientos"
                className={({ isActive }) =>
                  isActive ? "sidebar-link activo" : "sidebar-link"
                }
              >
                <ArrowLeftRight size={21} />
                <span>Movimientos</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>

      <div className="sidebar-usuario">
        <div className="avatar-usuario">
          {usuarioActual?.nombre.charAt(0) || "U"}
        </div>

        <div className="datos-usuario">
          <h3>{obtenerNombreRol()}</h3>
          <p title={usuarioActual?.nombre || ""}>{nombreVisualUsuario(usuarioActual?.nombre || "")}</p>
        </div>

        <button
          className="boton-salir"
          type="button"
          onClick={salir}
          title="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}

export default BarraLateral;