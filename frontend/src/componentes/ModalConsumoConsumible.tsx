import axios from "axios";
import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { registrarConsumoApi } from "../api/movimientosApi";
import type { InventarioBodega } from "../contexto/InventarioContext";
import "../estilos/consumo-consumibles.css";

interface Props {
  bien: InventarioBodega;
  alCerrar: () => void;
  alCompletar: () => Promise<void>;
}

function mensajeDeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.message;
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
    if (Array.isArray(mensaje)) return mensaje.join(" ");
    if (!error.response) return "No se pudo conectar con el servidor.";
  }
  return "No se pudo registrar el consumo. Inténtalo nuevamente.";
}

export default function ModalConsumoConsumible({ bien, alCerrar, alCompletar }: Props) {
  const [cantidad, setCantidad] = useState("1");
  const [procesando, setProcesando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  const registrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (procesando || guardado) return;
    const unidades = Number(cantidad);
    if (!Number.isSafeInteger(unidades) || unidades < 1 || unidades > bien.cantidad) {
      setError(`Ingresa una cantidad entre 1 y ${bien.cantidad}.`);
      return;
    }
    setProcesando(true);
    setError("");
    try {
      await registrarConsumoApi({
        existenciaId: String(bien.id),
        cantidad: unidades,
      });
      setGuardado(true);
      try {
        await alCompletar();
        alCerrar();
      } catch {
        setError("El consumo se registró, pero no se pudo actualizar la tabla. Actualiza la página para ver el stock nuevo.");
      }
    } catch (fallo) {
      setError(mensajeDeError(fallo));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="modal-fondo consumo-modal-fondo" onMouseDown={(evento) => {
      if (evento.target === evento.currentTarget && !procesando) alCerrar();
    }}>
      <section className="modal-contenedor consumo-modal" role="dialog" aria-modal="true" aria-label="Registrar consumo">
        <div className="modal-header">
          <div>
            <h2>Registrar consumo</h2>
          </div>
          <button className="modal-cerrar" type="button" aria-label="Cerrar" disabled={procesando} onClick={alCerrar}><X size={20} /></button>
        </div>
        <form className="consumo-formulario" onSubmit={(evento) => void registrar(evento)}>
          <div className="consumo-resumen">
            <div><span>Bien</span><strong>{bien.descripcion}</strong></div>
            <div><span>Ubicación</span><strong>{bien.bodega}</strong></div>
            <div><span>Disponible</span><strong>{bien.cantidad}</strong></div>
          </div>
          <label className="consumo-campo">
            <span>Cantidad utilizada *</span>
            <input type="number" min="1" max={bien.cantidad} step="1" required disabled={procesando || guardado}
              value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} />
          </label>
          {error && <p className="consumo-error" role="alert">{error}</p>}
          <div className="consumo-acciones">
            <button type="button" className="boton-secundario" disabled={procesando} onClick={alCerrar}>{guardado ? "Cerrar" : "Cancelar"}</button>
            <button type="submit" className="boton-principal" disabled={procesando || guardado}>{procesando ? "Registrando..." : guardado ? "Registrado" : "Confirmar consumo"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
