import { BrowserRouter } from "react-router-dom";

import { ConfiguracionProvider } from "./contexto/ConfiguracionContext";
import { InventarioProvider } from "./contexto/InventarioContext";
import { UsuariosProvider } from "./contexto/UsuariosContext";
import { AuthProvider } from "./contexto/AuthContext";

import RutasAplicacion from "./rutas/RutasAplicacion";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfiguracionProvider>
          <UsuariosProvider>
            <InventarioProvider>
              <RutasAplicacion />
            </InventarioProvider>
          </UsuariosProvider>
        </ConfiguracionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;