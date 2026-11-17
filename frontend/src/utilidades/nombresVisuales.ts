/** Acorta solamente la presentación; nunca modifica el nombre almacenado ni las actas. */
export function nombreVisualUsuario(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 2) return partes.join(" ");
  // Convención del formulario: dos nombres seguidos de dos apellidos.
  return `${partes[0]} ${partes.length >= 4 ? partes[2] : partes[partes.length - 1]}`;
}
