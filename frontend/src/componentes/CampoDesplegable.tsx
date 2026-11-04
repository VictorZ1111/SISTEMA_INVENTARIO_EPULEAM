import { ChevronDown, Filter } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type OpcionDesplegable = {
  valor: string;
  etiqueta?: string;
  texto?: string;
  alerta?: boolean;
  deshabilitada?: boolean;
  deshabilitado?: boolean;
};

type CampoDesplegableProps = {
  valor: string;
  opciones: OpcionDesplegable[];
  alCambiar?: (valor: string) => void;
  onChange?: (valor: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  icono?: LucideIcon;
  mostrarIconoFiltro?: boolean;
  ancho?: number | string;
  anchoMinimo?: number;
  anchoMenu?: number | string;
  altoMenuMaximo?: number;
  deshabilitado?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

function obtenerTextoOpcion(opcion?: OpcionDesplegable) {
  return opcion?.etiqueta || opcion?.texto || "";
}

function obtenerAnchoCss(valor?: number | string) {
  if (typeof valor === "number") return `${valor}px`;
  return valor;
}

export default function CampoDesplegable({
  valor,
  opciones,
  alCambiar,
  onChange,
  placeholder = "Selecciona una opción",
  ariaLabel = "Seleccionar opción",
  icono: IconoPersonalizado,
  mostrarIconoFiltro = true,
  ancho,
  anchoMinimo = 180,
  anchoMenu,
  altoMenuMaximo = 220,
  deshabilitado = false,
  disabled = false,
  className = "",
}: CampoDesplegableProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const botonRef = useRef<HTMLButtonElement | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [posicionMenu, setPosicionMenu] = useState({ top: 0, left: 0, width: 0 });

  const opcionActiva = opciones.find((opcion) => opcion.valor === valor);
  const textoActual = obtenerTextoOpcion(opcionActiva) || placeholder;
  const Icono = IconoPersonalizado || Filter;
  const estaDeshabilitado = deshabilitado || disabled;

  function actualizarPosicionMenu() {
    const boton = botonRef.current;
    if (!boton) return;

    const rect = boton.getBoundingClientRect();
    const anchoCalculado = typeof anchoMenu === "number" ? anchoMenu : rect.width;
    const margen = 12;
    const anchoFinal = anchoCalculado || rect.width;
    const izquierdaMaxima = window.innerWidth - anchoFinal - margen;
    const espacioAbajo = window.innerHeight - rect.bottom - margen;
    const espacioArriba = rect.top - margen;
    const abrirArriba = espacioAbajo < altoMenuMaximo && espacioArriba > espacioAbajo;
    const altoDisponible = Math.max(
      160,
      Math.min(altoMenuMaximo, abrirArriba ? espacioArriba - 8 : espacioAbajo - 8)
    );

    setPosicionMenu({
      top: abrirArriba ? rect.top - altoDisponible - 8 : rect.bottom + 8,
      left: Math.max(margen, Math.min(rect.left, izquierdaMaxima)),
      width: anchoFinal,
    });
  }

  function alternarMenu() {
    if (estaDeshabilitado) return;
    if (!abierto) actualizarPosicionMenu();
    setAbierto((estado) => !estado);
  }

  function seleccionarOpcion(opcion: OpcionDesplegable) {
    if (opcion.deshabilitada || opcion.deshabilitado) return;
    const manejarCambio = alCambiar || onChange;
    manejarCambio?.(opcion.valor);
    setAbierto(false);
  }

  useEffect(() => {
    if (!abierto) return;

    function cerrarSiClickAfuera(evento: MouseEvent) {
      const objetivo = evento.target as Node;
      const menu = document.getElementById("menu-campo-desplegable");

      if (contenedorRef.current?.contains(objetivo) || menu?.contains(objetivo)) {
        return;
      }

      setAbierto(false);
    }

    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", cerrarSiClickAfuera);
    document.addEventListener("keydown", cerrarConEscape);
    window.addEventListener("resize", actualizarPosicionMenu);
    window.addEventListener("scroll", actualizarPosicionMenu, true);

    return () => {
      document.removeEventListener("mousedown", cerrarSiClickAfuera);
      document.removeEventListener("keydown", cerrarConEscape);
      window.removeEventListener("resize", actualizarPosicionMenu);
      window.removeEventListener("scroll", actualizarPosicionMenu, true);
    };
  }, [abierto]);

  return (
    <div
      ref={contenedorRef}
      className={`campo-desplegable ${className}`.trim()}
      style={{
        width: obtenerAnchoCss(ancho),
        minWidth: anchoMinimo,
      }}
    >
      <button
        ref={botonRef}
        type="button"
        className={`campo-desplegable__boton ${abierto ? "campo-desplegable__boton--abierto" : ""}`}
        onClick={alternarMenu}
        disabled={estaDeshabilitado}
        aria-label={ariaLabel}
        aria-expanded={abierto}
      >
        <span className="campo-desplegable__contenido">
          {mostrarIconoFiltro && <Icono size={18} className="campo-desplegable__icono" />}
          <span className="campo-desplegable__texto">{textoActual}</span>
          {opcionActiva?.alerta && <strong className="campo-desplegable__alerta">!</strong>}
        </span>

        <ChevronDown
          size={17}
          className={`campo-desplegable__flecha ${abierto ? "campo-desplegable__flecha--abierta" : ""}`}
        />
      </button>

      {abierto &&
        createPortal(
          <div
            id="menu-campo-desplegable"
            className="campo-desplegable__menu"
            style={{
              top: posicionMenu.top,
              left: posicionMenu.left,
              width: obtenerAnchoCss(anchoMenu) || `${posicionMenu.width}px`,
              minWidth: anchoMinimo,
              maxHeight: altoMenuMaximo,
            }}
          >
            {opciones.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                className={`campo-desplegable__opcion ${opcion.valor === valor ? "campo-desplegable__opcion--activa" : ""}`}
                onClick={() => seleccionarOpcion(opcion)}
                disabled={opcion.deshabilitada || opcion.deshabilitado}
              >
                <span className="campo-desplegable__opcion-texto">
                  {obtenerTextoOpcion(opcion)}
                </span>
                {opcion.alerta && <strong className="campo-desplegable__alerta">!</strong>}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
