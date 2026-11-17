import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Download, Paintbrush } from "lucide-react";

import { consultarRegistrosActas, type FiltrosActas, type RegistroActa, type PeriodoActas, type TipoBienActa } from "../../api/actasApi";
import CampoDesplegable from "../../componentes/CampoDesplegable";
import EncabezadoPagina from "../../componentes/EncabezadoPagina";
import SelectorFechaFiltro from "../../componentes/SelectorFechaFiltro";
import SelectorPeriodoFiltro from "../../componentes/SelectorPeriodoFiltro";
import { useUsuarios } from "../../contexto/UsuariosContext";
import { descargarActaWord } from "../../utilidades/actasWord";
import "../../estilos/actas.css";

type CategoriaActa = "recepcion" | "entrega";

function fechaLocal(hoy: Date) {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function filtrosIniciales(): FiltrosActas {
  const hoy = new Date();
  const fecha = fechaLocal(hoy);
  return {
    periodo: "dia", fecha, mes: fecha.slice(0, 7),
    anio: String(hoy.getFullYear()), fechaInicio: fecha, fechaFin: fecha,
    custodioId: "todos", tipoProducto: "todos",
  };
}

function fechaSoloDia(valor: string) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "Fecha no disponible" :
    new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric" }).format(fecha);
}

function mensajeError(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "No se pudo conectar con el servidor.";
    const mensaje = error.response?.data?.message;
    if (typeof mensaje === "string" && !/sql|query failed|constraint|postgres|database|syntax error/i.test(mensaje)) return mensaje;
    if (Array.isArray(mensaje)) return mensaje.join(" ");
  }
  return "No se pudieron cargar los movimientos para las actas. Inténtalo nuevamente.";
}

