// src/lib/disponibilidad.ts
import { Profesional, Turno } from '../types';

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;

export function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
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
    (t) =>
      t.profesionalId === profesional.id &&
      t.fecha === fecha &&
      !t.estado.startsWith('cancelado')
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
