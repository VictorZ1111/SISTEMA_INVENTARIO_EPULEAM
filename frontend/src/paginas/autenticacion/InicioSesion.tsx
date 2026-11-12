import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexto/AuthContext";
import UleamLoader from "../../componentes/UleamLoader";

import imagenFondo from "../../assets/imagenes/EP.png";
import logoEpuleam from "../../assets/logos/EPULEAM.png";
import logoUleam from "../../assets/logos/ULEAM.png";

import "../../estilos/login.css";

const DOMINIO_CORREO = "@epuleam.com";
const REGEX_CODIGO = /^[A-Za-z]{2}\d{5}[^A-Za-z0-9]$/;
// El usuario pidió apreciar al menos un ciclo del logo tras pulsar Ingresar.
const TIEMPO_MINIMO_LOADER_INGRESO_MS = 1650;

function InicioSesion() {
  const navigate = useNavigate();

  const {
    iniciarSesion,
    obtenerRutaPorRol,
    estaAutenticado,
    usuarioActual,
    cargandoSesion,
  } = useAuth();

  const [usuarioCorreo, setUsuarioCorreo] = useState("");
  const [codigoAcceso, setCodigoAcceso] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!enviando && !cargandoSesion && estaAutenticado && usuarioActual) {
      navigate(obtenerRutaPorRol(usuarioActual.rol), {
        replace: true,
      });
    }
  }, [
    cargandoSesion,
    enviando,
    estaAutenticado,
    usuarioActual,
    navigate,
    obtenerRutaPorRol,
  ]);

  const enviarFormulario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const usuarioCorreoLimpio = usuarioCorreo.trim().toLowerCase();

    if (!usuarioCorreoLimpio) {
      setMensajeError("Ingresa el usuario del correo institucional.");
      return;
    }

    if (usuarioCorreoLimpio.includes("@")) {
      setMensajeError("Escribe solo lo que va antes de @epuleam.com.");
      return;
    }

    if (!REGEX_CODIGO.test(codigoAcceso.trim())) {
      setMensajeError(
        "El código debe tener 2 letras, 5 números y 1 carácter especial.",
      );
      return;
    }

    const correoCompleto = `${usuarioCorreoLimpio}${DOMINIO_CORREO}`;

    setMensajeError("");
    setEnviando(true);
    const inicio = Date.now();
    let rutaDestino = "";

    try {
      const usuario = await iniciarSesion(correoCompleto, codigoAcceso);
      rutaDestino = obtenerRutaPorRol(usuario.rol);
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión.",
      );
    } finally {
      // El servidor responde en paralelo: solo se mantiene visible el logo
      // el tiempo restante para que el usuario vea el efecto de dibujo.
      const restante = Math.max(0, TIEMPO_MINIMO_LOADER_INGRESO_MS - (Date.now() - inicio));
      if (restante > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, restante));
      }
      setEnviando(false);
    }

    if (rutaDestino) {
      navigate(rutaDestino, { replace: true });
    }
  };

  return (
    <div className="pantalla-login">
      <section className="login-panel-formulario">
        <div className="login-contenido">
          <div className="login-logos">
            <img
              src={logoEpuleam}
              alt="Logo EPULEAM"
              className="logo-epuleam"
            />

            <img src={logoUleam} alt="Logo ULEAM" className="logo-uleam" />
          </div>

          <div className="login-texto">
            <h1>¡Bienvenido!</h1>
            <p>
              Accede al sistema institucional de inventario y bodegas de
              EPULEAM
            </p>
          </div>

          <form className="formulario-login" onSubmit={enviarFormulario}>
            <div className="grupo-campo">
              <label>Correo institucional</label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <input
                  className="login-input"
                  type="text"
                  value={usuarioCorreo}
                  onChange={(e) => {
                    setUsuarioCorreo(e.target.value);
                    setMensajeError("");
                  }}
                  placeholder="usuario"
                  required
                  disabled={enviando || cargandoSesion}
                  style={{
                    border: "none",
                    borderRadius: 0,
                    flex: 1,
                  }}
                />

                <span
                  style={{
                    padding: "0 14px",
                    height: "100%",
                    minHeight: "48px",
                    display: "flex",
                    alignItems: "center",
                    background: "#f9fafb",
                    borderLeft: "1px solid #e5e7eb",
                    color: "#6b7280",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {DOMINIO_CORREO}
                </span>
              </div>
            </div>

            <div className="grupo-campo">
              <label>Código de acceso</label>
              <input
                className="login-input"
                type="text"
                value={codigoAcceso}
                onChange={(e) => {
                  setCodigoAcceso(e.target.value);
                  setMensajeError("");
                }}
                placeholder="Ej: AD12345!"
                required
                disabled={enviando || cargandoSesion}
              />
            </div>

            {mensajeError && (
              <div className="mensaje-error-login">{mensajeError}</div>
            )}

            {enviando ? (
              <div className="login-loader-sustituto" aria-live="polite">
                <UleamLoader size={118} texto="Ingresando..." />
              </div>
            ) : (
              <button
                className="login-boton"
                type="submit"
                disabled={cargandoSesion}
              >
                Ingresar
              </button>
            )}
          </form>
        </div>
      </section>

      <section
        className="login-panel-imagen"
        style={{
          backgroundImage: `url(${imagenFondo})`,
        }}
      >
        <div className="capa-imagen-login" />
      </section>
    </div>
  );
}

export default InicioSesion;
