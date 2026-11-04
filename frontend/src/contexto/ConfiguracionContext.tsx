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

export interface CategoriaProducto {
  id: string;
  nombre: string;
  descripcion: string;
  estado: "activa" | "inactiva";
}

interface CategoriaBackend {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: "activa" | "inactiva";
}

interface ConfiguracionContexto {
  categorias: CategoriaProducto[];
  categoriasActivas: CategoriaProducto[];
  cargandoCategorias: boolean;
  recargarCategorias: () => Promise<void>;
  agregarCategoria: (
    nombre: string,
    descripcion: string,
  ) => Promise<CategoriaProducto>;
  editarCategoria: (
    id: string,
    nombre: string,
    descripcion: string,
  ) => Promise<CategoriaProducto>;
  eliminarCategoria: (id: string) => Promise<void>;
  cambiarEstadoCategoria: (
    id: string,
    estado: "activa" | "inactiva",
  ) => Promise<CategoriaProducto>;
}

const ConfiguracionContext = createContext<ConfiguracionContexto | undefined>(
  undefined,
);

interface Props {
  children: ReactNode;
}

function convertirCategoria(categoria: CategoriaBackend): CategoriaProducto {
  return {
    id: categoria.id,
    nombre: categoria.nombre,
    descripcion: categoria.descripcion || "",
    estado: categoria.estado,
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
  return "No se pudo completar la operación de categorías.";
}

export function ConfiguracionProvider({ children }: Props) {
  const { usuarioActual, cargandoSesion } = useAuth();
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(false);

  const recargarCategorias = useCallback(async () => {
    if (!usuarioActual) {
      setCategorias([]);
      return;
    }

    setCargandoCategorias(true);

    try {
      const { data } = await clienteApi.get<CategoriaBackend[]>("/categorias");
      setCategorias(data.map(convertirCategoria));
    } catch (error) {
      throw new Error(obtenerMensajeError(error));
    } finally {
      setCargandoCategorias(false);
    }
  }, [usuarioActual]);

  useEffect(() => {
    if (cargandoSesion) return;

    if (!usuarioActual) {
      setCategorias([]);
      return;
    }

    void recargarCategorias().catch(() => {
      setCategorias([]);
    });
  }, [cargandoSesion, usuarioActual, recargarCategorias]);

  const categoriasActivas = useMemo(
    () => categorias.filter((categoria) => categoria.estado === "activa"),
    [categorias],
  );

  const agregarCategoria = useCallback(
    async (nombre: string, descripcion: string) => {
      try {
        const { data } = await clienteApi.post<CategoriaBackend>("/categorias", {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
        });

        const nuevaCategoria = convertirCategoria(data);
        setCategorias((actuales) =>
          [nuevaCategoria, ...actuales].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
          ),
        );

        return nuevaCategoria;
      } catch (error) {
        throw new Error(obtenerMensajeError(error));
      }
    },
    [],
  );

  const editarCategoria = useCallback(
    async (id: string, nombre: string, descripcion: string) => {
      try {
        const { data } = await clienteApi.patch<CategoriaBackend>(
          `/categorias/${id}`,
          {
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
          },
        );

        const actualizada = convertirCategoria(data);
        setCategorias((actuales) =>
          actuales
            .map((categoria) =>
              categoria.id === id ? actualizada : categoria,
            )
            .sort((a, b) =>
              a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
            ),
        );

        return actualizada;
      } catch (error) {
        throw new Error(obtenerMensajeError(error));
      }
    },
    [],
  );

  const eliminarCategoria = useCallback(async (id: string) => {
    try {
      await clienteApi.delete(`/categorias/${id}`);
      setCategorias((actuales) =>
        actuales.filter((categoria) => categoria.id !== id),
      );
    } catch (error) {
      throw new Error(obtenerMensajeError(error));
    }
  }, []);

  const cambiarEstadoCategoria = useCallback(
    async (id: string, estado: "activa" | "inactiva") => {
      try {
        const { data } = await clienteApi.patch<CategoriaBackend>(
          `/categorias/${id}/estado`,
          { estado },
        );

        const actualizada = convertirCategoria(data);
        setCategorias((actuales) =>
          actuales.map((categoria) =>
            categoria.id === id ? actualizada : categoria,
          ),
        );

        return actualizada;
      } catch (error) {
        throw new Error(obtenerMensajeError(error));
      }
    },
    [],
  );

  const valor = useMemo(
    () => ({
      categorias,
      categoriasActivas,
      cargandoCategorias,
      recargarCategorias,
      agregarCategoria,
      editarCategoria,
      eliminarCategoria,
      cambiarEstadoCategoria,
    }),
    [
      categorias,
      categoriasActivas,
      cargandoCategorias,
      recargarCategorias,
      agregarCategoria,
      editarCategoria,
      eliminarCategoria,
      cambiarEstadoCategoria,
    ],
  );

  return (
    <ConfiguracionContext.Provider value={valor}>
      {children}
    </ConfiguracionContext.Provider>
  );
}

export function useConfiguracion() {
  const contexto = useContext(ConfiguracionContext);

  if (!contexto) {
    throw new Error(
      "useConfiguracion debe usarse dentro de ConfiguracionProvider",
    );
  }

  return contexto;
}
