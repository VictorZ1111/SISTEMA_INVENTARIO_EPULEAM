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

import { clienteApi } from "../api/clienteApi";
import { useAuth } from "./AuthContext";
import { usuariosAdmin } from "../datos/datosAdmin";
import type { Bodega } from "../tipos/bodega";
import type { EstadoUsuario, RolUsuario, Usuario } from "../tipos/usuario";

interface UsuarioFormulario {
  nombre: string;
  correo: string;
  rol: RolUsuario;
  estado?: EstadoUsuario;
  telefono?: string;
  cargo?: string;
  bodegaAsignada?: string;
  bodegasAsignadas?: string[];
  codigoAcceso?: string;
}

interface UsuariosContexto {
  usuarios: Usuario[];
  bodegasDisponibles: Bodega[];
  cargandoUsuarios: boolean;
  recargarUsuarios: () => Promise<void>;
  agregarUsuario: (usuario: UsuarioFormulario) => Promise<Usuario>;
  editarUsuario: (id: string | number, usuario: UsuarioFormulario) => Promise<Usuario>;
  cambiarEstadoUsuario: (id: string | number, estado: EstadoUsuario) => Promise<Usuario>;
  eliminarUsuario: (id: string | number) => Promise<void>;
  obtenerUsuarioPorId: (id: string | number) => Usuario | undefined;
  restablecerCodigoAcceso: (
    id: string | number,
    nuevoCodigo: string,
    codigoAdministradorGeneral: string,
  ) => Promise<void>;
}

type RolBackend = "administrador" | "supervisor" | "responsable";

interface UsuarioBackend {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: RolBackend;
  estado: EstadoUsuario;
  esAdministradorGeneral: boolean;
}

interface BodegaBackend {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: "inventario_general" | "principal" | "sucursal";
  estado: "activa" | "inactiva";
}

interface AsignacionBackend {
  usuario: { id: string };
  bodega: {
    id: string;
    nombre: string;
  };
}

const UsuariosContext = createContext<UsuariosContexto | undefined>(undefined);

interface Props {
  children: ReactNode;
}

function convertirRolBackend(rol: RolBackend): RolUsuario {
  return rol === "administrador" ? "admin" : rol;
}

function convertirRolFrontend(rol: RolUsuario): RolBackend {
  return rol === "admin" ? "administrador" : rol;
}

function obtenerCargoPorRol(rol: RolUsuario) {
  if (rol === "admin") return "Administrador del sistema";
  if (rol === "responsable") return "Responsable de sucursal";
  return "Supervisor de bodega";
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
  return "No se pudo completar la operación de usuarios.";
}

function convertirBodega(bodega: BodegaBackend): Bodega {
  return {
    id: bodega.id,
    nombre: bodega.nombre,
    descripcion: bodega.descripcion || "",
    ubicacion: "",
    responsable: "",
    estado: bodega.estado,
    stockTotal: 0,
    tipo: bodega.tipo,
  };
}

