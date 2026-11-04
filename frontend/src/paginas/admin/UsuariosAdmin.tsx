import {
  ArrowDownAZ,
  ArrowUpAZ,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Power,
  PowerOff,
  Paintbrush,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import TablaBase from "../../componentes/TablaBase";

import { useUsuarios } from "../../contexto/UsuariosContext";
import { useAuth } from "../../contexto/AuthContext";
import type { Bodega } from "../../tipos/bodega";
import type { RolUsuario, Usuario } from "../../tipos/usuario";
import CampoDesplegable from "../../componentes/CampoDesplegable";

interface FormularioUsuario {
  nombre: string;
  correoUsuario: string;
  rol: RolUsuario;
  telefono: string;
  bodegasAsignadas: string[];
  bodegaSeleccionada: string;
  codigoAcceso: string;
  cambiarCodigoAcceso: boolean;
  nuevoCodigoAcceso: string;
  codigoAdministradorGeneral: string;
}

interface MensajeSistema {
  tipo: "exito" | "error";
  texto: string;
}

interface ConfirmacionUsuario {
  usuario: Usuario;
  accion: "eliminar";
}

const DOMINIO_CORREO = "@epuleam.com";
const CORREO_ADMINISTRADOR_GENERAL = "admin@epuleam.com";

function esAdministradorGeneral(usuario: Usuario) {
  return Boolean(usuario.esAdministradorGeneral) ||
    usuario.correo.trim().toLowerCase() === CORREO_ADMINISTRADOR_GENERAL;
}
const REGEX_CODIGO = /^[A-Za-z]{2}\d{5}[^A-Za-z0-9]$/;

const formularioInicial: FormularioUsuario = {
  nombre: "",
  correoUsuario: "responsable",
  rol: "responsable",
  telefono: "",
  bodegasAsignadas: [],
  bodegaSeleccionada: "",
  codigoAcceso: "",
  cambiarCodigoAcceso: false,
  nuevoCodigoAcceso: "",
  codigoAdministradorGeneral: "",
};

function obtenerNombreRol(rol: RolUsuario) {
  if (rol === "admin") return "Administrador";
  if (rol === "responsable") return "Responsable";
  return "Supervisor";
}


function generarCodigoAcceso(rol: RolUsuario) {
  const prefijo = rol === "admin" ? "AD" : rol === "responsable" ? "RE" : "SU";
  const numeros = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  const especiales = ["!", "@", "#", "$", "%", "&", "*"];
  const especial = especiales[Math.floor(Math.random() * especiales.length)];

  return `${prefijo}${numeros}${especial}`;
}

function obtenerCorreoUsuarioPorRol(rol: RolUsuario) {
  if (rol === "admin") return "administrador";
  if (rol === "responsable") return "responsable";
  return "supervisor";
}

function obtenerNombreCorto(nombre: string) {
  const partesNombre = nombre.trim().split(" ").filter(Boolean);

  if (partesNombre.length <= 2) {
    return nombre;
  }

  return `${partesNombre[0]} ${partesNombre[1]}`;
}

function obtenerBodegasUsuario(usuario: Usuario) {
  return Array.from(
    new Set([...(usuario.bodegasAsignadas || []), usuario.bodegaAsignada || ""].filter(Boolean))
  );
}

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function esBodegaGastronomia(bodega: string) {
  const nombre = normalizarTexto(bodega);
  return nombre.includes("gastronom");
}

function esSucursalTasty(bodega: string) {
  const nombre = normalizarTexto(bodega);
  return nombre.includes("tasty") && !nombre.includes("gastronom");
}

function esBodegaPrincipalSupervisor(bodega: string) {
  return ["Bodega Limpieza", "Bodega Oficina", "Gastronomía Tasty"].includes(bodega);
}

function esAsignacionPermitidaPorRol(rol: RolUsuario, bodega: string) {
  if (rol === "supervisor") return esBodegaPrincipalSupervisor(bodega);
  if (rol === "responsable") return esSucursalTasty(bodega);
  return false;
}

function obtenerClaseBodegaChip(bodega: string) {
  const nombre = normalizarTexto(bodega);

  if (nombre.includes("limpieza")) return "chip-bodega-limpieza";
  if (nombre.includes("oficina")) return "chip-bodega-oficina";
  if (nombre.includes("gastronom") || nombre.includes("tasty")) {
    return "chip-bodega-gastronomia";
  }

  return "chip-bodega-inventario";
}

function UsuariosAdmin() {
  const {
    usuarios,
    bodegasDisponibles,
    cargandoUsuarios,
    agregarUsuario,
    editarUsuario,
    cambiarEstadoUsuario,
    eliminarUsuario,
    restablecerCodigoAcceso,
  } = useUsuarios();

  const { usuarioActual } = useAuth();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [usuarioDetalle, setUsuarioDetalle] = useState<Usuario | null>(null);
  const [confirmacion, setConfirmacion] =
    useState<ConfirmacionUsuario | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [rolFiltro, setRolFiltro] = useState<RolUsuario | "todos">("todos");
  const [ordenUsuarios, setOrdenUsuarios] = useState<"asc" | "desc">("asc");
  const [mensajeSistema, setMensajeSistema] =
    useState<MensajeSistema | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioUsuario>(formularioInicial);
  const [mostrarNuevoCodigo, setMostrarNuevoCodigo] = useState(false);
  const [mostrarCodigoAdministrador, setMostrarCodigoAdministrador] = useState(false);

  const filtrosActivos =
    busqueda.trim() !== "" || rolFiltro !== "todos" || ordenUsuarios !== "asc";

  const bodegasAsignables: Bodega[] = bodegasDisponibles.filter(
    (bodega: Bodega) =>
      bodega.nombre !== "Inventario General" &&
      esAsignacionPermitidaPorRol(formulario.rol, bodega.nombre)
  );

  const gastronomiaAsignada =
    formulario.rol === "supervisor" &&
    formulario.bodegasAsignadas.some(esBodegaGastronomia);

  const mostrarMensaje = (tipo: MensajeSistema["tipo"], texto: string) => {
    setMensajeSistema({ tipo, texto });

    window.setTimeout(() => {
      setMensajeSistema(null);
    }, 3200);
  };

  const actualizarCampo = <K extends keyof FormularioUsuario>(
    campo: K,
    valor: FormularioUsuario[K]
  ) => {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));
  };

  const cambiarRolFormulario = (rol: RolUsuario) => {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      rol,
      correoUsuario:
        usuarioEditando && esAdministradorGeneral(usuarioEditando)
          ? "admin"
          : obtenerCorreoUsuarioPorRol(rol),
      bodegasAsignadas:
        rol === "admin"
          ? []
          : formularioActual.bodegasAsignadas.filter((bodega) =>
              esAsignacionPermitidaPorRol(rol, bodega)
            ),
      bodegaSeleccionada: "",
      codigoAcceso: usuarioEditando
        ? formularioActual.codigoAcceso
        : "",
    }));
  };

  const agregarBodegaFormulario = () => {
    if (!formulario.bodegaSeleccionada) return;

    setFormulario((formularioActual) => {
      const bodegaSeleccionada = formularioActual.bodegaSeleccionada;
      const yaTieneGastronomia = formularioActual.bodegasAsignadas.some(esBodegaGastronomia);

      if (yaTieneGastronomia && esSucursalTasty(bodegaSeleccionada)) {
        return {
          ...formularioActual,
          bodegaSeleccionada: "",
        };
      }

      const bodegasBase = esBodegaGastronomia(bodegaSeleccionada)
        ? formularioActual.bodegasAsignadas.filter((bodegaActual) => !esSucursalTasty(bodegaActual))
        : formularioActual.bodegasAsignadas;

      return {
        ...formularioActual,
        bodegasAsignadas: Array.from(new Set([...bodegasBase, bodegaSeleccionada])),
        bodegaSeleccionada: "",
      };
    });
  };

  const quitarBodegaFormulario = (bodega: string) => {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      bodegasAsignadas: formularioActual.bodegasAsignadas.filter(
        (bodegaActual) => bodegaActual !== bodega
      ),
    }));
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setRolFiltro("todos");
    setOrdenUsuarios("asc");
  };

  const abrirModalCrear = () => {
    setUsuarioEditando(null);
    setFormulario(formularioInicial);
    setMostrarNuevoCodigo(false);
    setMostrarCodigoAdministrador(false);
    setModalAbierto(true);
  };

  const abrirModalEditar = (usuario: Usuario) => {
    if (esAdministradorGeneral(usuario)) {
      mostrarMensaje(
        "error",
        "El Administrador General es una cuenta protegida y no puede editarse."
      );
      return;
    }

    setUsuarioEditando(usuario);

    setFormulario({
      nombre: usuario.nombre,
      correoUsuario: esAdministradorGeneral(usuario)
        ? "admin"
        : obtenerCorreoUsuarioPorRol(usuario.rol),
      rol: usuario.rol,
      telefono: usuario.telefono || "",
      bodegasAsignadas: obtenerBodegasUsuario(usuario),
      bodegaSeleccionada: "",
      codigoAcceso: "",
      cambiarCodigoAcceso: false,
      nuevoCodigoAcceso: "",
      codigoAdministradorGeneral: "",
    });

    setMostrarNuevoCodigo(false);
    setMostrarCodigoAdministrador(false);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setUsuarioEditando(null);
    setFormulario(formularioInicial);
    setMostrarNuevoCodigo(false);
    setMostrarCodigoAdministrador(false);
  };

  const validarFormulario = () => {
    const nombre = formulario.nombre.trim();
    const correoUsuario =
      usuarioEditando && esAdministradorGeneral(usuarioEditando)
        ? "admin"
        : obtenerCorreoUsuarioPorRol(formulario.rol);
    const correoCompleto = `${correoUsuario}${DOMINIO_CORREO}`;
    const codigoAcceso = formulario.codigoAcceso.trim();

    if (nombre.length < 3) {
      mostrarMensaje("error", "El nombre debe tener al menos 3 caracteres.");
      return null;
    }

    if (!usuarioEditando) {
      if (!REGEX_CODIGO.test(codigoAcceso)) {
        mostrarMensaje(
          "error",
          "El código debe tener 2 letras, 5 números y 1 carácter especial."
        );
        return null;
      }

    }

    if (usuarioEditando && formulario.cambiarCodigoAcceso) {
      if (esAdministradorGeneral(usuarioEditando)) {
        mostrarMensaje(
          "error",
          "El código del Administrador General no puede modificarse."
        );
        return null;
      }

      if (usuarioActual?.rol !== "admin") {
        mostrarMensaje(
          "error",
          "Solo un administrador puede restablecer códigos de acceso."
        );
        return null;
      }

      const nuevoCodigo = formulario.nuevoCodigoAcceso.trim();
      const codigoAutorizacion = formulario.codigoAdministradorGeneral.trim();

      if (!REGEX_CODIGO.test(nuevoCodigo)) {
        mostrarMensaje(
          "error",
          "El nuevo código debe tener 2 letras, 5 números y 1 carácter especial."
        );
        return null;
      }


      if (!codigoAutorizacion) {
        mostrarMensaje(
          "error",
          "Ingresa el código especial del Administrador General."
        );
        return null;
      }

    }

    return {
      nombre,
      correo: correoCompleto,
      codigoAcceso,
    };
  };


  const confirmarCambioCodigo = async () => {
    if (!usuarioEditando || esAdministradorGeneral(usuarioEditando)) return;

    if (usuarioActual?.rol !== "admin") {
      mostrarMensaje(
        "error",
        "Solo un administrador puede restablecer códigos de acceso."
      );
      return;
    }

    const nuevoCodigo = formulario.nuevoCodigoAcceso.trim();
    const codigoAutorizacion = formulario.codigoAdministradorGeneral.trim();

    if (!REGEX_CODIGO.test(nuevoCodigo)) {
      mostrarMensaje(
        "error",
        "El nuevo código debe tener 2 letras, 5 números y 1 carácter especial."
      );
      return;
    }

    if (!codigoAutorizacion) {
      mostrarMensaje(
        "error",
        "Ingresa el código especial del Administrador General."
      );
      return;
    }

    try {
      await restablecerCodigoAcceso(
        usuarioEditando.id,
        nuevoCodigo,
        codigoAutorizacion
      );

      setFormulario((formularioActual) => ({
        ...formularioActual,
        cambiarCodigoAcceso: false,
        nuevoCodigoAcceso: "",
        codigoAdministradorGeneral: "",
      }));
      setMostrarNuevoCodigo(false);
      setMostrarCodigoAdministrador(false);
      mostrarMensaje("exito", "Código de acceso actualizado correctamente.");
    } catch (error) {
      mostrarMensaje(
        "error",
        error instanceof Error ? error.message : "No se pudo restablecer el código de acceso."
      );
    }
  };

  const guardarUsuario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const datosValidados = validarFormulario();

    if (!datosValidados) return;

    const usuarioFormulario = {
      nombre: datosValidados.nombre,
      correo: datosValidados.correo,
      rol: formulario.rol,
      estado: usuarioEditando?.estado || "activo" as const,
      telefono: formulario.telefono,
      bodegaAsignada:
        formulario.rol === "admin" ? "" : formulario.bodegasAsignadas[0] || "",
      bodegasAsignadas:
        formulario.rol === "admin" ? [] : formulario.bodegasAsignadas,
      codigoAcceso: datosValidados.codigoAcceso,
    };

    try {
      if (usuarioEditando) {
        await editarUsuario(usuarioEditando.id, usuarioFormulario);
      } else {
        await agregarUsuario(usuarioFormulario);
      }

      const eraEdicion = Boolean(usuarioEditando);
      cerrarModal();
      mostrarMensaje(
        "exito",
        eraEdicion
          ? "Usuario actualizado correctamente."
          : "Usuario creado correctamente."
      );
    } catch (error) {
      mostrarMensaje(
        "error",
        error instanceof Error ? error.message : "No se pudo guardar el usuario."
      );
    }
  };

  const cambiarEstado = async (usuario: Usuario) => {
    if (esAdministradorGeneral(usuario)) {
      mostrarMensaje(
        "error",
        "El Administrador General debe permanecer activo."
      );
      return;
    }

    const nuevoEstado = usuario.estado === "activo" ? "inactivo" : "activo";

    try {
      await cambiarEstadoUsuario(usuario.id, nuevoEstado);
      mostrarMensaje(
        "exito",
        nuevoEstado === "activo"
          ? "Usuario activado correctamente."
          : "Usuario inactivado correctamente."
      );
    } catch (error) {
      mostrarMensaje(
        "error",
        error instanceof Error ? error.message : "No se pudo cambiar el estado del usuario."
      );
    }
  };

  const solicitarEliminacion = (usuario: Usuario) => {
    if (esAdministradorGeneral(usuario)) {
      mostrarMensaje(
        "error",
        "La cuenta del Administrador General está protegida."
      );
      return;
    }

    setConfirmacion({
      usuario,
      accion: "eliminar",
    });
  };

  const confirmarEliminacion = async () => {
    if (!confirmacion) return;

    try {
      await eliminarUsuario(confirmacion.usuario.id);

      if (String(usuarioDetalle?.id) === String(confirmacion.usuario.id)) {
        setUsuarioDetalle(null);
      }

      if (String(usuarioEditando?.id) === String(confirmacion.usuario.id)) {
        cerrarModal();
      }

      mostrarMensaje("exito", "Usuario eliminado correctamente.");
      setConfirmacion(null);
    } catch (error) {
      mostrarMensaje(
        "error",
        error instanceof Error ? error.message : "No se pudo eliminar el usuario."
      );
      setConfirmacion(null);
    }
  };

  const usuariosFiltrados = useMemo(() => {
    const textoBusqueda = busqueda.trim().toLowerCase();

    const filtrados = usuarios.filter((usuario) => {
      const coincideRol =
        rolFiltro === "todos" ? true : usuario.rol === rolFiltro;

      const coincideBusqueda =
        textoBusqueda === "" ||
        usuario.nombre.toLowerCase().includes(textoBusqueda) ||
        usuario.correo.toLowerCase().includes(textoBusqueda);

      return coincideRol && coincideBusqueda;
    });

    return [...filtrados].sort((usuarioA, usuarioB) => {
      const comparacion = usuarioA.nombre.localeCompare(usuarioB.nombre, "es", {
        sensitivity: "base",
      });

      return ordenUsuarios === "asc" ? comparacion : comparacion * -1;
    });
  }, [usuarios, busqueda, rolFiltro, ordenUsuarios]);

  return (
    <div className="pagina-admin">
      <EncabezadoPagina
        titulo="Gestión de Usuarios"
        descripcion="Administra los usuarios del sistema, sus roles y estados de acceso."
      />

      {mensajeSistema && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "28px",
            zIndex: 150,
            padding: "14px 18px",
            borderRadius: "12px",
            background:
              mensajeSistema.tipo === "exito" ? "#dcfce7" : "#fee2e2",
            color: mensajeSistema.tipo === "exito" ? "#15803d" : "#b91c1c",
            border:
              mensajeSistema.tipo === "exito"
                ? "1px solid #bbf7d0"
                : "1px solid #fecaca",
            fontWeight: 700,
            boxShadow: "0 14px 30px rgba(15, 23, 42, 0.14)",
          }}
        >
          {mensajeSistema.texto}
        </div>
      )}

      <section className="seccion-dashboard">
        <div className="seccion-dashboard-header">
          <div>
            <h2>Listado de usuarios</h2>
            <p>
              Crea usuarios, asigna roles y administra sus códigos de acceso.
            </p>
          </div>

          <button
            className="boton-principal"
            type="button"
            onClick={abrirModalCrear}
            disabled={cargandoUsuarios}
          >
            <Plus size={18} />
            Nuevo usuario
          </button>
        </div>

        <div className="buscador-tabla usuarios-filtros" style={{ alignItems: "center" }}>
          <div className="buscador-input-contenedor">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <CampoDesplegable
            className="filtro-compacto"
            ancho={180}
            anchoMenu={220}
            valor={rolFiltro}
            onChange={(valor) => setRolFiltro(valor as RolUsuario | "todos")}
            ariaLabel="Filtrar por rol"
            opciones={[
              { valor: "todos", texto: "Todos" },
              { valor: "admin", texto: "Administrador" },
              { valor: "responsable", texto: "Responsable" },
              { valor: "supervisor", texto: "Supervisor" },
            ]}
          />

          <button
            type="button"
            onClick={() =>
              setOrdenUsuarios((ordenActual) =>
                ordenActual === "asc" ? "desc" : "asc"
              )
            }
            title={
              ordenUsuarios === "asc"
                ? "Ordenar de Z a A"
                : "Ordenar de A a Z"
            }
            style={{
              width: "54px",
              height: "44px",
              minWidth: "54px",
              padding: 0,
              margin: 0,
              boxSizing: "border-box",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#111827",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              lineHeight: 0,
            }}
          >
            {ordenUsuarios === "asc" ? (
              <ArrowDownAZ size={18} />
            ) : (
              <ArrowUpAZ size={18} />
            )}
          </button>

          <button
            type="button"
            onClick={limpiarFiltros}
            disabled={!filtrosActivos}
            title="Limpiar filtros"
            style={{
              width: "54px",
              height: "44px",
              minWidth: "54px",
              padding: 0,
              margin: 0,
              boxSizing: "border-box",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: filtrosActivos ? 1 : 0.55,
              cursor: filtrosActivos ? "pointer" : "not-allowed",
              lineHeight: 0,
            }}
          >
            <Paintbrush size={18} />
          </button>
        </div>

        {cargandoUsuarios && (
          <p style={{ margin: "0 0 12px", color: "#64748b", fontWeight: 600 }}>
            Cargando usuarios desde el servidor...
          </p>
        )}

        <div className="usuarios-tabla-scroll">
          <TablaBase
            columnas={[
              "Usuario",
              "Correo",
              "Rol",
              "Estado",
              "Acciones",
            ]}
            mensajeVacio="No se encontraron usuarios con esos filtros"
          >
          {usuariosFiltrados.length > 0
            ? usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id}>
                  <td>
                    <div className="usuario-tabla">
                      <div className="avatar-tabla">
                        {usuario.nombre.charAt(0)}
                      </div>

                      <div>
                        <strong>{obtenerNombreCorto(usuario.nombre)}</strong>
                      </div>
                    </div>
                  </td>

                  <td>{usuario.correo}</td>

                  <td>
                    <span className={`badge-rol badge-rol-${usuario.rol}`}>
                      {obtenerNombreRol(usuario.rol)}
                    </span>
                  </td>


                  <td>
                    <span
                      className={`badge-estado badge-estado-${usuario.estado}`}
                    >
                      {usuario.estado === "activo" ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  <td>
                    <div className="acciones-tabla">
                      <button
                        className="boton-icono-tabla boton-icono-alerta"
                        type="button"
                        title="Ver detalle"
                        onClick={() => setUsuarioDetalle(usuario)}
                      >
                        !
                      </button>

                      <button
                        className="boton-icono-tabla"
                        type="button"
                        title={
                          esAdministradorGeneral(usuario)
                            ? "El Administrador General es una cuenta protegida"
                            : "Editar usuario"
                        }
                        onClick={() => abrirModalEditar(usuario)}
                        disabled={esAdministradorGeneral(usuario)}
                        style={
                          esAdministradorGeneral(usuario)
                            ? { opacity: 0.45, cursor: "not-allowed" }
                            : undefined
                        }
                      >
                        <Edit size={17} />
                      </button>

                      <button
                        className="boton-icono-tabla"
                        type="button"
                        title={
                          esAdministradorGeneral(usuario)
                            ? "El Administrador General debe permanecer activo"
                            : usuario.estado === "activo"
                              ? "Inactivar usuario"
                              : "Activar usuario"
                        }
                        onClick={() => cambiarEstado(usuario)}
                        disabled={esAdministradorGeneral(usuario)}
                        style={
                          esAdministradorGeneral(usuario)
                            ? { opacity: 0.45, cursor: "not-allowed" }
                            : undefined
                        }
                      >
                        {usuario.estado === "activo" ? (
                          <PowerOff size={17} />
                        ) : (
                          <Power size={17} />
                        )}
                      </button>

                      <button
                        className="boton-icono-tabla boton-icono-peligro"
                        type="button"
                        title={
                          esAdministradorGeneral(usuario)
                            ? "La cuenta del Administrador General está protegida"
                            : "Eliminar usuario"
                        }
                        onClick={() => solicitarEliminacion(usuario)}
                        disabled={esAdministradorGeneral(usuario)}
                        style={
                          esAdministradorGeneral(usuario)
                            ? { opacity: 0.45, cursor: "not-allowed" }
                            : undefined
                        }
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

      {modalAbierto && (
        <div className="modal-fondo">
          <div
            className="modal-contenedor modal-grande modal-usuario-compacto"
            style={{
              maxWidth: "1320px",
              width: "calc(100% - 40px)",
              height: formulario.cambiarCodigoAcceso
                ? "min(860px, calc(100vh - 32px))"
                : "auto",
              maxHeight: "calc(100vh - 32px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="modal-header">
              <div>
                <h2>{usuarioEditando ? "Editar usuario" : "Nuevo usuario"}</h2>
                <p>Define los datos principales, el rol, sus asignaciones y el código de acceso.</p>
              </div>

            </div>

            <form
              className="formulario-modal formulario-usuario-compacto"
              style={{
                minHeight: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
              onSubmit={guardarUsuario}
            >
              <div
                className="grid-usuario-compacto"
                style={{
                  overflowY: "auto",
                  overflowX: "hidden",
                  paddingRight: "8px",
                  paddingBottom: "18px",
                  minHeight: 0,
                  flex: 1,
                  alignContent: "start",
                }}
              >
                <div className="campo-formulario usuario-campo-ancho">
                  <label>Nombre completo *</label>
                  <input
                    required
                    value={formulario.nombre}
                    onChange={(e) => actualizarCampo("nombre", e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                  />
                </div>

                <div className="campo-formulario">
                  <label>Correo institucional *</label>

                  <div className="correo-institucional-compacto">
                    <input
                      value={formulario.correoUsuario}
                      disabled
                      readOnly
                      aria-label="Correo institucional generado según el rol"
                    />

                    <span>{DOMINIO_CORREO}</span>
                  </div>
                  <small className="ayuda-campo-usuario">
                    Se asigna automáticamente de acuerdo con el rol.
                  </small>
                </div>

                <div className="campo-formulario">
                  <label>Teléfono</label>
                  <input
                    value={formulario.telefono}
                    onChange={(e) => actualizarCampo("telefono", e.target.value)}
                    placeholder="Opcional"
                  />
                </div>

                <div className="campo-formulario">
                  <label>Rol *</label>
                  <CampoDesplegable mostrarIconoFiltro={false}
                    valor={formulario.rol}
                    anchoMenu={260}
                    ariaLabel="Seleccionar rol"
                    onChange={(valor) => cambiarRolFormulario(valor as RolUsuario)}
                    opciones={[
                      { valor: "admin", texto: "Administrador" },
                      { valor: "responsable", texto: "Responsable" },
                      { valor: "supervisor", texto: "Supervisor" },
                    ]}
                  />
                </div>

                {!usuarioEditando && (
                  <div className="campo-formulario">
                    <label>Código de acceso *</label>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: "10px",
                        alignItems: "stretch",
                      }}
                    >
                      <input
                        required
                        value={formulario.codigoAcceso}
                        onChange={(e) =>
                          actualizarCampo("codigoAcceso", e.target.value)
                        }
                        placeholder="Ej: AD12345!"
                      />

                      <button
                        className="boton-principal"
                        type="button"
                        style={{
                          minWidth: "86px",
                          paddingInline: "12px",
                          borderRadius: "12px",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() =>
                          actualizarCampo(
                            "codigoAcceso",
                            generarCodigoAcceso(formulario.rol)
                          )
                        }
                      >
                        Generar
                      </button>
                    </div>

                    <small className="ayuda-campo-usuario">
                      2 letras, 5 números y 1 carácter especial.
                    </small>
                  </div>
                )}

                {usuarioEditando && esAdministradorGeneral(usuarioEditando) && (
                  <div className="campo-formulario">
                    <label>Código de acceso</label>
                    <input
                      value="Código especial protegido"
                      disabled
                      readOnly
                    />
                    <small className="ayuda-campo-usuario">
                      El código del Administrador General no puede modificarse.
                    </small>
                  </div>
                )}

                {usuarioEditando && !esAdministradorGeneral(usuarioEditando) && (
                  <div className="campo-formulario">
                    <label>Código de acceso</label>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        alignItems: "stretch",
                        gap: "10px",
                      }}
                    >
                      <input
                        value="Código configurado"
                        disabled
                        readOnly
                      />

                      {!formulario.cambiarCodigoAcceso && (
                        <button
                          className="boton-principal"
                          type="button"
                          style={{
                            minWidth: "78px",
                            paddingInline: "10px",
                            borderRadius: "12px",
                            whiteSpace: "nowrap",
                          }}
                          onClick={() => {
                            setFormulario((formularioActual) => ({
                              ...formularioActual,
                              cambiarCodigoAcceso: true,
                              nuevoCodigoAcceso: "",
                              codigoAdministradorGeneral: "",
                            }));
                            setMostrarNuevoCodigo(false);
                            setMostrarCodigoAdministrador(false);
                          }}
                        >
                          Cambiar
                        </button>
                      )}
                    </div>
                    <small className="ayuda-campo-usuario">
                      El cambio requiere el código especial del Administrador General.
                    </small>
                  </div>
                )}

                {usuarioEditando &&
                  !esAdministradorGeneral(usuarioEditando) &&
                  formulario.cambiarCodigoAcceso && (
                    <div
                      className="campo-formulario usuario-campo-ancho"
                      style={{
                        padding: "16px",
                        border: "1px solid #dfe5ec",
                        borderRadius: "16px",
                        background: "#f8fafc",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: "14px",
                        }}
                      >
                        <div className="campo-formulario">
                          <label>Nuevo código de acceso *</label>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) auto",
                              gap: "8px",
                              alignItems: "stretch",
                            }}
                          >
                            <div style={{ position: "relative", minWidth: 0 }}>
                              <input
                                value={formulario.nuevoCodigoAcceso}
                                type={mostrarNuevoCodigo ? "text" : "password"}
                                autoComplete="new-password"
                                onChange={(e) =>
                                  actualizarCampo("nuevoCodigoAcceso", e.target.value)
                                }
                                placeholder="Ej: RE54321!"
                                style={{ width: "100%", paddingRight: "46px" }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setMostrarNuevoCodigo((visible) => !visible)
                                }
                                aria-label={
                                  mostrarNuevoCodigo
                                    ? "Ocultar nuevo código"
                                    : "Mostrar nuevo código"
                                }
                                title={
                                  mostrarNuevoCodigo
                                    ? "Ocultar código"
                                    : "Mostrar código"
                                }
                                style={{
                                  position: "absolute",
                                  right: "8px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  border: 0,
                                  background: "transparent",
                                  padding: "6px",
                                  cursor: "pointer",
                                  display: "grid",
                                  placeItems: "center",
                                }}
                              >
                                {mostrarNuevoCodigo ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>
                            </div>

                            <button
                              className="boton-principal"
                              type="button"
                              style={{
                                minWidth: "78px",
                                paddingInline: "10px",
                                borderRadius: "12px",
                                whiteSpace: "nowrap",
                              }}
                              onClick={() =>
                                actualizarCampo(
                                  "nuevoCodigoAcceso",
                                  generarCodigoAcceso(formulario.rol)
                                )
                              }
                            >
                              Generar
                            </button>
                          </div>
                          <small className="ayuda-campo-usuario">
                            2 letras, 5 números y 1 carácter especial.
                          </small>
                        </div>

                        <div className="campo-formulario">
                          <label>Código del Administrador General *</label>
                          <div style={{ position: "relative" }}>
                            <input
                              type={mostrarCodigoAdministrador ? "text" : "password"}
                              autoComplete="off"
                              value={formulario.codigoAdministradorGeneral}
                              onChange={(e) =>
                                actualizarCampo(
                                  "codigoAdministradorGeneral",
                                  e.target.value
                                )
                              }
                              placeholder="Código de autorización"
                              style={{ width: "100%", paddingRight: "46px" }}
                            />
                            <button
                              type="button"
                              onClick={() => setMostrarCodigoAdministrador((visible) => !visible)}
                              aria-label={mostrarCodigoAdministrador ? "Ocultar código del Administrador General" : "Mostrar código del Administrador General"}
                              title={mostrarCodigoAdministrador ? "Ocultar código" : "Mostrar código"}
                              style={{
                                position: "absolute",
                                right: "8px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                border: 0,
                                background: "transparent",
                                padding: "6px",
                                cursor: "pointer",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              {mostrarCodigoAdministrador ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          <small className="ayuda-campo-usuario">
                            Autoriza el restablecimiento del acceso.
                          </small>
                        </div>

                        <div
                          style={{
                            gridColumn: "1 / -1",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "10px",
                          }}
                        >
                          <button
                            className="boton-secundario"
                            type="button"
                            onClick={() => {
                              setFormulario((formularioActual) => ({
                                ...formularioActual,
                                cambiarCodigoAcceso: false,
                                nuevoCodigoAcceso: "",
                                codigoAdministradorGeneral: "",
                              }));
                              setMostrarNuevoCodigo(false);
                              setMostrarCodigoAdministrador(false);
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="boton-principal"
                            type="button"
                            onClick={confirmarCambioCodigo}
                          >
                            Guardar código
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {formulario.rol !== "admin" && (
                  <div className="campo-formulario usuario-campo-ancho campo-bodegas-usuario">
                    <label>{formulario.rol === "responsable" ? "Sucursales asignadas" : "Bodegas asignadas"}</label>

                    <div className="selector-bodega-usuario">
                      <CampoDesplegable mostrarIconoFiltro={false}
                        valor={formulario.bodegaSeleccionada}
                        anchoMenu={360}
                        altoMenuMaximo={190}
                        ariaLabel={formulario.rol === "responsable" ? "Seleccionar sucursal asignada" : "Seleccionar bodega asignada"}
                        onChange={(valor) => actualizarCampo("bodegaSeleccionada", valor)}
                        opciones={[
                          { valor: "", texto: formulario.rol === "responsable" ? "Selecciona una sucursal" : "Selecciona una bodega" },
                          ...bodegasAsignables
                            .filter((bodega) => {
                              if (formulario.bodegasAsignadas.includes(bodega.nombre)) {
                                return false;
                              }

                              if (gastronomiaAsignada && esSucursalTasty(bodega.nombre)) {
                                return false;
                              }

                              return true;
                            })
                            .map((bodega) => ({
                              valor: bodega.nombre,
                              texto: bodega.nombre,
                            })),
                        ]}
                      />

                      <button
                        className="boton-agregar-bodega-usuario boton-agregar-bodega-solo-icono"
                        type="button"
                        disabled={!formulario.bodegaSeleccionada}
                        onClick={agregarBodegaFormulario}
                        title={formulario.rol === "responsable" ? "Agregar sucursal" : "Agregar bodega"}
                        aria-label={formulario.rol === "responsable" ? "Agregar sucursal" : "Agregar bodega"}
                        style={{
                          width: "52px",
                          minWidth: "52px",
                          height: "52px",
                          borderRadius: "12px",
                          border: "1px solid #111827",
                          background: "#111827",
                          color: "#ffffff",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: formulario.bodegaSeleccionada ? 1 : 0.45,
                          cursor: formulario.bodegaSeleccionada ? "pointer" : "not-allowed",
                        }}
                      >
                        <Plus size={20} strokeWidth={2.4} />
                      </button>
                    </div>

                    {gastronomiaAsignada && (
                      <p className="mensaje-gastronomia-usuario">
                        Al asignar Gastronomía Tasty al supervisor, tendrá acceso a sus 5 sucursales Tasty.
                      </p>
                    )}

                    <div className="chips-bodegas-usuario">
                      {formulario.bodegasAsignadas.length > 0 ? (
                        formulario.bodegasAsignadas.map((bodega) => (
                          <span
                            className={`chip-bodega-usuario ${obtenerClaseBodegaChip(bodega)}`}
                            key={bodega}
                          >
                            {bodega}
                            <button
                              type="button"
                              onClick={() => quitarBodegaFormulario(bodega)}
                              aria-label={`Quitar ${bodega}`}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <small className="texto-sin-bodegas">
                          {formulario.rol === "responsable"
                            ? "Sin sucursales asignadas."
                            : "Sin bodegas asignadas."}
                        </small>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div
                className="modal-acciones modal-acciones-usuario"
                style={{
                  flexShrink: 0,
                  background: "#fff",
                  borderTop: "1px solid #e5e7eb",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>

                <button className="boton-principal" type="submit">
                  {usuarioEditando ? "Guardar cambios" : "Guardar usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {usuarioDetalle && (
        <div className="modal-fondo">
          <div className="modal-contenedor" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div>
                <h2>Detalle del usuario</h2>
                <p>Información registrada dentro del sistema.</p>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={() => setUsuarioDetalle(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "26px 28px 8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "18px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "18px",
                  background: "#f9fafb",
                }}
              >
                <div
                  style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "50%",
                    background: "#111111",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {usuarioDetalle.nombre.charAt(0)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: "21px",
                      color: "#111827",
                      fontWeight: 800,
                    }}
                  >
                    {obtenerNombreCorto(usuarioDetalle.nombre)}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: "#6b7280",
                      fontSize: "15px",
                    }}
                  >
                    {usuarioDetalle.correo}
                  </p>
                </div>
              </div>
            </div>

            <div className="detalle-usuario-grid">
              <div className="detalle-usuario-card">
                <span>Nombre completo</span>
                <p>{usuarioDetalle.nombre}</p>
              </div>

              <div className="detalle-usuario-card">
                <span>Teléfono</span>
                <p>{usuarioDetalle.telefono || "Sin registrar"}</p>
              </div>

              <div className="detalle-usuario-card detalle-usuario-card-bodegas">
                <span>Bodegas asignadas</span>

                <div className="chips-bodegas-detalle">
                  {obtenerBodegasUsuario(usuarioDetalle).length > 0 ? (
                    obtenerBodegasUsuario(usuarioDetalle).map((bodega) => (
                      <span
                        className={`chip-bodega-detalle ${obtenerClaseBodegaChip(bodega)}`}
                        key={bodega}
                      >
                        {bodega}
                      </span>
                    ))
                  ) : (
                    <p>Sin asignar</p>
                  )}
                </div>
              </div>

              {!esAdministradorGeneral(usuarioDetalle) && (
                <div className="detalle-usuario-card">
                  <span>Código de acceso</span>
                  <p>{usuarioDetalle.codigoAcceso || "Sin registrar"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmacion && (
        <div className="modal-fondo">
          <div className="modal-contenedor" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div>
                <h2>Eliminar usuario</h2>
                <p>Esta acción quitará el usuario del listado del sistema.</p>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={() => setConfirmacion(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "24px 28px 10px" }}>
              <div
                style={{
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  borderRadius: "14px",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    color: "#374151",
                    fontSize: "15px",
                    lineHeight: "1.5",
                  }}
                >
                  ¿Seguro que deseas eliminar este usuario?
                </p>

                <strong
                  style={{
                    display: "block",
                    color: "#991b1b",
                    fontSize: "17px",
                    lineHeight: "1.4",
                  }}
                >
                  {confirmacion.usuario.nombre}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  {confirmacion.usuario.correo}
                </span>
              </div>
            </div>

            <div className="modal-acciones" style={{ padding: "20px 28px" }}>
              <button
                className="boton-secundario"
                type="button"
                onClick={() => setConfirmacion(null)}
              >
                Cancelar
              </button>

              <button
                className="boton-principal"
                type="button"
                onClick={confirmarEliminacion}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsuariosAdmin;