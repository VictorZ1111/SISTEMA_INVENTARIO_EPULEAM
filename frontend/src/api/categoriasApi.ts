import { clienteApi } from "./clienteApi";

export interface CategoriaBackend {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: "activa" | "inactiva";
}

export async function obtenerCategoriasApi() {
  const { data } = await clienteApi.get<CategoriaBackend[]>("/categorias");
  return data;
}

export async function crearCategoriaApi(nombre: string, descripcion: string) {
  const { data } = await clienteApi.post<CategoriaBackend>("/categorias", {
    nombre,
    descripcion,
  });

  return data;
}

export async function editarCategoriaApi(
  id: string,
  nombre: string,
  descripcion: string,
) {
  const { data } = await clienteApi.patch<CategoriaBackend>(
    `/categorias/${id}`,
    {
      nombre,
      descripcion,
    },
  );

  return data;
}

export async function eliminarCategoriaApi(id: string) {
  await clienteApi.delete(`/categorias/${id}`);
}

export async function cambiarEstadoCategoriaApi(
  id: string,
  estado: "activa" | "inactiva",
) {
  const { data } = await clienteApi.patch<CategoriaBackend>(
    `/categorias/${id}/estado`,
    { estado },
  );

  return data;
}
