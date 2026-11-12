import { Clock3, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  valor: string;
  alCambiar: (hora: string) => void;
  ariaLabel: string;
  deshabilitado?: boolean;
};

const HORAS = Array.from({ length: 24 }, (_, indice) => String(indice).padStart(2, "0"));
const MINUTOS = Array.from({ length: 60 }, (_, indice) => String(indice).padStart(2, "0"));
const ANCHO_MENU = 276;
const ALTO_MENU = 308;

/** Selector accesible de hora/minuto con el estilo del calendario de EPULEAM.
 * El menú usa un portal para no quedar cortado por el scroll interno del modal.
 * Conserva precisión de un minuto y el formato HH:mm requerido por el backend.
 */
export default function SelectorHoraAcceso({ valor, alCambiar, ariaLabel, deshabilitado = false }: Props) {
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const horasRef = useRef<HTMLDivElement>(null);
  const minutosRef = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [horaTemporal, setHoraTemporal] = useState("08");
  const [minutoTemporal, setMinutoTemporal] = useState("00");
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });

  const actualizarPosicion = () => {
    const rect = botonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margen = 12;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const abrirArriba = espacioAbajo < ALTO_MENU + margen && rect.top > espacioAbajo;
    const top = abrirArriba
      ? Math.max(margen, rect.top - ALTO_MENU - 6)
      : Math.min(rect.bottom + 6, window.innerHeight - ALTO_MENU - margen);
    const left = Math.max(margen, Math.min(rect.left, window.innerWidth - ANCHO_MENU - margen));
    setPosicion({ top: Math.max(margen, top), left });
  };

  const abrirSelector = () => {
    if (deshabilitado) return;
    if (abierto) {
      setAbierto(false);
      return;
    }
    const [hora, minuto] = valor.split(":");
    setHoraTemporal(HORAS.includes(hora) ? hora : "08");
    setMinutoTemporal(MINUTOS.includes(minuto) ? minuto : "00");
    actualizarPosicion();
    setAbierto(true);
  };

  useEffect(() => {
    if (!abierto) return;
    function cerrarFuera(evento: MouseEvent) {
      const destino = evento.target as Node;
      if (!botonRef.current?.contains(destino) && !menuRef.current?.contains(destino)) {
        setAbierto(false);
      }
    }
    function cerrarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", cerrarFuera);
    document.addEventListener("keydown", cerrarEscape);
    window.addEventListener("resize", actualizarPosicion);
    window.addEventListener("scroll", actualizarPosicion, true);
    return () => {
      document.removeEventListener("mousedown", cerrarFuera);
      document.removeEventListener("keydown", cerrarEscape);
      window.removeEventListener("resize", actualizarPosicion);
      window.removeEventListener("scroll", actualizarPosicion, true);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    if (horasRef.current) horasRef.current.scrollTop = Math.max(0, Number(horaTemporal) * 35 - 62);
    if (minutosRef.current) minutosRef.current.scrollTop = Math.max(0, Number(minutoTemporal) * 35 - 62);
  }, [abierto]);

  useEffect(() => {
    if (deshabilitado) setAbierto(false);
  }, [deshabilitado]);

  function aplicar() {
    const nuevaHora = `${horaTemporal}:${minutoTemporal}`;
    if (nuevaHora !== valor) alCambiar(nuevaHora);
    setAbierto(false);
    botonRef.current?.focus();
  }

  return (
    <div className="selector-hora-epuleam">
      <button
        ref={botonRef}
        type="button"
        className={`selector-hora-epuleam__boton${abierto ? " selector-hora-epuleam__boton--abierto" : ""}`}
        disabled={deshabilitado}
        aria-label={`${ariaLabel}: ${valor}`}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={abrirSelector}
      >
        <span>{valor}</span>
        <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {abierto && createPortal(
        <div
          ref={menuRef}
          role="dialog"
          aria-label={`Seleccionar ${ariaLabel.toLowerCase()}`}
          className="selector-hora-epuleam__menu"
          style={{ top: posicion.top, left: posicion.left }}
        >
          <div className="selector-hora-epuleam__encabezado">
            <strong>Seleccionar hora</strong>
            <button type="button" aria-label="Cerrar selector de hora" onClick={() => setAbierto(false)}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="selector-hora-epuleam__columnas">
            <div className="selector-hora-epuleam__columna">
              <span className="selector-hora-epuleam__titulo">Hora</span>
              <div className="selector-hora-epuleam__opciones" ref={horasRef} role="group" aria-label="Horas">
                {HORAS.map((hora) => (
                  <button key={hora} type="button" aria-pressed={hora === horaTemporal}
                    className={hora === horaTemporal ? "seleccionado" : ""}
                    onClick={() => setHoraTemporal(hora)}>{hora}</button>
                ))}
              </div>
            </div>
            <div className="selector-hora-epuleam__columna">
              <span className="selector-hora-epuleam__titulo">Minuto</span>
              <div className="selector-hora-epuleam__opciones" ref={minutosRef} role="group" aria-label="Minutos">
                {MINUTOS.map((minuto) => (
                  <button key={minuto} type="button" aria-pressed={minuto === minutoTemporal}
                    className={minuto === minutoTemporal ? "seleccionado" : ""}
                    onClick={() => setMinutoTemporal(minuto)}>{minuto}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="selector-hora-epuleam__pie">
            <span>{horaTemporal}:{minutoTemporal}</span>
            <button type="button" onClick={aplicar}>Aplicar</button>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
