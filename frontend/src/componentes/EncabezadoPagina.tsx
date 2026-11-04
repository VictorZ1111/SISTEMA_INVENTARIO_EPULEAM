interface Props {
  titulo: string;
  descripcion?: string;
  etiqueta?: string;
}

function EncabezadoPagina({ titulo, descripcion, etiqueta }: Props) {
  return (
    <div className="encabezado-pagina">
      <div>
        <h1>{titulo}</h1>

        {descripcion && (
          <p>{descripcion}</p>
        )}
      </div>

      {etiqueta && (
        <span className="etiqueta-encabezado">
          {etiqueta}
        </span>
      )}
    </div>
  );
}

export default EncabezadoPagina;