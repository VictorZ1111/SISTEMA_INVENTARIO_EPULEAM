import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import UleamLoader from "../componentes/UleamLoader";
import BarraLateral from "../componentes/BarraLateral";
import "../estilos/layout.css";
import "../estilos/sidebar.css";
import "../estilos/dashboard.css";
import "../estilos/mejorasInterfaz5B5.css";

interface Props {
  children: ReactNode;
}

// Al abrir un apartado, el logo se dibuja dentro de su zona de contenido.
// El contenido ya está montado mientras tanto: los datos se consultan en paralelo.
const TIEMPO_VISUAL_APARTADO_MS = 1650;

function LayoutPrincipal({ children }: Props) {
  const { pathname } = useLocation();
  const [rutaLista, setRutaLista] = useState("");
  const mostrandoLoader = rutaLista !== pathname;

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setRutaLista(pathname);
    }, TIEMPO_VISUAL_APARTADO_MS);
    return () => window.clearTimeout(temporizador);
  }, [pathname]);

  return (
    <div className="layout-principal">
      <BarraLateral />

      <main className="contenido-principal">
        {mostrandoLoader && (
          <div className="uleam-apartado-cargando">
            <UleamLoader size={122} texto="Cargando apartado..." />
          </div>
        )}
        <div className={mostrandoLoader ? "uleam-apartado-contenido uleam-apartado-contenido--espera" : "uleam-apartado-contenido"}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default LayoutPrincipal;