export function UsuariosProvider({ children }: Props) {
  const { usuarioActual, cargandoSesion } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosAdmin);
  const [bodegasDisponibles, setBodegasDisponibles] = useState<Bodega[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);

  const recargarUsuarios = useCallback(async () => {
    if (usuarioActual?.rol !== "admin") return;

    setCargandoUsuarios(true);

    try {
      const [respuestaUsuarios, respuestaAsignaciones, respuestaBodegas] =
        await Promise.all([
          clienteApi.get<UsuarioBackend[]>("/usuarios"),
          clienteApi.get<AsignacionBackend[]>("/asignaciones"),
          clienteApi.get<BodegaBackend[]>("/bodegas/activas"),
        ]);

      const asignacionesPorUsuario = new Map<string, string[]>();

      respuestaAsignaciones.data.forEach((asignacion) => {
        const actuales = asignacionesPorUsuario.get(asignacion.usuario.id) || [];
        actuales.push(asignacion.bodega.nombre);
        asignacionesPorUsuario.set(asignacion.usuario.id, actuales);
      });

      const usuariosConvertidos: Usuario[] = respuestaUsuarios.data.map((usuario) => {
        const rol = convertirRolBackend(usuario.rol);
        const bodegasAsignadas = Array.from(
          new Set(asignacionesPorUsuario.get(usuario.id) || []),
        );

        return {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol,
          estado: usuario.estado,
          telefono: usuario.telefono || "",
          cargo: obtenerCargoPorRol(rol),
          bodegasAsignadas,
          bodegaAsignada: bodegasAsignadas[0] || "",
          esAdministradorGeneral: usuario.esAdministradorGeneral,
        };
      });

      setUsuarios(usuariosConvertidos);
      setBodegasDisponibles(respuestaBodegas.data.map(convertirBodega));
    } catch (error) {
      throw new Error(obtenerMensajeError(error));
    } finally {
      setCargandoUsuarios(false);
    }
  }, [usuarioActual?.rol]);

  useEffect(() => {
    if (cargandoSesion) return;

    if (usuarioActual?.rol === "admin") {
      void recargarUsuarios().catch(() => undefined);
      return;
    }

    // Los demás módulos aún están en proceso de integración. Se conserva su
    // información simulada hasta conectar esos módulos con el backend.
    setUsuarios(usuariosAdmin);
    setBodegasDisponibles([]);
  }, [usuarioActual?.rol, cargandoSesion, recargarUsuarios]);

  const obtenerIdsBodegas = useCallback(
    (nombres: string[] = []) => {
      const ids = nombres.map((nombre) => {
        const bodega = bodegasDisponibles.find(
          (item) => item.nombre.trim().toLowerCase() === nombre.trim().toLowerCase(),
        );

        if (!bodega) {
          throw new Error(`La bodega ${nombre} ya no está disponible.`);
        }

        return String(bodega.id);
      });

      return Array.from(new Set(ids));
    },
    [bodegasDisponibles],
  );

  const agregarUsuario = useCallback(
    async (nuevoUsuario: UsuarioFormulario) => {
      let usuarioCreado: UsuarioBackend | null = null;

      try {
        const respuesta = await clienteApi.post<UsuarioBackend>("/usuarios", {
          nombre: nuevoUsuario.nombre.trim(),
          telefono: nuevoUsuario.telefono?.trim() || undefined,
          rol: convertirRolFrontend(nuevoUsuario.rol),
          codigoAcceso: nuevoUsuario.codigoAcceso?.trim(),
        });

        usuarioCreado = respuesta.data;

        if (nuevoUsuario.rol !== "admin") {
          const bodegaIds = obtenerIdsBodegas(nuevoUsuario.bodegasAsignadas);
          await clienteApi.put(`/asignaciones/usuario/${usuarioCreado.id}`, {
            bodegaIds,
          });
        }

        await recargarUsuarios();

        const creado = await clienteApi.get<UsuarioBackend>(
          `/usuarios/${usuarioCreado.id}`,
        );
        const rol = convertirRolBackend(creado.data.rol);
        const usuarioFinal: Usuario = {
          id: creado.data.id,
          nombre: creado.data.nombre,
          correo: creado.data.correo,
          rol,
          estado: creado.data.estado,
          telefono: creado.data.telefono || "",
          cargo: obtenerCargoPorRol(rol),
          bodegasAsignadas: nuevoUsuario.bodegasAsignadas || [],
          bodegaAsignada: nuevoUsuario.bodegasAsignadas?.[0] || "",
          esAdministradorGeneral: creado.data.esAdministradorGeneral,
        };

        return usuarioFinal;
      } catch (error) {
        if (usuarioCreado) {
          try {
            await clienteApi.delete(`/usuarios/${usuarioCreado.id}`);
          } catch {
            // El error original es más útil para el usuario.
          }
          await recargarUsuarios().catch(() => undefined);
        }

        throw new Error(obtenerMensajeError(error));
      }
    },
    [obtenerIdsBodegas, recargarUsuarios],
  );

  const editarUsuario = useCallback(
    async (id: string | number, usuarioActualizado: UsuarioFormulario) => {
      const idTexto = String(id);
      const usuarioAnterior = usuarios.find((usuario) => String(usuario.id) === idTexto);

      try {
        const bodegaIds =
          usuarioActualizado.rol === "admin"
            ? []
            : obtenerIdsBodegas(usuarioActualizado.bodegasAsignadas);

        if (usuarioActualizado.rol === "admin" && usuarioAnterior?.rol !== "admin") {
          await clienteApi.delete(`/asignaciones/usuario/${idTexto}`);
        }

        const { data } = await clienteApi.patch<UsuarioBackend>(
          `/usuarios/${idTexto}`,
          {
            nombre: usuarioActualizado.nombre.trim(),
            telefono: usuarioActualizado.telefono?.trim() || "",
            rol: convertirRolFrontend(usuarioActualizado.rol),
          },
        );

        if (usuarioActualizado.rol !== "admin") {
          await clienteApi.put(`/asignaciones/usuario/${idTexto}`, {
            bodegaIds,
          });
        }

        await recargarUsuarios();

        const rol = convertirRolBackend(data.rol);
        return {
          id: data.id,
          nombre: data.nombre,
          correo: data.correo,
          rol,
          estado: data.estado,
          telefono: data.telefono || "",
          cargo: obtenerCargoPorRol(rol),
          bodegasAsignadas: usuarioActualizado.bodegasAsignadas || [],
          bodegaAsignada: usuarioActualizado.bodegasAsignadas?.[0] || "",
          esAdministradorGeneral: data.esAdministradorGeneral,
        } satisfies Usuario;
      } catch (error) {
        await recargarUsuarios().catch(() => undefined);
        throw new Error(obtenerMensajeError(error));
      }
    },
    [obtenerIdsBodegas, recargarUsuarios, usuarios],
  );

  const cambiarEstadoUsuario = useCallback(
    async (id: string | number, estado: EstadoUsuario) => {
      try {
        const { data } = await clienteApi.patch<UsuarioBackend>(
          `/usuarios/${String(id)}/estado`,
          { estado },
        );
        await recargarUsuarios();
        const rol = convertirRolBackend(data.rol);
        return {
          id: data.id,
          nombre: data.nombre,
          correo: data.correo,
          rol,
          estado: data.estado,
          telefono: data.telefono || "",
          cargo: obtenerCargoPorRol(rol),
          esAdministradorGeneral: data.esAdministradorGeneral,
        } satisfies Usuario;
      } catch (error) {
        throw new Error(obtenerMensajeError(error));
      }
    },
    [recargarUsuarios],
  );

  const eliminarUsuario = useCallback(
    async (id: string | number) => {
      try {
        await clienteApi.delete(`/usuarios/${String(id)}`);
        await recargarUsuarios();
      } catch (error) {
        throw new Error(obtenerMensajeError(error));
      }
    },
    [recargarUsuarios],
  );

  const restablecerCodigoAcceso = useCallback(
    async (
      id: string | number,
      nuevoCodigo: string,
      codigoAdministradorGeneral: string,
    ) => {
      try {
        await clienteApi.patch(`/usuarios/${String(id)}/codigo`, {
          nuevoCodigo: nuevoCodigo.trim(),
          codigoAdministradorGeneral: codigoAdministradorGeneral.trim(),
        });
      } catch (error) {
        throw new Error(obtenerMensajeError(error));
      }
    },
    [],
  );

  const obtenerUsuarioPorId = useCallback(
    (id: string | number) =>
      usuarios.find((usuario) => String(usuario.id) === String(id)),
    [usuarios],
  );

  const valor = useMemo(
    () => ({
      usuarios,
      bodegasDisponibles,
      cargandoUsuarios,
      recargarUsuarios,
      agregarUsuario,
      editarUsuario,
      cambiarEstadoUsuario,
      eliminarUsuario,
      obtenerUsuarioPorId,
      restablecerCodigoAcceso,
    }),
    [
      usuarios,
      bodegasDisponibles,
      cargandoUsuarios,
      recargarUsuarios,
      agregarUsuario,
      editarUsuario,
      cambiarEstadoUsuario,
      eliminarUsuario,
      obtenerUsuarioPorId,
      restablecerCodigoAcceso,
    ],
  );

  return (
    <UsuariosContext.Provider value={valor}>
      {children}
    </UsuariosContext.Provider>
  );
}

export function useUsuarios() {
  const contexto = useContext(UsuariosContext);

  if (!contexto) {
    throw new Error("useUsuarios debe usarse dentro de UsuariosProvider");
  }

  return contexto;
}
