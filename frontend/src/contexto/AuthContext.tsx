import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  iniciarSesionApi,
  obtenerAsignacionesMiasApi,
  obtenerPerfilApi,
  type RolBackend,
  type UsuarioBackend,
} from "../api/authApi";
import { STORAGE_TOKEN } from "../api/clienteApi";
import type {
  RolUsuario,
  UsuarioSesion,
} from "../tipos/usuario";

interface AuthContexto {
  usuarioActual: UsuarioSesion | null;
  estaAutenticado: boolean;
  cargandoSesion: boolean;
  iniciarSesion: (
    correo: string,
    codigoAcceso: string,
  ) => Promise<UsuarioSesion>;
  cerrarSesion: () => void;
  obtenerRutaPorRol: (rol: RolUsuario) => string;
}

const AuthContext = createContext<AuthContexto | undefined>(undefined);

interface Props {
  children: ReactNode;
}

function convertirRolBackend(rol: RolBackend): RolUsuario {
  if (rol === "administrador") return "admin";
  return rol;
}

function obtenerCargoPorRol(rol: RolUsuario) {
  if (rol === "admin") return "Administrador del sistema";
  if (rol === "responsable") return "Responsable de sucursal";
  return "Supervisor de bodega";
}

function limpiarSesionGuardada() {
  localStorage.removeItem(STORAGE_TOKEN);
}

function obtenerMensajeError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.message;

    if (Array.isArray(mensaje)) {
      return mensaje.join(" ");
    }

    if (typeof mensaje === "string" && mensaje.trim()) {
      return mensaje;
    }

    if (!error.response) {
      return "No se pudo conectar con el servidor. Verifica que el backend esté encendido.";
    }
  }

  return "No fue posible iniciar sesión. Intenta nuevamente.";
}

async function construirUsuarioSesion(
  usuarioBackend: UsuarioBackend,
): Promise<UsuarioSesion> {
  const rol = convertirRolBackend(usuarioBackend.rol);
  let bodegasAsignadas: string[] = [];

  if (rol !== "admin") {
    const data = await obtenerAsignacionesMiasApi();

    bodegasAsignadas = Array.from(
      new Set(
        data.asignaciones
          .map((asignacion) => asignacion.bodega.nombre)
          .filter(Boolean),
      ),
    );
  }

  return {
    id: usuarioBackend.id,
    nombre: usuarioBackend.nombre,
    correo: usuarioBackend.correo,
    telefono: usuarioBackend.telefono || "",
    rol,
    estado: usuarioBackend.estado,
    cargo: obtenerCargoPorRol(rol),
    bodegasAsignadas,
    bodegaAsignada: bodegasAsignadas[0] || "",
    esAdministradorGeneral: usuarioBackend.esAdministradorGeneral,
  };
}

export function AuthProvider({ children }: Props) {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSesion | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const obtenerRutaPorRol = useCallback((rol: RolUsuario) => {
    if (rol === "admin") return "/admin";
    if (rol === "responsable") return "/responsable";
    return "/supervisor";
  }, []);

  const cerrarSesion = useCallback(() => {
    limpiarSesionGuardada();
    setUsuarioActual(null);
  }, []);

  useEffect(() => {
    let activo = true;

    async function restaurarSesion() {
      const token = localStorage.getItem(STORAGE_TOKEN);

      if (!token) {
        if (activo) setCargandoSesion(false);
        return;
      }

      try {
        const data = await obtenerPerfilApi();
        const usuario = await construirUsuarioSesion(data);

        if (!activo) return;

        setUsuarioActual(usuario);
      } catch {
        limpiarSesionGuardada();

        if (activo) {
          setUsuarioActual(null);
        }
      } finally {
        if (activo) {
          setCargandoSesion(false);
        }
      }
    }

    void restaurarSesion();

    return () => {
      activo = false;
    };
  }, []);

  const iniciarSesion = useCallback(
    async (correo: string, codigoAcceso: string): Promise<UsuarioSesion> => {
      try {
        const data = await iniciarSesionApi(
          correo.trim().toLowerCase(),
          codigoAcceso.trim(),
        );

        localStorage.setItem(STORAGE_TOKEN, data.accessToken);

        const usuario = await construirUsuarioSesion(data.usuario);

        setUsuarioActual(usuario);

        return usuario;
      } catch (error) {
        limpiarSesionGuardada();
        setUsuarioActual(null);
        throw new Error(obtenerMensajeError(error));
      }
    },
    [],
  );

  const valor = useMemo(
    () => ({
      usuarioActual,
      estaAutenticado: Boolean(usuarioActual),
      cargandoSesion,
      iniciarSesion,
      cerrarSesion,
      obtenerRutaPorRol,
    }),
    [
      usuarioActual,
      cargandoSesion,
      iniciarSesion,
      cerrarSesion,
      obtenerRutaPorRol,
    ],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return contexto;
}
