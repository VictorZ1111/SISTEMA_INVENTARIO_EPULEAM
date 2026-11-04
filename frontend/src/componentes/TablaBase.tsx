import type { ReactNode } from "react";

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
  mensajeVacio = "No se encontraron registros",
  accion,
}: Props) {
  const estaVacia = !children;

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
                  {mensajeVacio}
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