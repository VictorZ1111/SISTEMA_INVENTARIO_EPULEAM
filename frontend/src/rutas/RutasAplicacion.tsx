import { Navigate, Route, Routes } from "react-router-dom";

import LayoutPrincipal from "../layouts/LayoutPrincipal";
import RutaProtegida from "./RutaProtegida";

import { useAuth } from "../contexto/AuthContext";

import InicioSesion from "../paginas/autenticacion/InicioSesion";

import PanelAdmin from "../paginas/admin/PanelAdmin";
import UsuariosAdmin from "../paginas/admin/UsuariosAdmin";
import BodegasAdmin from "../paginas/admin/BodegasAdmin";
import SolicitudesAdmin from "../paginas/admin/SolicitudesAdmin";
import InventarioAdmin from "../paginas/admin/InventarioAdmin";
import MovimientosAdmin from "../paginas/admin/MovimientosAdmin";
import ReportesAdmin from "../paginas/admin/ReportesAdmin";
import ConfiguracionAdmin from "../paginas/admin/ConfiguracionAdmin";

import PanelResponsable from "../paginas/responsable/PanelResponsable";
import MiBodegaResponsable from "../paginas/responsable/MiBodegaResponsable";
import MovimientosResponsable from "../paginas/responsable/MovimientosResponsable";

import PanelSupervisor from "../paginas/supervisor/PanelSupervisor";
import BodegasSupervisor from "../paginas/supervisor/BodegasSupervisor";
import MovimientosSupervisor from "../paginas/supervisor/MovimientosSupervisor";
import SolicitudesSupervisor from "../paginas/supervisor/SolicitudesSupervisor";

function RedireccionInicial() {
  const {
    estaAutenticado,
    usuarioActual,
    obtenerRutaPorRol,
    cargandoSesion,
  } = useAuth();

  if (cargandoSesion) {
    return null;
  }

  if (!estaAutenticado || !usuarioActual) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={obtenerRutaPorRol(usuarioActual.rol)}
      replace
    />
  );
}

function RutasAplicacion() {
  return (
    <Routes>
      <Route path="/" element={<RedireccionInicial />} />

      <Route path="/login" element={<InicioSesion />} />

      <Route
        path="/admin"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutPrincipal>
              <PanelAdmin />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/admin/usuarios"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutPrincipal>
              <UsuariosAdmin />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/admin/bodegas"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutPrincipal>
              <BodegasAdmin />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/admin/bodegas/:id"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutPrincipal>
              <BodegasAdmin />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/admin/solicitudes"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutPrincipal>
              <SolicitudesAdmin />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/admin/productos"
        element={<Navigate to="/admin/inventario" replace />}
      />

      <Route
        path="/admin/inventario"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutPrincipal>
              <InventarioAdmin />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/admin/movimientos"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutPrincipal>
              <MovimientosAdmin />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/admin/reportes"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutPrincipal>
              <ReportesAdmin />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/admin/configuracion"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutPrincipal>
              <ConfiguracionAdmin />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/responsable"
        element={
          <RutaProtegida rolesPermitidos={["responsable"]}>
            <LayoutPrincipal>
              <PanelResponsable />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/responsable/mi-bodega"
        element={
          <RutaProtegida rolesPermitidos={["responsable"]}>
            <LayoutPrincipal>
              <MiBodegaResponsable />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/responsable/movimientos"
        element={
          <RutaProtegida rolesPermitidos={["responsable"]}>
            <LayoutPrincipal>
              <MovimientosResponsable />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/responsable/solicitudes"
        element={<Navigate to="/responsable" replace />}
      />

      <Route
        path="/supervisor"
        element={
          <RutaProtegida rolesPermitidos={["supervisor"]}>
            <LayoutPrincipal>
              <PanelSupervisor />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/supervisor/inventario"
        element={<Navigate to="/supervisor" replace />}
      />

      <Route
        path="/supervisor/bodegas"
        element={
          <RutaProtegida rolesPermitidos={["supervisor"]}>
            <LayoutPrincipal>
              <BodegasSupervisor />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/supervisor/movimientos"
        element={
          <RutaProtegida rolesPermitidos={["supervisor"]}>
            <LayoutPrincipal>
              <MovimientosSupervisor />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/supervisor/solicitudes"
        element={
          <RutaProtegida rolesPermitidos={["supervisor"]}>
            <LayoutPrincipal>
              <SolicitudesSupervisor />
            </LayoutPrincipal>
          </RutaProtegida>
        }
      />

      <Route
        path="/supervisor/reportes"
        element={<Navigate to="/supervisor" replace />}
      />

      <Route path="*" element={<RedireccionInicial />} />
    </Routes>
  );
}

export default RutasAplicacion;