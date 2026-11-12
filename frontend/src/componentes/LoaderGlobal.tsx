import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { STORAGE_TOKEN } from "../api/clienteApi";
import { useAuth } from "../contexto/AuthContext";
import { EVENTO_CARGA_API, type EventoCargaApi } from "../utilidades/eventosCarga";
import logoAnimado from "../assets/animaciones/loader-ep-uleam.gif";
import logoEstatico from "../assets/logos/LOGO_EP2.png";
import "../estilos/loader-global.css";

/**
 * Único indicador global para cargas de la aplicación.
 * - Las consultas rápidas (<220 ms) no interrumpen la interfaz.
 * - Los envíos y el inicio de sesión muestran el dibujo completo.
 * - Nunca se retrasa ni se repite una operación de backend.
 */
export default function LoaderGlobal() {
  const { cargandoSesion } = useAuth();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const pendientes = useRef(new Set<number>());
  const visibleActual = useRef(false);
  const mostrarHasta = useRef(0);
  const sesionEnCarga = useRef(cargandoSesion && Boolean(localStorage.getItem(STORAGE_TOKEN)));
  const timerMostrar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerOcultar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rutaAnterior = useRef(pathname);

  const limpiarTimer = (timer: { current: ReturnType<typeof setTimeout> | null }) => {
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
  };

  const mostrar = useCallback((duracionMinima: number) => {
    const ahora = Date.now();
    if (!visibleActual.current) {
      visibleActual.current = true;
      setVisible(true);
    }
    mostrarHasta.current = Math.max(mostrarHasta.current, ahora + duracionMinima);
    if (timerOcultar.current !== null) {
      clearTimeout(timerOcultar.current);
      timerOcultar.current = null;
    }
  }, []);

  const cerrarCuandoCorresponda = useCallback(() => {
    if (pendientes.current.size > 0 || sesionEnCarga.current) return;
    if (timerMostrar.current !== null) {
      clearTimeout(timerMostrar.current);
      timerMostrar.current = null;
    }
    if (!visibleActual.current) return;
    if (timerOcultar.current !== null) clearTimeout(timerOcultar.current);
    const esperar = Math.max(0, mostrarHasta.current - Date.now());
    timerOcultar.current = setTimeout(() => {
      timerOcultar.current = null;
      if (pendientes.current.size === 0 && !sesionEnCarga.current) {
        visibleActual.current = false;
        setVisible(false);
      }
    }, esperar);
  }, []);

  useEffect(() => {
    const escuchar = (evento: Event) => {
      const detalle = (evento as CustomEvent<EventoCargaApi>).detail;
      if (!detalle || typeof detalle.id !== "number") return;
      if (detalle.tipo === "inicio") {
        pendientes.current.add(detalle.id);
        if (detalle.metodo === "GET") {
          if (visibleActual.current) {
            mostrar(650);
          } else if (timerMostrar.current === null) {
            timerMostrar.current = setTimeout(() => {
              timerMostrar.current = null;
              if (pendientes.current.size > 0) mostrar(1200);
            }, 220);
          }
        } else {
          // El login debe permitir ver el trazo completo, a ritmo medio-lento.
          mostrar(detalle.ruta?.includes("/auth/login") ? 2850 : 1750);
        }
      } else {
        pendientes.current.delete(detalle.id);
        cerrarCuandoCorresponda();
      }
    };
    window.addEventListener(EVENTO_CARGA_API, escuchar);
    return () => {
      window.removeEventListener(EVENTO_CARGA_API, escuchar);
      limpiarTimer(timerMostrar);
      limpiarTimer(timerOcultar);
      pendientes.current.clear();
    };
  }, [mostrar, cerrarCuandoCorresponda]);

  useEffect(() => {
    // Restauración de sesión: cubre la espera inicial antes de renderizar rutas protegidas.
    sesionEnCarga.current = cargandoSesion && Boolean(localStorage.getItem(STORAGE_TOKEN));
    if (sesionEnCarga.current) mostrar(1800);
    else cerrarCuandoCorresponda();
  }, [cargandoSesion, mostrar, cerrarCuandoCorresponda]);

  useEffect(() => {
    if (rutaAnterior.current !== pathname) {
      rutaAnterior.current = pathname;
      if (pathname !== "/login" && localStorage.getItem(STORAGE_TOKEN)) {
        mostrar(1200);
        cerrarCuandoCorresponda();
      }
    }
  }, [pathname, mostrar, cerrarCuandoCorresponda]);

  if (!visible) return null;
  return (
    <div className="epuleam-loader-fondo" role="status" aria-live="polite" aria-label="Cargando EPULEAM">
      <picture className="epuleam-loader-marca">
        <source media="(prefers-reduced-motion: reduce)" srcSet={logoEstatico} />
        <img src={logoAnimado} alt="EP ULEAM — Cargando" draggable={false} />
      </picture>
      <span className="epuleam-loader-lectura">Cargando, por favor espera...</span>
    </div>
  );
}