export default function ActasAdmin() {
  const { usuarios } = useUsuarios();
  const [categoria, setCategoria] = useState<CategoriaActa>("recepcion");
  const [filtros, setFiltros] = useState<FiltrosActas>(filtrosIniciales);
  const [registros, setRegistros] = useState<RegistroActa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const rangoInvalido = filtros.periodo === "rango" && (!filtros.fechaInicio || !filtros.fechaFin || filtros.fechaInicio > filtros.fechaFin);

  useEffect(() => {
    if (rangoInvalido) return;
    let vigente = true;
    setCargando(true);
    setError("");
    void consultarRegistrosActas(filtros)
      .then((datos) => { if (vigente) setRegistros(datos); })
      .catch((fallo: unknown) => { if (vigente) { setRegistros([]); setError(mensajeError(fallo)); } })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [filtros, rangoInvalido]);

  const registrosVisibles = useMemo(() => registros.filter((registro) =>
    categoria === "recepcion" ? registro.tipo === "entrada" : registro.tipo === "transferencia",
  ), [registros, categoria]);

  const custodios = useMemo(() => [
    { valor: "todos", etiqueta: "Todos los custodios" },
    { valor: "administracion", etiqueta: "Administración (Inventario general)" },
    ...usuarios.filter((usuario) => usuario.rol !== "admin")
      .map((usuario) => ({ valor: String(usuario.id), etiqueta: usuario.nombre }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es")),
  ], [usuarios]);

  const actualizar = <K extends keyof FiltrosActas>(clave: K, valor: FiltrosActas[K]) => {
    setFiltros((actual) => ({ ...actual, [clave]: valor }));
  };

  const datosDocumento = (registro: RegistroActa) => ({
    id: registro.id,
    tipo: (registro.tipo === "entrada" ? "recepcion" : "entrega") as "recepcion" | "entrega",
    fecha: registro.createdAt,
    codigo: registro.codigo,
    bien: registro.producto,
    cantidad: registro.cantidad,
    origen: registro.origen,
    destino: registro.destino,
    registradoPor: registro.usuario,
    observacion: registro.observacion,
    revertido: registro.revertido,
  });

  const generarWord = async (registro: RegistroActa) => {
    try {
      await descargarActaWord(datosDocumento(registro));
      setError("");
    } catch {
      setError("No se pudo generar el acta en Word. Comprueba que las plantillas estén instaladas.");
    }
  };

  return (
    <div className="pagina-admin pagina-actas">
      <EncabezadoPagina titulo="Actas" descripcion="Genera actas en Word editable a partir de las plantillas institucionales aprobadas." />

      <div className="actas-pestanas" role="tablist" aria-label="Tipos de acta">
        <button type="button" role="tab" aria-selected={categoria === "recepcion"} className={categoria === "recepcion" ? "activa" : ""} onClick={() => setCategoria("recepcion")}>Recepción interna</button>
        <button type="button" role="tab" aria-selected={categoria === "entrega"} className={categoria === "entrega" ? "activa" : ""} onClick={() => setCategoria("entrega")}>Entrega</button>
      </div>

      <section className="actas-panel-filtros" aria-label="Filtros de actas">
        <div className="actas-filtros">
          <CampoDesplegable ariaLabel="Tipo de periodo" valor={filtros.periodo} opciones={[
            { valor: "dia", etiqueta: "Día" }, { valor: "mes", etiqueta: "Mes" },
            { valor: "anio", etiqueta: "Año" }, { valor: "rango", etiqueta: "Entre periodos" },
          ]} alCambiar={(valor) => actualizar("periodo", valor as PeriodoActas)} anchoMinimo={155} />

          {filtros.periodo === "dia" && <SelectorFechaFiltro valor={filtros.fecha} alCambiar={(valor) => actualizar("fecha", valor)} ariaLabel="Fecha del acta" />}
          {filtros.periodo === "mes" && <SelectorPeriodoFiltro valor={filtros.mes} tipo="mes" alCambiar={(valor) => actualizar("mes", valor)} />}
          {filtros.periodo === "anio" && <SelectorPeriodoFiltro valor={filtros.anio} tipo="anio" alCambiar={(valor) => actualizar("anio", valor)} />}
          {filtros.periodo === "rango" && <>
            <SelectorFechaFiltro valor={filtros.fechaInicio} alCambiar={(valor) => actualizar("fechaInicio", valor)} ariaLabel="Fecha inicial" />
            <SelectorFechaFiltro valor={filtros.fechaFin} alCambiar={(valor) => actualizar("fechaFin", valor)} ariaLabel="Fecha final" />
          </>}
          <CampoDesplegable ariaLabel="Custodio" valor={filtros.custodioId} opciones={custodios} alCambiar={(valor) => actualizar("custodioId", valor)} anchoMinimo={210} />
          <CampoDesplegable ariaLabel="Tipo de bien" valor={filtros.tipoProducto} opciones={[
            { valor: "todos", etiqueta: "Todos los bienes" },
            { valor: "consumible", etiqueta: "Consumibles" },
            { valor: "no_consumible", etiqueta: "No consumibles" },
          ]} alCambiar={(valor) => actualizar("tipoProducto", valor as TipoBienActa)} anchoMinimo={175} />
          <button type="button" className="actas-boton-limpiar" onClick={() => { setFiltros(filtrosIniciales()); setError(""); }} title="Limpiar filtros" aria-label="Limpiar filtros"><Paintbrush size={19} /></button>
        </div>
        {rangoInvalido && <p className="actas-error" role="alert">Selecciona un periodo válido: la fecha inicial no puede ser posterior a la fecha final.</p>}
      </section>

      <section className="actas-listado">
        <div className="actas-listado-encabezado">
          <div><h2>{categoria === "recepcion" ? "Actas de recepción interna" : "Actas de entrega"}</h2><p>Selecciona un movimiento y descarga el acta en Word editable.</p></div>
          <span className="actas-contador">{rangoInvalido ? 0 : registrosVisibles.length} registros</span>
        </div>
        {error && <p className="actas-error" role="alert">{error}</p>}
        <div className="actas-tabla-scroll">
          <table className="actas-tabla">
            <thead><tr><th>Fecha</th><th>Código</th><th>Bien</th><th>Cantidad</th><th>Registrado por</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {cargando && !rangoInvalido ? <tr><td colSpan={7} className="actas-sin-registros">Cargando movimientos...</td></tr> :
                rangoInvalido || registrosVisibles.length === 0 ? <tr><td colSpan={7} className="actas-sin-registros">{rangoInvalido ? "Corrige las fechas para consultar los movimientos." : error ? "No se pudieron cargar los registros." : `Todavía no se han registrado ${categoria === "recepcion" ? "recepciones internas" : "entregas"} para los filtros seleccionados.`}</td></tr> :
                registrosVisibles.map((registro) => (
                  <tr key={registro.id}>
                    <td>{fechaSoloDia(registro.createdAt)}</td>
                    <td>{registro.codigo || "Sin código"}</td>
                    <td>{registro.producto}</td>
                    <td className="actas-cantidad">{registro.cantidad}</td>
                    <td>{registro.usuario}</td>
                    <td><span className={`actas-estado ${registro.revertido ? "revertida" : "registrada"}`}>{registro.revertido ? "Revertida" : "Registrada"}</span></td>
                    <td><div className="actas-acciones-documentos">
                      <button type="button" className="actas-generar-pdf" title="Descargar Word editable" aria-label={`Descargar acta Word de ${registro.producto}`} onClick={() => void generarWord(registro)}><Download size={19} aria-hidden="true" /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
