import axios from "axios";

export const STORAGE_TOKEN = "epuleam_token";

export const clienteApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

clienteApi.interceptors.request.use((configuracion) => {
  const token = localStorage.getItem(STORAGE_TOKEN);

  if (token) {
    configuracion.headers.Authorization = `Bearer ${token}`;
  }

  return configuracion;
});

// Traducción centralizada de errores técnicos. Las validaciones de negocio en
// español se conservan; no se exponen SQL, tablas, rutas ni restricciones de BD.
clienteApi.interceptors.response.use(
  (respuesta) => respuesta,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        error.message = "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo nuevamente.";
      } else {
        const respuesta = error.response;
        if (respuesta.status === 403 && respuesta.data?.code === "HORARIO_NO_PERMITIDO") {
          localStorage.removeItem(STORAGE_TOKEN);
          window.dispatchEvent(new Event("epuleam:horario-expirado"));
        }
        const datos = respuesta.data && typeof respuesta.data === "object" && !Array.isArray(respuesta.data)
          ? respuesta.data as { message?: unknown }
          : null;
        const textoOriginal = datos?.message ?? (typeof respuesta.data === "string" ? respuesta.data : "");
        const mensaje = Array.isArray(textoOriginal) ? textoOriginal.join(" ") : textoOriginal;
        // Nunca exponer nombres de tablas, consultas, restricciones ni errores del motor.
        const tecnico = typeof mensaje === "string" &&
          /internal server error|unauthorized|forbidden|not found|queryfailed|\bsql\b|sqlstate|postgres|psql|\bpg[_-]|duplicate key|foreign key|constraint|\bselect\b.+\bfrom\b|\bdelete\s+from\b|\binsert\s+into\b|\bupdate\s+.+\bset\b|syntax error|relation .* does not exist|column .* does not exist|violates .* setting|violates .* constraint|\bquery\s*failed|\bpetici[oó]n\s+sql\b|\berror\s*\d{4,5}\b/i.test(mensaje);
        const sinMensaje = typeof mensaje !== "string" || !mensaje.trim();
        if (tecnico || sinMensaje || respuesta.status >= 500) {
          const estado = respuesta.status;
          const mensajeClaro = estado === 401
            ? "Tu sesión ha vencido. Vuelve a iniciar sesión."
            : estado === 403
              ? "No tienes permiso para realizar esta operación."
              : estado === 404
                ? "No se encontró la información solicitada."
                : estado === 409
                  ? "No se puede completar la operación porque existen datos relacionados. Revisa las asignaciones o el historial."
                  : estado === 503
                    ? "El servidor no está disponible temporalmente. Inténtalo nuevamente."
                    : "No se pudo completar la operación. Revisa los datos e inténtalo nuevamente. Si continúa, consulta con el administrador.";
          respuesta.data = { ...(datos ?? {}), message: mensajeClaro };
          error.message = mensajeClaro;
        } else if (/^Request failed with status code/i.test(error.message)) {
          error.message = typeof mensaje === "string" ? mensaje : String(mensaje);
        }
      }
    }
    return Promise.reject(error);
  },
);
