import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import "../estilos/selector-periodo-filtro.css";

type ModoPeriodo = "mes" | "anio";

interface SelectorPeriodoFiltroProps {
  valor: string;
  alCambiar?: (valor: string) => void;
  onChange?: (valor: string) => void;
  tipo?: ModoPeriodo;
  modo?: ModoPeriodo;
  tipoPeriodo?: ModoPeriodo;
  periodo?: ModoPeriodo;
  ariaLabel?: string;
  deshabilitado?: boolean;
  disabled?: boolean;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const MESES_CORTOS = [
  "ene.",
  "feb.",
  "mar.",
  "abr.",
  "may.",
  "jun.",
  "jul.",
  "ago.",
  "sep.",
  "oct.",
  "nov.",
  "dic.",
];

function obtenerAnioSeguro(valor: string) {
  const coincidencia = valor.match(/^(\d{4})/);
  const anio = coincidencia ? Number(coincidencia[1]) : new Date().getFullYear();
  return Number.isFinite(anio) ? anio : new Date().getFullYear();
}

function obtenerMesSeguro(valor: string) {
  const coincidencia = valor.match(/^\d{4}-(\d{2})$/);
  const mes = coincidencia ? Number(coincidencia[1]) - 1 : new Date().getMonth();
  return mes >= 0 && mes <= 11 ? mes : new Date().getMonth();
}

export default function SelectorPeriodoFiltro({
  valor,
  alCambiar,
  onChange,
  tipo,
  modo,
  tipoPeriodo,
  periodo,
  ariaLabel,
  deshabilitado = false,
  disabled = false,
}: SelectorPeriodoFiltroProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);

  const modoActivo: ModoPeriodo =
    tipo ??
    modo ??
    tipoPeriodo ??
    periodo ??
    (valor.includes("-") ? "mes" : "anio");

  const [anioVisible, setAnioVisible] = useState(() => obtenerAnioSeguro(valor));
  const [inicioBloqueAnio, setInicioBloqueAnio] = useState(() => {
    const anio = obtenerAnioSeguro(valor);
    return anio - (anio % 12);
  });

  const estaDeshabilitado = deshabilitado || disabled;
  const emitirCambio = alCambiar ?? onChange ?? (() => undefined);

  const etiqueta = useMemo(() => {
    if (modoActivo === "anio") {
      return valor || "Selecciona un año";
    }

    if (!valor) return "Selecciona un mes";

    const anio = obtenerAnioSeguro(valor);
    const mes = obtenerMesSeguro(valor);
    return `${MESES[mes]} de ${anio}`;
  }, [modoActivo, valor]);

  const aniosBloque = useMemo(
    () => Array.from({ length: 12 }, (_, indice) => inicioBloqueAnio + indice),
    [inicioBloqueAnio],
  );

  useEffect(() => {
    const cerrarFuera = (evento: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    };

    const cerrarEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    document.addEventListener("mousedown", cerrarFuera);
    document.addEventListener("keydown", cerrarEscape);

    return () => {
      document.removeEventListener("mousedown", cerrarFuera);
      document.removeEventListener("keydown", cerrarEscape);
    };
  }, []);

  const abrirCerrar = () => {
    if (estaDeshabilitado) return;

    if (!abierto) {
      const anio = obtenerAnioSeguro(valor);
      setAnioVisible(anio);
      setInicioBloqueAnio(anio - (anio % 12));
    }

    setAbierto((actual) => !actual);
  };

  const seleccionarMes = (mes: number) => {
    emitirCambio(`${anioVisible}-${String(mes + 1).padStart(2, "0")}`);
    setAbierto(false);
  };

  const seleccionarAnio = (anio: number) => {
    emitirCambio(String(anio));
    setAbierto(false);
  };

  const seleccionarActual = () => {
    const ahora = new Date();

    if (modoActivo === "mes") {
      emitirCambio(
        `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`,
      );
    } else {
      emitirCambio(String(ahora.getFullYear()));
    }

    setAbierto(false);
  };

  const borrar = () => {
    emitirCambio("");
    setAbierto(false);
  };

  return (
    <div
      className={`selector-periodo-filtro${abierto ? " selector-periodo-filtro--abierto" : ""}`}
      ref={contenedorRef}
    >
      <button
        type="button"
        className="selector-periodo-filtro__boton"
        aria-label={
          ariaLabel ??
          (modoActivo === "mes" ? "Seleccionar mes" : "Seleccionar año")
        }
        aria-haspopup="dialog"
        aria-expanded={abierto}
        disabled={estaDeshabilitado}
        onClick={abrirCerrar}
      >
        <CalendarDays
          className="selector-periodo-filtro__icono"
          size={21}
          aria-hidden="true"
        />

        <span
          className={`selector-periodo-filtro__valor${valor ? "" : " selector-periodo-filtro__valor--vacio"}`}
        >
          {etiqueta}
        </span>

        <ChevronDown
          className="selector-periodo-filtro__flecha"
          size={19}
          aria-hidden="true"
        />
      </button>

      {abierto ? (
        <div
          className="selector-periodo-filtro__panel"
          role="dialog"
          aria-label={modoActivo === "mes" ? "Selector de mes" : "Selector de año"}
        >
          {modoActivo === "mes" ? (
            <>
              <div className="selector-periodo-filtro__cabecera">
                <button
                  type="button"
                  className="selector-periodo-filtro__navegacion"
                  aria-label="Año anterior"
                  onClick={() => setAnioVisible((actual) => actual - 1)}
                >
                  <ChevronLeft size={18} />
                </button>

                <strong>{anioVisible}</strong>

                <button
                  type="button"
                  className="selector-periodo-filtro__navegacion"
                  aria-label="Año siguiente"
                  onClick={() => setAnioVisible((actual) => actual + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="selector-periodo-filtro__grid selector-periodo-filtro__grid--meses">
                {MESES_CORTOS.map((mes, indice) => {
                  const seleccionado =
                    Boolean(valor) &&
                    obtenerAnioSeguro(valor) === anioVisible &&
                    obtenerMesSeguro(valor) === indice;

                  return (
                    <button
                      type="button"
                      key={mes}
                      className={`selector-periodo-filtro__opcion${seleccionado ? " selector-periodo-filtro__opcion--seleccionada" : ""}`}
                      onClick={() => seleccionarMes(indice)}
                    >
                      {mes}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="selector-periodo-filtro__cabecera">
                <button
                  type="button"
                  className="selector-periodo-filtro__navegacion"
                  aria-label="Bloque de años anterior"
                  onClick={() => setInicioBloqueAnio((actual) => actual - 12)}
                >
                  <ChevronLeft size={18} />
                </button>

                <strong>
                  {inicioBloqueAnio} – {inicioBloqueAnio + 11}
                </strong>

                <button
                  type="button"
                  className="selector-periodo-filtro__navegacion"
                  aria-label="Bloque de años siguiente"
                  onClick={() => setInicioBloqueAnio((actual) => actual + 12)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="selector-periodo-filtro__grid selector-periodo-filtro__grid--anios">
                {aniosBloque.map((anio) => {
                  const seleccionado = valor === String(anio);

                  return (
                    <button
                      type="button"
                      key={anio}
                      className={`selector-periodo-filtro__opcion${seleccionado ? " selector-periodo-filtro__opcion--seleccionada" : ""}`}
                      onClick={() => seleccionarAnio(anio)}
                    >
                      {anio}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="selector-periodo-filtro__pie">
            <button type="button" onClick={borrar}>
              Borrar
            </button>
            <button type="button" onClick={seleccionarActual}>
              {modoActivo === "mes" ? "Este mes" : "Este año"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
