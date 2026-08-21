// src/lib/disponibilidad.ts
import { Profesional, Turno } from '../types';

export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;

export function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Un turno 'reservado' con hold vencido (clienta abandonó el checkout de MP
// hace más de 15 min) ya no debe contar como que ocupa el horario — mismo
// criterio para mostrar disponibilidad que para el chequeo real del server
// en crear-preferencia.ts (que además es quien libera el horario de verdad
// en la base, marcándolo 'cancelado').
export function turnoBloqueaHorario(t: Turno): boolean {
  if (t.estado.startsWith('cancelado')) return false;
  if (t.estado === 'reservado' && t.expiraEn && new Date(t.expiraEn) < new Date()) return false;
  return true;
}

// Horarios reales disponibles: cruza el horario semanal de la profesional
// para ese día contra los turnos que ya tiene ocupados esa fecha — ya no es
// una lista fija, y nunca ofrece un horario que se superponga con otro turno.
export function calcularHorariosDisponibles(
  profesional: Profesional,
  fecha: string,
  duracionMinutos: number,
  turnosExistentes: Turno[]
): string[] {
  const diaSemana = DIAS_SEMANA[new Date(`${fecha}T12:00:00`).getDay()];
  const jornada = profesional.horarioDisponible[diaSemana];
  if (!jornada) return [];

  const ocupados = turnosExistentes.filter(
    (t) => t.profesionalId === profesional.id && t.fecha === fecha && turnoBloqueaHorario(t)
  );

  const slots: string[] = [];
  let cursor = jornada.desde;

  while (sumarMinutos(cursor, duracionMinutos) <= jornada.hasta) {
    const finSlot = sumarMinutos(cursor, duracionMinutos);
    const seSuperpone = ocupados.some((t) => cursor < t.horaFin && finSlot > t.horaInicio);
    if (!seSuperpone) slots.push(cursor);
    cursor = sumarMinutos(cursor, 30);
  }

  return slots;
}

// Franjas de 30 min entre dos horas, para dibujar la grilla del calendario.
export function generarFranjas(desde: string, hasta: string, intervaloMin = 30): string[] {
  const franjas: string[] = [];
  let cursor = desde;
  while (cursor < hasta) {
    franjas.push(cursor);
    cursor = sumarMinutos(cursor, intervaloMin);
  }
  return franjas;
}

export type EstadoFranja =
  | { tipo: 'fuera-horario' }
  | { tipo: 'libre' }
  | { tipo: 'ocupado'; turno: Turno };

// Para cada franja del día, dice si la profesional no trabaja ese horario,
// si está libre, o si tiene un turno tomado ahí — la base de la grilla visual.
export function estadoDeFranja(
  profesional: Profesional,
  fecha: string,
  horaFranja: string,
  turnosExistentes: Turno[]
): EstadoFranja {
  const diaSemana = DIAS_SEMANA[new Date(`${fecha}T12:00:00`).getDay()];
  const jornada = profesional.horarioDisponible[diaSemana];

  if (!jornada || horaFranja < jornada.desde || horaFranja >= jornada.hasta) {
    return { tipo: 'fuera-horario' };
  }

  const turno = turnosExistentes.find(
    (t) =>
      t.profesionalId === profesional.id &&
      t.fecha === fecha &&
      turnoBloqueaHorario(t) &&
      horaFranja >= t.horaInicio &&
      horaFranja < t.horaFin
  );

  return turno ? { tipo: 'ocupado', turno } : { tipo: 'libre' };
}
