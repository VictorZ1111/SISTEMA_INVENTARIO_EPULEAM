import SolicitudesSupervisor from "../supervisor/SolicitudesSupervisor";

// Reutiliza el mismo formulario y listado para evitar duplicar validaciones.
export default function SolicitudesResponsable() {
  return <SolicitudesSupervisor modo="responsable" />;
}
