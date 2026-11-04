import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "../contexto/AuthContext";
import type { RolUsuario } from "../tipos/usuario";

interface Props {
  children: ReactNode;
  rolesPermitidos?: RolUsuario[];
}

function RutaProtegida({ children, rolesPermitidos }: Props) {
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

  if (rolesPermitidos && !rolesPermitidos.includes(usuarioActual.rol)) {
    return <Navigate to={obtenerRutaPorRol(usuarioActual.rol)} replace />;
  }

  return children;
}

export default RutaProtegida;
