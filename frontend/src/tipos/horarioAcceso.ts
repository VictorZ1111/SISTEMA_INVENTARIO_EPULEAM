export interface HorarioDia {
  dia: number; // 1 lunes ... 7 domingo
  activo: boolean;
  desde: string;
  hasta: string;
}
export type HorarioSemanal = HorarioDia[] | null;
export const DIAS_HORARIO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export function horarioPorDefecto(): HorarioDia[] {
  return DIAS_HORARIO.map((_, indice) => ({
    dia: indice + 1,
    activo: true,
    desde: "08:00",
    hasta: "18:00",
  }));
}

/** Consulta visual del horario. La autorización definitiva se verifica en el backend. */
export function estaDentroDeHorario(horario: HorarioSemanal, fecha = new Date()): boolean {
  if (!horario) return true;
  const partes = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(fecha);
  const obtener = (tipo: string) => partes.find((dato) => dato.type === tipo)?.value ?? "";
  const dia = obtener("weekday").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const indice = ["", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"].indexOf(dia);
  const franja = horario.find((elemento) => elemento.dia === indice);
  const hora = `${obtener("hour")}:${obtener("minute")}`;
  return Boolean(franja?.activo && hora >= franja.desde && hora < franja.hasta);
}
