import {
  AlertTriangle,
  Edit,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import TablaBase from "../../componentes/TablaBase";

import {
  useConfiguracion,
  type CategoriaProducto,
} from "../../contexto/ConfiguracionContext";

interface FormularioCategoria {
  nombre: string;
  descripcion: string;
}

interface MensajeSistema {
  tipo: "exito" | "error";
  texto: string;
}

const formularioCategoriaInicial: FormularioCategoria = {
  nombre: "",
  descripcion: "",
};

function ConfiguracionAdmin() {
  const { categorias, agregarCategoria, editarCategoria, eliminarCategoria } =
    useConfiguracion();

  const [modalCategoria, setModalCategoria] = useState(false);
  const [categoriaEditando, setCategoriaEditando] =
    useState<CategoriaProducto | null>(null);
  const [categoriaEliminando, setCategoriaEliminando] =
    useState<CategoriaProducto | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [mensajeSistema, setMensajeSistema] =
    useState<MensajeSistema | null>(null);

  const [formularioCategoria, setFormularioCategoria] =
    useState<FormularioCategoria>(formularioCategoriaInicial);

  const categoriasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return categorias;

    return categorias.filter(
      (categoria) =>
        categoria.nombre.toLowerCase().startsWith(texto) ||
        categoria.descripcion.toLowerCase().startsWith(texto)
    );
  }, [categorias, busqueda]);

  const mostrarMensaje = (tipo: MensajeSistema["tipo"], texto: string) => {
    setMensajeSistema({ tipo, texto });

    window.setTimeout(() => {
      setMensajeSistema(null);
    }, 3200);
  };

  const abrirModalCategoria = (categoria?: CategoriaProducto) => {
    setModalCategoria(true);

    if (categoria) {
      setCategoriaEditando(categoria);
      setFormularioCategoria({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
      });
      return;
    }

    setCategoriaEditando(null);
    setFormularioCategoria(formularioCategoriaInicial);
  };

  const cerrarModalCategoria = () => {
    setModalCategoria(false);
    setCategoriaEditando(null);
    setFormularioCategoria(formularioCategoriaInicial);
  };

  const guardarCategoria = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formularioCategoria.nombre.trim().length < 3) {
      mostrarMensaje("error", "El nombre debe tener al menos 3 caracteres.");
      return;
    }

    if (formularioCategoria.descripcion.trim().length < 5) {
      mostrarMensaje("error", "Agrega una descripción un poco más clara.");
      return;
    }

    try {
      if (categoriaEditando) {
        await editarCategoria(
          categoriaEditando.id,
          formularioCategoria.nombre,
          formularioCategoria.descripcion,
        );
      } else {
        await agregarCategoria(
          formularioCategoria.nombre,
          formularioCategoria.descripcion,
        );
      }

      const fueEdicion = Boolean(categoriaEditando);
      cerrarModalCategoria();
      mostrarMensaje(
        "exito",
        fueEdicion
          ? "Categoría actualizada correctamente."
          : "Categoría creada correctamente.",
      );
    } catch (error) {
      mostrarMensaje(
        "error",
        error instanceof Error
          ? error.message
          : "No se pudo guardar la categoría.",
      );
    }
  };

  const confirmarEliminacionCategoria = async () => {
    if (!categoriaEliminando) return;

    try {
      await eliminarCategoria(categoriaEliminando.id);
      setCategoriaEliminando(null);
      mostrarMensaje("exito", "Categoría eliminada correctamente.");
    } catch (error) {
      mostrarMensaje(
        "error",
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la categoría.",
      );
    }
  };

  return (
    <div className="pagina-admin pagina-configuracion-categorias">
      <EncabezadoPagina
        titulo="Configuración del Sistema"
        descripcion="Administra las categorías utilizadas en el Inventario General."
      />

      {mensajeSistema && (
        <div className={`mensaje-flotante mensaje-flotante-${mensajeSistema.tipo}`}>
          {mensajeSistema.texto}
        </div>
      )}

      <section className="seccion-dashboard seccion-configuracion-categorias">
        <div className="seccion-dashboard-header configuracion-categorias-header">
          <div>
            <h2>Categorías</h2>
            <p>
              Estas categorías clasifican los bienes registrados en el sistema.
            </p>
          </div>

          <button
            className="boton-principal"
            type="button"
            onClick={() => abrirModalCategoria()}
          >
            <Plus size={18} />
            Nueva categoría
          </button>
        </div>

        <div className="configuracion-categorias-filtros">
          <div className="buscador-input-contenedor configuracion-categorias-buscador">
            <Search size={19} />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar categoría..."
            />
          </div>
        </div>

        <div className="configuracion-categorias-tabla-scroll">
          <TablaBase
            columnas={["Categoría", "Descripción", "Acciones"]}
            mensajeVacio="No existen categorías registradas"
          >
            {categoriasFiltradas.length > 0
              ? categoriasFiltradas.map((categoria) => (
                  <tr key={categoria.id}>
                    <td>{categoria.nombre}</td>

                    <td>{categoria.descripcion}</td>

                    <td>
                      <div className="acciones-tabla">
                        <button
                          className="boton-icono-tabla"
                          type="button"
                          title="Editar categoría"
                          onClick={() => abrirModalCategoria(categoria)}
                        >
                          <Edit size={17} />
                        </button>

                        <button
                          className="boton-icono-tabla boton-icono-peligro"
                          type="button"
                          title="Eliminar categoría"
                          onClick={() => setCategoriaEliminando(categoria)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </TablaBase>
        </div>
      </section>

      {modalCategoria && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-categoria-compacto">
            <div className="modal-header">
              <div>
                <h2>
                  {categoriaEditando ? "Editar categoría" : "Nueva categoría"}
                </h2>
                <p>Registra una categoría clara para clasificar los bienes.</p>
              </div>

            </div>

            <form className="formulario-modal" onSubmit={guardarCategoria}>
              <div className="grid-formulario grid-formulario-categoria">
                <div className="campo-formulario">
                  <label>Nombre *</label>
                  <input
                    required
                    value={formularioCategoria.nombre}
                    onChange={(event) =>
                      setFormularioCategoria((actual) => ({
                        ...actual,
                        nombre: event.target.value,
                      }))
                    }
                    placeholder="Ej: Limpieza"
                  />
                </div>

                <div className="campo-formulario">
                  <label>Descripción *</label>
                  <textarea
                    required
                    value={formularioCategoria.descripcion}
                    onChange={(event) =>
                      setFormularioCategoria((actual) => ({
                        ...actual,
                        descripcion: event.target.value,
                      }))
                    }
                    placeholder="Describe el uso de esta categoría"
                  />
                </div>
              </div>

              <div className="modal-acciones">
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={cerrarModalCategoria}
                >
                  Cancelar
                </button>

                <button className="boton-principal" type="submit">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categoriaEliminando && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-confirmacion-categoria">
            <div className="modal-header">
              <div>
                <h2>Eliminar categoría</h2>
                <p>{categoriaEliminando.nombre}</p>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={() => setCategoriaEliminando(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="formulario-modal">
              <div className="advertencia-eliminar-categoria">
                <AlertTriangle size={22} />
                <div>
                  <h3>Esta acción eliminará la categoría.</h3>
                  <p>
                    Los bienes o productos asociados quedarán sin categoría. El
                    registro no se eliminará del inventario.
                  </p>
                </div>
              </div>

              <div className="modal-acciones">
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={() => setCategoriaEliminando(null)}
                >
                  Cancelar
                </button>

                <button
                  className="boton-principal"
                  type="button"
                  onClick={confirmarEliminacionCategoria}
                >
                  Eliminar categoría
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfiguracionAdmin;
