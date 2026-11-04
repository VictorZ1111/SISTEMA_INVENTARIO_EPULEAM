import { useEffect, useRef, useState } from "react";

import {
  convertirTextoFechaAIso,
  crearFechaIsoLocal,
  DIAS_CALENDARIO,
  formatearFechaFiltro,
  MESES_CALENDARIO,
  normalizarEntradaFecha,
} from "../utilidades/fechas";

interface SelectorFechaFiltroProps {
  valor: string;
  alCambiar: (valor: string) => void;
  ariaLabel?: string;
}

export default function SelectorFechaFiltro({
  valor,
  alCambiar,
  ariaLabel = "Filtrar por fecha",
}: SelectorFechaFiltroProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [textoFecha, setTextoFecha] = useState(() =>
    formatearFechaFiltro(valor),
  );
  const [fechaInvalida, setFechaInvalida] = useState(false);
  const [mesVisible, setMesVisible] = useState(() => {
    if (valor) {
      const [anio, mes] = valor.split("-").map(Number);

      if (anio && mes) {
        return new Date(anio, mes - 1, 1);
      }
    }

    const hoy = new Date();

    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });

  useEffect(() => {
    const cerrarAlHacerClickFuera = (evento: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", cerrarAlHacerClickFuera);

    return () =>
      document.removeEventListener("mousedown", cerrarAlHacerClickFuera);
  }, []);

  useEffect(() => {
    setTextoFecha(formatearFechaFiltro(valor));
    setFechaInvalida(false);

    if (!valor) return;

    const [anio, mes] = valor.split("-").map(Number);

    if (anio && mes) {
      setMesVisible(new Date(anio, mes - 1, 1));
    }
  }, [valor]);

  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();
  const primerDia = new Date(anio, mes, 1);
  const desplazamientoLunes = (primerDia.getDay() + 6) % 7;
  const diasMes = new Date(anio, mes + 1, 0).getDate();

  const celdas = Array.from(
    { length: desplazamientoLunes + diasMes },
    (_, indice) => {
      if (indice < desplazamientoLunes) return null;

      return indice - desplazamientoLunes + 1;
    },
  );

  const hoyIso = crearFechaIsoLocal(new Date());

  const aplicarTextoFecha = () => {
    if (!textoFecha.trim()) {
      setFechaInvalida(false);
      alCambiar("");
      return;
    }

    const fechaIso = convertirTextoFechaAIso(textoFecha);

    if (!fechaIso) {
      setFechaInvalida(true);
      return;
    }

    setFechaInvalida(false);
    alCambiar(fechaIso);

    const [nuevoAnio, nuevoMes] = fechaIso.split("-").map(Number);

    setMesVisible(new Date(nuevoAnio, nuevoMes - 1, 1));
  };

  const seleccionarDia = (dia: number) => {
    const fechaIso = crearFechaIsoLocal(new Date(anio, mes, dia));

    alCambiar(fechaIso);
    setTextoFecha(formatearFechaFiltro(fechaIso));
    setFechaInvalida(false);
    setAbierto(false);
  };

  const seleccionarHoy = () => {
    const hoy = new Date();
    const fechaIso = crearFechaIsoLocal(hoy);

    alCambiar(fechaIso);
    setTextoFecha(formatearFechaFiltro(fechaIso));
    setFechaInvalida(false);
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setAbierto(false);
  };

  const limpiar = () => {
    alCambiar("");
    setTextoFecha("");
    setFechaInvalida(false);
    setAbierto(false);
  };

  return (
    <div className="movimientos-fecha-selector" ref={contenedorRef}>
      <div
        className={`movimientos-fecha-filtro${
          abierto ? " movimientos-fecha-filtro--abierto" : ""
        }${
          fechaInvalida ? " movimientos-fecha-filtro--invalido" : ""
        }`}
      >
        <button
          className="movimientos-fecha-filtro__calendario"
          type="button"
          aria-label="Abrir calendario"
          aria-haspopup="dialog"
          aria-expanded={abierto}
          title="Seleccionar fecha"
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => setAbierto((estado) => !estado)}
        >
          <span
            className="movimientos-fecha-filtro__marca"
            aria-hidden="true"
          />
        </button>

        <input
          type="text"
          inputMode="numeric"
          value={textoFecha}
          placeholder="dd/mm/aaaa"
          aria-label={ariaLabel}
          maxLength={10}
          onChange={(evento) => {
            const textoNormalizado = normalizarEntradaFecha(
              evento.target.value,
            );

            setTextoFecha(textoNormalizado);
            setFechaInvalida(false);

            if (!textoNormalizado) {
              alCambiar("");
            }
          }}
          onBlur={aplicarTextoFecha}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              aplicarTextoFecha();
              evento.currentTarget.blur();
            }
          }}
        />
      </div>

      {abierto && (
        <div
          className="movimientos-calendario"
          role="dialog"
          aria-label="Seleccionar fecha"
        >
          <div className="movimientos-calendario__cabecera">
            <button
              type="button"
              className="movimientos-calendario__navegacion"
              aria-label="Mes anterior"
              onClick={() => setMesVisible(new Date(anio, mes - 1, 1))}
            >
              ‹
            </button>

            <strong>{`${MESES_CALENDARIO[mes]} de ${anio}`}</strong>

            <button
              type="button"
              className="movimientos-calendario__navegacion"
              aria-label="Mes siguiente"
              onClick={() => setMesVisible(new Date(anio, mes + 1, 1))}
            >
              ›
            </button>
          </div>

          <div
            className="movimientos-calendario__semana"
            aria-hidden="true"
          >
            {DIAS_CALENDARIO.map((dia) => (
              <span key={dia}>{dia}</span>
            ))}
          </div>

          <div className="movimientos-calendario__dias">
            {celdas.map((dia, indice) => {
              if (!dia) {
                return (
                  <span
                    className="movimientos-calendario__vacio"
                    key={`vacio-${indice}`}
                  />
                );
              }

              const fechaIso = crearFechaIsoLocal(
                new Date(anio, mes, dia),
              );
              const seleccionado = fechaIso === valor;
              const esHoy = fechaIso === hoyIso;

              return (
                <button
                  type="button"
                  key={fechaIso}
                  className={[
                    "movimientos-calendario__dia",
                    seleccionado
                      ? "movimientos-calendario__dia--seleccionado"
                      : "",
                    esHoy ? "movimientos-calendario__dia--hoy" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={seleccionado}
                  onClick={() => seleccionarDia(dia)}
                >
                  {dia}
                </button>
              );
            })}
          </div>

          <div className="movimientos-calendario__pie">
            <button
              type="button"
              onClick={limpiar}
              disabled={!valor && !textoFecha}
            >
              Borrar
            </button>

            <button type="button" onClick={seleccionarHoy}>
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}