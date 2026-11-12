import type { ReactNode } from "react";
import BarraLateral from "../componentes/BarraLateral";
import "../estilos/layout.css";
import "../estilos/sidebar.css";
import "../estilos/dashboard.css";
import "../estilos/mejorasInterfaz5B5.css";

interface Props {
  children: ReactNode;
}

function LayoutPrincipal({ children }: Props) {
  return (
    <div className="layout-principal">
      <BarraLateral />

      <main className="contenido-principal">
        {children}
      </main>
    </div>
  );
}

export default LayoutPrincipal;