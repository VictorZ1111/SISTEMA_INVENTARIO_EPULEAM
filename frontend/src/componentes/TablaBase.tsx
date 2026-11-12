import { Children, type ReactNode } from "react";
import UleamLoader from "./UleamLoader";

interface Props {
  titulo?: string;
  columnas: string[];
  children?: ReactNode;
  mensajeVacio?: string;
  accion?: ReactNode;
}

function TablaBase({
  titulo,
  columnas,
  children,
  mensajeVacio,
  accion,
}: Props) {
  const estaVacia = Children.toArray(children).length === 0;
  const identificador = `${titulo || ""} ${columnas.join(" ")}`.toLowerCase();
  const mensajeVacioPredeterminado = identificador.includes("solicitud") || identificador.includes("solicitado")
    ? "Aún no se han registrado solicitudes."
    : identificador.includes("movimiento") || identificador.includes("tipo movimiento")
      ? "Aún no se han registrado movimientos."
      : identificador.includes("usuario") || identificador.includes("correo")
        ? "Aún no se han registrado usuarios."
        : identificador.includes("bodega") && !identificador.includes("bien")
          ? "Aún no se han registrado bodegas."
          : identificador.includes("bien") || identificador.includes("producto")
            ? "Aún no se han registrado productos en este inventario."
            : "Aún no se han registrado elementos en este apartado.";

  const columnasCentradas = columnas
    .map((columna, indice) => {
      const etiqueta = columna
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

      const esCantidad =
        etiqueta.includes("cantidad") ||
        [
          "solicitado",
          "entregado",
          "rechazado",
          "pendiente",
          "stock",
          "disponible",
        ].includes(etiqueta);

      return esCantidad ? `tabla-columna-centro-${indice + 1}` : null;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <div className="tabla-card">
      {(titulo || accion) && (
        <div className="tabla-card-header">
          {titulo && <h2>{titulo}</h2>}
          {accion && <div>{accion}</div>}
        </div>
      )}

      <div className="tabla-contenedor">
        <table className={columnasCentradas}>
          <thead>
            <tr>
              {columnas.map((columna) => (
                <th key={columna}>{columna}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {estaVacia ? (
              <tr>
                <td colSpan={columnas.length} className="tabla-vacia">
                  {mensajeVacio?.trim().toLowerCase().startsWith("cargando")
                    ? <UleamLoader size={96} texto={mensajeVacio} />
                    : mensajeVacio ?? mensajeVacioPredeterminado}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TablaBase;