import { BadRequestException, ForbiddenException } from "@nestjs/common";

export interface HorarioDia {
  dia: number; // Lunes=1 ... Domingo=7.
  activo: boolean;
  desde: string; // HH:mm, zona de Ecuador.
  hasta: string;
}

export type HorarioSemanal = HorarioDia[] | null;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** null significa sin restricción. Un horario configurado exige siete días distintos. */
export function validarHorarioSemanal(horario: HorarioSemanal): HorarioSemanal {
  if (horario === null) return null;
  if (!Array.isArray(horario) || horario.length !== 7) {
    throw new BadRequestException("Configura los siete días de la semana o desactiva la restricción de horario.");
  }
  const vistos = new Set<number>();
  for (const franja of horario) {
    if (!franja || !Number.isInteger(franja.dia) || franja.dia < 1 || franja.dia > 7 || vistos.has(franja.dia)) {
      throw new BadRequestException("Los días del horario deben ser únicos y estar comprendidos entre lunes y domingo.");
    }
    vistos.add(franja.dia);
    if (typeof franja.activo !== "boolean" || !HORA.test(franja.desde) || !HORA.test(franja.hasta)) {
      throw new BadRequestException("El horario de acceso contiene una hora o un día no válido.");
    }
    if (franja.activo && franja.desde >= franja.hasta) {
      throw new BadRequestException(`En ${DIAS[franja.dia]}, la hora final debe ser posterior a la inicial.`);
    }
  }
  if (!horario.some((dia) => dia.activo)) {
    throw new BadRequestException("Selecciona al menos un día permitido o desactiva la restricción de horario.");
  }
  return [...horario].sort((a, b) => a.dia - b.dia).map((franja) => ({ ...franja }));
}

/** Valida siempre según America/Guayaquil, independiente de la zona horaria del servidor. */
export function estaDentroDeHorarioSemanal(horario: HorarioSemanal, fecha = new Date()): boolean {
  if (horario === null || horario === undefined) return true;
  const partes = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(fecha);
  const parte = (tipo: string) => partes.find((dato) => dato.type === tipo)?.value ?? "";
  const diaActual = parte("weekday").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const indice = DIAS.findIndex((dia) => dia.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === diaActual);
  const configuracion = horario.find((franja) => franja.dia === indice);
  const horaActual = `${parte("hour")}:${parte("minute")}`;
  return Boolean(configuracion?.activo && horaActual >= configuracion.desde && horaActual < configuracion.hasta);
}

/** La excepción, cuando está vigente, prevalece sobre la franja, sin cambiar la cuenta. */
export function verificarAccesoPorHorario(
  horario: HorarioSemanal,
  fecha = new Date(),
  excepcion?: { permitido: boolean | null; hasta: Date | string | null },
): void {
  if (excepcion?.hasta && excepcion.permitido !== null && excepcion.permitido !== undefined &&
      new Date(excepcion.hasta).getTime() > fecha.getTime()) {
    if (excepcion.permitido) return;
    throw new ForbiddenException({
      code: "ACCESO_TEMPORAL_SUSPENDIDO",
      message: "Tu acceso está suspendido temporalmente por el Administrador. Inténtalo más tarde.",
    });
  }
  if (!estaDentroDeHorarioSemanal(horario, fecha)) {
    throw new ForbiddenException({
      code: "HORARIO_NO_PERMITIDO",
      message: "Estás fuera de tu horario de acceso. Consulta con el Administrador para conocer tus días y horas autorizados (hora de Ecuador).",
    });
  }
}
