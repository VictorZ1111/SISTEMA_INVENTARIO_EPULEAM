import {
  ArrowDownAZ,
  ArrowUpAZ,
  Edit,
  Eye,
  EyeOff,
  Clock3,
  KeyRound,
  Plus,
  Power,
  PowerOff,
  Paintbrush,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import { nombreVisualUsuario } from "../../utilidades/nombresVisuales";
import { obtenerIconoBodega } from "../../dominio/inventarioVisual";
import "../../estilos/usuarios-administracion.css";
import "../../estilos/usuario-detalle-ficha.css";
import TablaBase from "../../componentes/TablaBase";
import UleamLoader from "../../componentes/UleamLoader";

import { useUsuarios } from "../../contexto/UsuariosContext";
import { useAuth } from "../../contexto/AuthContext";
import type { Bodega } from "../../tipos/bodega";
import type { RolUsuario, Usuario } from "../../tipos/usuario";
import CampoDesplegable from "../../componentes/CampoDesplegable";
import SelectorHoraAcceso from "../../componentes/SelectorHoraAcceso";
import { DIAS_HORARIO, horarioPorDefecto, estaDentroDeHorario, type HorarioDia } from "../../tipos/horarioAcceso";

interface FormularioUsuario {
  nombres: string;
  apellidos: string;
  correoUsuario: string;
  rol: RolUsuario;
  telefono: string;
  bodegasAsignadas: string[];
  codigoAcceso: string;
  cambiarCodigoAcceso: boolean;
  nuevoCodigoAcceso: string;
  codigoAdministradorGeneral: string;
  horarioAcceso: HorarioDia[];
  horarioConfigurado: boolean;
}

interface MensajeSistema {
  tipo: "exito" | "error";
  texto: string;
}

interface ConfirmacionUsuario {
  usuario: Usuario;
  accion: "eliminar";
}

interface ConfirmacionOperacion {
  titulo: string;
  mensaje: string;
  etiqueta: string;
  nombreUsuario: string;
  ejecutar: () => Promise<void>;
}

const DOMINIO_CORREO = "@epuleam.com";
const CORREO_ADMINISTRADOR_GENERAL = "admin@epuleam.com";

function esAdministradorGeneral(usuario: Usuario) {
  return Boolean(usuario.esAdministradorGeneral) ||
    usuario.correo.trim().toLowerCase() === CORREO_ADMINISTRADOR_GENERAL;
}
const REGEX_CODIGO = /^[A-Za-z]{2}\d{5}[^A-Za-z0-9]$/;

const formularioInicial: FormularioUsuario = {
  nombres: "",
  apellidos: "",
  correoUsuario: "responsable",
  rol: "responsable",
  telefono: "",
  bodegasAsignadas: [],
  codigoAcceso: "",
  cambiarCodigoAcceso: false,
  nuevoCodigoAcceso: "",
  codigoAdministradorGeneral: "",
  horarioAcceso: horarioPorDefecto(),
  horarioConfigurado: true,
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

type FiltroAcceso = "todos" | "activo" | "inactivo";

/** Estado operativo: respeta la cuenta, la excepción temporal y el horario real de Ecuador. */
function obtenerEstadoAcceso(usuario: Usuario, ahora: number): { texto: string; activo: boolean; temporal: boolean } {
  if (usuario.estado !== "activo") return { texto: "Inhabilitado", activo: false, temporal: false };
  const excepcionVigente = usuario.accesoTemporalHasta &&
    new Date(usuario.accesoTemporalHasta).getTime() > ahora;
  if (excepcionVigente && usuario.accesoTemporalPermitido !== null && usuario.accesoTemporalPermitido !== undefined) {
    return usuario.accesoTemporalPermitido
      ? { texto: "Activo temporalmente", activo: true, temporal: true }
      : { texto: "Inhabilitado temporalmente", activo: false, temporal: true };
  }
  return estaDentroDeHorario(usuario.horarioAcceso ?? null, new Date(ahora))
    ? { texto: "Activo", activo: true, temporal: false }
    : { texto: "Fuera de horario", activo: false, temporal: false };
}

/** Separa para el formulario sin cambiar el campo nombre existente en PostgreSQL. */
function separarNombreCompleto(nombre: string): { nombres: string; apellidos: string } {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return { nombres: nombre.trim(), apellidos: "" };
  const cantidadNombres = partes.length >= 4 ? 2 : 1;
  return {
    nombres: partes.slice(0, cantidadNombres).join(" "),
    apellidos: partes.slice(cantidadNombres).join(" "),
  };
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

function esSucursalResponsable(bodega: string) {
  const nombre = normalizarTexto(bodega);
  return (nombre.startsWith("tasty ") && !nombre.includes("gastronom")) ||
    nombre === "bodega limpieza" || nombre === "bodega oficina";
}

function esBodegaPrincipalSupervisor(bodega: string) {
  return ["Bodega Limpieza", "Bodega Oficina", "Gastronomía"].includes(bodega);
}

function esAsignacionPermitidaPorRol(rol: RolUsuario, bodega: string) {
  if (rol === "supervisor") return esBodegaPrincipalSupervisor(bodega);
  if (rol === "responsable") return esSucursalResponsable(bodega);
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
    configurarAccesoTemporalUsuario,
    cancelarAccesoTemporalUsuario,
    eliminarUsuario,
    restablecerCodigoAcceso,
  } = useUsuarios();

  const { usuarioActual } = useAuth();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [usuarioDetalle, setUsuarioDetalle] = useState<Usuario | null>(null);
  const [confirmacion, setConfirmacion] =
    useState<ConfirmacionUsuario | null>(null);
  const [confirmacionOperacion, setConfirmacionOperacion] = useState<ConfirmacionOperacion | null>(null);
  const [confirmandoOperacion, setConfirmandoOperacion] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [rolFiltro, setRolFiltro] = useState<RolUsuario | "todos">("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroAcceso>("todos");
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(Date.now()), 30000);
    return () => window.clearInterval(intervalo);
  }, []);
  const [ordenUsuarios, setOrdenUsuarios] = useState<"asc" | "desc">("asc");
  const [mensajeSistema, setMensajeSistema] =
    useState<MensajeSistema | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioUsuario>(formularioInicial);
  const [mostrarNuevoCodigo, setMostrarNuevoCodigo] = useState(false);
  const [mostrarCodigoAdministrador, setMostrarCodigoAdministrador] = useState(false);

  const filtrosActivos =
    busqueda.trim() !== "" || rolFiltro !== "todos" || estadoFiltro !== "todos" || ordenUsuarios !== "asc";

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
      ...(campo === "horarioAcceso" ? { horarioConfigurado: true } : {}),
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
          codigoAcceso: usuarioEditando
        ? formularioActual.codigoAcceso
        : "",
    }));
  };

  const alternarBodegaFormulario = (nombreBodega: string) => {
    setFormulario((actual) => ({
      ...actual,
      bodegasAsignadas: actual.bodegasAsignadas.includes(nombreBodega)
        ? actual.bodegasAsignadas.filter((nombre) => nombre !== nombreBodega)
        : [...actual.bodegasAsignadas, nombreBodega],
    }));
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setRolFiltro("todos");
    setEstadoFiltro("todos");
    setOrdenUsuarios("asc");
  };

  const abrirModalCrear = () => {
    setUsuarioEditando(null);
    setFormulario({ ...formularioInicial, horarioAcceso: horarioPorDefecto() });
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
      ...separarNombreCompleto(usuario.nombre),
      correoUsuario: esAdministradorGeneral(usuario)
        ? "admin"
        : obtenerCorreoUsuarioPorRol(usuario.rol),
      rol: usuario.rol,
      telefono: usuario.telefono || "",
      // Solo al guardar se migran asignaciones auxiliares antiguas a la bodega real.
      bodegasAsignadas: Array.from(new Set(obtenerBodegasUsuario(usuario).map((nombre) =>
        nombre === "Sucursal Limpieza" ? "Bodega Limpieza" :
        nombre === "Sucursal Oficina" ? "Bodega Oficina" : nombre
      ))),
          codigoAcceso: "",
      cambiarCodigoAcceso: false,
      nuevoCodigoAcceso: "",
      codigoAdministradorGeneral: "",
      horarioAcceso: usuario.horarioAcceso?.map((dia) => ({ ...dia })) ?? horarioPorDefecto(),
      horarioConfigurado: usuario.horarioAcceso !== null && usuario.horarioAcceso !== undefined,
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
    const nombres = formulario.nombres.trim();
    const apellidos = formulario.apellidos.trim();
    const nombre = `${nombres} ${apellidos}`.trim();
    const correoUsuario =
      usuarioEditando && esAdministradorGeneral(usuarioEditando)
        ? "admin"
        : obtenerCorreoUsuarioPorRol(formulario.rol);
    const correoCompleto = `${correoUsuario}${DOMINIO_CORREO}`;
    const codigoAcceso = formulario.codigoAcceso.trim();

    if (nombres.length < 2 || apellidos.length < 2) {
      mostrarMensaje("error", "Ingresa los nombres y apellidos del usuario.");
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


  const confirmarCambioCodigo = () => {
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

    setConfirmacionOperacion({
      titulo: "Cambiar código de acceso",
      mensaje: "¿Seguro que deseas cambiar el código de acceso de este usuario?",
      etiqueta: "Sí, cambiar código",
      nombreUsuario: usuarioEditando.nombre,
      ejecutar: async () => {
        try {
          await restablecerCodigoAcceso(usuarioEditando.id, nuevoCodigo, codigoAutorizacion);
          setFormulario((actual) => ({
            ...actual,
            cambiarCodigoAcceso: false,
            nuevoCodigoAcceso: "",
            codigoAdministradorGeneral: "",
          }));
          setMostrarNuevoCodigo(false);
          setMostrarCodigoAdministrador(false);
          mostrarMensaje("exito", "Código de acceso actualizado correctamente.");
        } catch (error) {
          mostrarMensaje("error", error instanceof Error ? error.message : "No se pudo restablecer el código de acceso.");
        }
      },
    });
  };

  const guardarUsuario = (event: FormEvent<HTMLFormElement>) => {
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
      horarioAcceso: formulario.horarioConfigurado ? formulario.horarioAcceso : null,
    };

    if (formulario.horarioConfigurado) {
      if (!formulario.horarioAcceso.some((dia) => dia.activo)) {
        mostrarMensaje("error", "Selecciona al menos un día de acceso.");
        return;
      }
      if (formulario.horarioAcceso.some((dia) => dia.activo && (!dia.desde || !dia.hasta || dia.desde >= dia.hasta))) {
        mostrarMensaje("error", "La hora final debe ser posterior a la inicial en cada día habilitado.");
        return;
      }
    }

    setConfirmacionOperacion({
      titulo: usuarioEditando ? "Guardar cambios" : "Crear usuario",
      mensaje: usuarioEditando
        ? "¿Seguro que deseas guardar los cambios de este usuario?"
        : "¿Seguro que deseas registrar este usuario?",
      etiqueta: usuarioEditando ? "Sí, guardar cambios" : "Sí, crear usuario",
      nombreUsuario: datosValidados.nombre,
      ejecutar: async () => {
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
            eraEdicion ? "Usuario actualizado correctamente." : "Usuario creado correctamente."
          );
        } catch (error) {
          mostrarMensaje("error", error instanceof Error ? error.message : "No se pudo guardar el usuario.");
        }
      },
    });
  };

  const cambiarEstado = (usuario: Usuario) => {
    if (esAdministradorGeneral(usuario)) {
      mostrarMensaje("error", "El Administrador General debe permanecer activo.");
      return;
    }
    const nuevoEstado = usuario.estado === "activo" ? "inactivo" : "activo";
    const activar = nuevoEstado === "activo";
    setConfirmacionOperacion({
      titulo: activar ? "Habilitar usuario" : "Inhabilitar usuario",
      mensaje: activar
        ? "¿Seguro que deseas habilitar esta cuenta? Se aplicarán sus horarios de acceso."
        : "¿Seguro que deseas inhabilitar esta cuenta? El usuario perderá el acceso al sistema.",
      etiqueta: activar ? "Sí, habilitar" : "Sí, inhabilitar",
      nombreUsuario: usuario.nombre,
      ejecutar: async () => {
        try {
          await cambiarEstadoUsuario(usuario.id, nuevoEstado);
          mostrarMensaje("exito", activar ? "Usuario habilitado correctamente." : "Usuario inhabilitado correctamente.");
        } catch (error) {
          mostrarMensaje("error", error instanceof Error ? error.message : "No se pudo cambiar el estado del usuario.");
        }
      },
    });
  };

  /** Excepción horaria temporal: no modifica la activación permanente de la cuenta. */
  const gestionarExcepcionHorario = (usuario: Usuario) => {
    if (esAdministradorGeneral(usuario) || usuario.estado !== "activo" || !usuario.horarioAcceso) return;
    const excepcionVigente = Boolean(usuario.accesoTemporalHasta &&
      new Date(usuario.accesoTemporalHasta).getTime() > Date.now());
    const permitido = !estaDentroDeHorario(usuario.horarioAcceso);
    setConfirmacionOperacion({
      titulo: excepcionVigente ? "Restablecer horario de acceso" : permitido ? "Activación temporal" : "Inhabilitación temporal",
      mensaje: excepcionVigente
        ? "¿Seguro que deseas cancelar el acceso temporal y volver al horario habitual?"
        : permitido
          ? "¿Seguro que deseas habilitar temporalmente a este usuario durante dos horas?"
          : "¿Seguro que deseas inhabilitar temporalmente a este usuario durante dos horas?",
      etiqueta: excepcionVigente ? "Sí, restablecer" : permitido ? "Sí, activar temporalmente" : "Sí, inhabilitar temporalmente",
      nombreUsuario: usuario.nombre,
      ejecutar: async () => {
        try {
          if (excepcionVigente) {
            await cancelarAccesoTemporalUsuario(usuario.id);
            mostrarMensaje("exito", "Se restableció el horario habitual del usuario.");
          } else {
            await configurarAccesoTemporalUsuario(usuario.id, permitido);
            mostrarMensaje("exito", permitido
              ? "Acceso permitido durante dos horas. Después se aplicará su horario habitual."
              : "Acceso suspendido durante dos horas. Después se aplicará su horario habitual.");
          }
        } catch (error) {
          mostrarMensaje("error", error instanceof Error ? error.message : "No se pudo gestionar la excepción de horario.");
        }
      },
    });
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

  const confirmarOperacion = async () => {
    if (!confirmacionOperacion || confirmandoOperacion) return;
    setConfirmandoOperacion(true);
    try {
      await confirmacionOperacion.ejecutar();
    } catch (error) {
      mostrarMensaje("error", error instanceof Error ? error.message : "No se pudo completar la operación.");
    } finally {
      setConfirmandoOperacion(false);
      setConfirmacionOperacion(null);
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

      const acceso = obtenerEstadoAcceso(usuario, ahora);
      const coincideEstado = estadoFiltro === "todos" ||
        (estadoFiltro === "activo" ? acceso.activo : !acceso.activo);
      return coincideRol && coincideBusqueda && coincideEstado;
    });

    return [...filtrados].sort((usuarioA, usuarioB) => {
      const comparacion = usuarioA.nombre.localeCompare(usuarioB.nombre, "es", {
        sensitivity: "base",
      });

      return ordenUsuarios === "asc" ? comparacion : comparacion * -1;
    });
  }, [usuarios, busqueda, rolFiltro, estadoFiltro, ordenUsuarios, ahora]);

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
            ancho={216}
            anchoMenu={230}
            valor={rolFiltro}
            onChange={(valor) => setRolFiltro(valor as RolUsuario | "todos")}
            ariaLabel="Filtrar por rol"
            opciones={[
              { valor: "todos", texto: "Todos los roles" },
              { valor: "admin", texto: "Administrador" },
              { valor: "responsable", texto: "Responsable" },
              { valor: "supervisor", texto: "Supervisor" },
            ]}
          />

          <CampoDesplegable
            className="filtro-estado-usuario"
            ancho={226}
            anchoMenu={244}
            valor={estadoFiltro}
            onChange={(valor) => setEstadoFiltro(valor as FiltroAcceso)}
            ariaLabel="Filtrar usuarios por estado de acceso"
            opciones={[
              { valor: "todos", texto: "Todos los estados" },
              { valor: "activo", texto: "Activos" },
              { valor: "inactivo", texto: "Inhabilitados" },
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
          <div className="uleam-carga-en-seccion">
            <UleamLoader size={93} texto="Cargando usuarios..." />
          </div>
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
                        <strong>{nombreVisualUsuario(usuario.nombre)}</strong>
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
                    {(() => {
                      const acceso = obtenerEstadoAcceso(usuario, ahora);
                      return (
                        <span className={`badge-estado usuario-badge-acceso ${acceso.activo ? "badge-estado-activo" : "badge-estado-inactivo"} ${acceso.temporal ? "usuario-badge-temporal" : ""}`}>
                          {acceso.texto}
                        </span>
                      );
                    })()}
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
                        title={esAdministradorGeneral(usuario)
                          ? "La cuenta del Administrador General está protegida"
                          : !usuario.horarioAcceso ? "Primero configura un horario semanal"
                          : usuario.estado !== "activo" ? "Primero activa permanentemente la cuenta"
                          : usuario.accesoTemporalHasta && new Date(usuario.accesoTemporalHasta).getTime() > ahora
                            ? "Cancelar activación o inhabilitación temporal"
                            : estaDentroDeHorario(usuario.horarioAcceso, new Date(ahora))
                              ? "Inhabilitar temporalmente durante dos horas"
                              : "Activar temporalmente durante dos horas"}
                        onClick={() => void gestionarExcepcionHorario(usuario)}
                        disabled={esAdministradorGeneral(usuario) || usuario.estado !== "activo" || !usuario.horarioAcceso}
                      >
                        <Clock3 size={17} />
                      </button>

                      <button
                        className="boton-icono-tabla"
                        type="button"
                        title={esAdministradorGeneral(usuario)
                          ? "El Administrador General debe permanecer activo"
                          : usuario.estado === "activo" ? "Inhabilitar cuenta permanentemente" : "Activar cuenta permanentemente"}
                        onClick={() => cambiarEstado(usuario)}
                        disabled={esAdministradorGeneral(usuario)}
                        style={esAdministradorGeneral(usuario) ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                      >
                        {usuario.estado === "activo" ? <PowerOff size={17} /> : <Power size={17} />}
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
            style={{ maxWidth: "1430px", width: "calc(100% - 36px)", maxHeight: "calc(100vh - 32px)" }}
          >
            <div className="modal-header">
              <div>
                <h2>{usuarioEditando ? "Editar usuario" : "Nuevo usuario"}</h2>
                <p>Define los datos principales, el rol, sus asignaciones y el código de acceso.</p>
              </div>

            </div>

            <form
              className="formulario-modal formulario-usuario-compacto"
              onSubmit={guardarUsuario}
            >
              <div className="usuario-form-layout">
                <section className="usuario-form-columna usuario-form-datos" aria-label="Datos del usuario">
                  <h3>Datos del usuario</h3>
                  <div className="usuario-datos-grid">
                    <div className="campo-formulario">
                      <label htmlFor="usuario-nombres">Nombres *</label>
                      <input id="usuario-nombres" required value={formulario.nombres}
                        onChange={(evento) => actualizarCampo("nombres", evento.target.value)}
                        placeholder="Nombres" />
                    </div>
                    <div className="campo-formulario">
                      <label htmlFor="usuario-apellidos">Apellidos *</label>
                      <input id="usuario-apellidos" required value={formulario.apellidos}
                        onChange={(evento) => actualizarCampo("apellidos", evento.target.value)}
                        placeholder="Apellidos" />
                    </div>
                    <div className="campo-formulario">
                      <label>Rol *</label>
                      <CampoDesplegable mostrarIconoFiltro={false}
                        valor={formulario.rol} anchoMenu={250} ariaLabel="Seleccionar rol"
                        onChange={(valor) => cambiarRolFormulario(valor as RolUsuario)}
                        opciones={[
                          { valor: "admin", texto: "Administrador" },
                          { valor: "responsable", texto: "Responsable" },
                          { valor: "supervisor", texto: "Supervisor" },
                        ]} />
                    </div>
                    <div className="campo-formulario">
                      <label>Correo institucional *</label>
                      <div className="correo-institucional-compacto">
                        <input value={formulario.correoUsuario} disabled readOnly aria-label="Correo institucional generado según el rol" />
                        <span>{DOMINIO_CORREO}</span>
                      </div>
                    </div>
                {!usuarioEditando && (
                  <div className="campo-formulario usuario-datos-ancho">
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
                        <KeyRound size={17} aria-hidden="true" /> Generar
                      </button>
                    </div>

                    <small className="ayuda-campo-usuario">
                      2 letras, 5 números y 1 carácter especial.
                    </small>
                  </div>
                )}

                {usuarioEditando && esAdministradorGeneral(usuarioEditando) && (
                  <div className="campo-formulario usuario-datos-ancho">
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

                {usuarioEditando && !esAdministradorGeneral(usuarioEditando) && !formulario.cambiarCodigoAcceso && (
                  <div className="campo-formulario usuario-datos-ancho">
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
                          <KeyRound size={17} aria-hidden="true" /> Cambiar
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
                      className="campo-formulario usuario-datos-ancho"
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
                              <KeyRound size={17} aria-hidden="true" /> Generar
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
                  </div>


                </section>

                <section className="usuario-form-columna usuario-form-horarios" aria-label="Horario de acceso del usuario">
                <section className="horario-usuario-panel" aria-label="Horario semanal de acceso">
                  <div className="horario-usuario-encabezado">
                    <div>
                      <strong>Horario de acceso</strong>
                      <small>Marca los días autorizados y establece su hora de entrada y salida, incluso si seleccionas todos (hora de Ecuador).</small>
                    </div>
                    <button
                      type="button"
                      className="horario-usuario-seleccionar-todos"
                      onClick={() => actualizarCampo("horarioAcceso", formulario.horarioAcceso.map((dia) => ({ ...dia, activo: true })))}
                    >
                      Todos los días
                    </button>
                  </div>
                  <div className="horario-usuario-lista">
                    {DIAS_HORARIO.map((nombre, indice) => {
                      const franja = formulario.horarioAcceso[indice];
                      return (
                        <div className="horario-usuario-dia" key={nombre}>
                          <label className="horario-usuario-dia-nombre">
                            <input
                              type="checkbox"
                              checked={franja.activo}
                              onChange={(evento) => actualizarCampo("horarioAcceso", formulario.horarioAcceso.map((dia, i) =>
                                i === indice ? { ...dia, activo: evento.target.checked } : dia))}
                            />
                            <span>{nombre}</span>
                          </label>
                          <div className="horario-usuario-rango">
                              <SelectorHoraAcceso
                                ariaLabel={`Hora de entrada del ${nombre}`}
                                valor={franja.desde}
                                deshabilitado={!franja.activo}
                                alCambiar={(hora) => actualizarCampo("horarioAcceso", formulario.horarioAcceso.map((dia, i) =>
                                  i === indice ? { ...dia, desde: hora } : dia))}
                              />
                              <span className="horario-usuario-separador">a</span>
                              <SelectorHoraAcceso
                                ariaLabel={`Hora de salida del ${nombre}`}
                                valor={franja.hasta}
                                deshabilitado={!franja.activo}
                                alCambiar={(hora) => actualizarCampo("horarioAcceso", formulario.horarioAcceso.map((dia, i) =>
                                  i === indice ? { ...dia, hasta: hora } : dia))}
                              />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="horario-usuario-libre">
                    {formulario.horarioConfigurado
                      ? "Los días marcados permiten acceso únicamente dentro de sus horas. Los días desmarcados quedan sin acceso."
                      : "Este usuario conserva acceso sin restricciones hasta que modifiques su horario."}
                  </p>
                </section>
                </section>
                {formulario.rol !== "admin" && (
                  <section className="usuario-asignaciones-panel usuario-form-asignaciones" aria-label="Asignaciones del usuario">
                    <h3>{formulario.rol === "responsable" ? "Ubicaciones asignadas" : "Bodegas asignadas"}</h3>
                    <div className="usuario-asignaciones-opciones">
                      {bodegasAsignables.map((bodega) => {
                        const Icono = obtenerIconoBodega(bodega.nombre);
                        const seleccionada = formulario.bodegasAsignadas.includes(bodega.nombre);
                        return (
                          <label key={bodega.id} className={`usuario-asignacion-opcion ${obtenerClaseBodegaChip(bodega.nombre)} ${seleccionada ? "seleccionada" : ""}`}>
                            <input type="checkbox" checked={seleccionada}
                              onChange={() => alternarBodegaFormulario(bodega.nombre)} />
                            <Icono size={19} aria-hidden="true" />
                            <span>{bodega.nombre}</span>
                          </label>
                        );
                      })}
                    </div>
                    {bodegasAsignables.length === 0 && (
                      <small className="texto-sin-bodegas">No hay ubicaciones disponibles para este rol.</small>
                    )}
                    {gastronomiaAsignada && <p className="mensaje-gastronomia-usuario">Gastronomía incluye Tasty 1–5.</p>}
                  </section>
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
          <div className="modal-contenedor usuario-detalle-modal">
            <div className="modal-header">
              <div>
                <h2>Detalle del usuario</h2>
                <p>Información registrada dentro del sistema.</p>
              </div>
              <button className="modal-cerrar" type="button" aria-label="Cerrar detalle del usuario"
                onClick={() => setUsuarioDetalle(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="usuario-detalle-contenido">
              <div className="usuario-detalle-presentacion">
                <div className="usuario-detalle-avatar" aria-hidden="true">
                  {usuarioDetalle.nombre.charAt(0)}
                </div>
                <div>
                  <h3 title={usuarioDetalle.nombre}>{nombreVisualUsuario(usuarioDetalle.nombre)}</h3>
                  <p>{usuarioDetalle.correo}</p>
                </div>
              </div>
              <div className="usuario-detalle-paneles">
                <section className="usuario-detalle-panel">
                  <h3>Datos del usuario</h3>
                  <div className="usuario-detalle-campos">
                    {[
                      { nombre: "Nombre completo", valor: usuarioDetalle.nombre },
                      { nombre: "Teléfono", valor: usuarioDetalle.telefono || "Sin registrar" },
                      { nombre: "Correo institucional", valor: usuarioDetalle.correo },
                      { nombre: "Rol", valor: obtenerNombreRol(usuarioDetalle.rol) },
                    ].map((dato) => (
                      <div className="detalle-usuario-card" key={dato.nombre}>
                        <span>{dato.nombre}</span><p>{dato.valor}</p>
                      </div>
                    ))}
                    {!esAdministradorGeneral(usuarioDetalle) && (
                      <div className="detalle-usuario-card usuario-detalle-card-ancho">
                        <span>Código de acceso</span>
                        <p>Código protegido. Para reemplazarlo, utiliza Editar → Cambiar código.</p>
                      </div>
                    )}
                  </div>
                </section>
                <section className="usuario-detalle-panel">
                  <h3>Horario de acceso</h3>
                  {usuarioDetalle.horarioAcceso ? (
                    <div className="usuario-detalle-horarios">
                      {DIAS_HORARIO.map((nombre, indice) => {
                        const franja = usuarioDetalle.horarioAcceso?.find((dia) => dia.dia === indice + 1);
                        return (
                          <div className="usuario-detalle-horario" key={nombre}>
                            <span>{nombre}</span>
                            <strong className={!franja?.activo ? "usuario-horario-sin-acceso" : ""}>
                              {franja?.activo ? `${franja.desde} a ${franja.hasta}` : "Sin acceso"}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="usuario-detalle-horario-libre">Acceso sin horario restringido.</p>
                  )}
                </section>
              </div>
              <section className="usuario-detalle-panel usuario-detalle-asignaciones">
                <h3>{usuarioDetalle.rol === "responsable" ? "Ubicaciones asignadas" : "Bodegas asignadas"}</h3>
                <div className="chips-bodegas-detalle">
                  {obtenerBodegasUsuario(usuarioDetalle).length > 0 ? (
                    obtenerBodegasUsuario(usuarioDetalle).map((bodega) => (
                      <span className={`chip-bodega-detalle ${obtenerClaseBodegaChip(bodega)}`} key={bodega}>
                        {bodega}
                      </span>
                    ))
                  ) : (
                    <p className="usuario-detalle-sin-asignaciones">Sin asignaciones</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {confirmacionOperacion && (
        <div className="modal-fondo usuario-confirmacion-fondo" role="presentation">
          <div className="modal-contenedor usuario-confirmacion-modal" role="alertdialog"
            aria-modal="true" aria-labelledby="usuario-confirmacion-titulo" aria-describedby="usuario-confirmacion-mensaje">
            <div className="modal-header">
              <div>
                <h2 id="usuario-confirmacion-titulo">{confirmacionOperacion.titulo}</h2>
                <p id="usuario-confirmacion-mensaje">{confirmacionOperacion.mensaje}</p>
              </div>
            </div>
            {confirmacionOperacion.nombreUsuario && (
              <div className="usuario-confirmacion-nombre">{confirmacionOperacion.nombreUsuario}</div>
            )}
            <div className="modal-acciones">
              <button type="button" className="boton-secundario" disabled={confirmandoOperacion}
                onClick={() => setConfirmacionOperacion(null)}>Cancelar</button>
              <button type="button" className="boton-principal" disabled={confirmandoOperacion}
                onClick={() => void confirmarOperacion()}>
                {confirmandoOperacion ? "Guardando..." : confirmacionOperacion.etiqueta}
              </button>
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