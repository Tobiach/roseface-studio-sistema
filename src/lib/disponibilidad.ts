// src/lib/disponibilidad.ts
import { Profesional, Turno, BloqueoHorario } from '../types';

export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;

export function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Fin de un turno que empieza a `hora` y dura `minutos`, sin pasar de la medianoche: como el equipo
// puede cargar turnos a cualquier hora (ej. 22:30), uno largo no puede "dar la vuelta" a las 00:30
// (la base guarda hora_fin como hora del día y quedaría anterior al inicio): termina a las 23:59.
export function finSinPasarMedianoche(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  if (total >= 24 * 60) return '23:59';
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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

// Un bloqueo manual (Fase 6) cubre una franja si es de día completo, o si
// se superpone con el rango horario del bloqueo.
function bloqueoCubreFranja(b: BloqueoHorario, horaFranja: string, horaFin: string): boolean {
  if (b.diaCompleto) return true;
  if (!b.horaInicio || !b.horaFin) return true; // por las dudas, un bloqueo mal cargado bloquea todo el día
  return horaFranja < b.horaFin && horaFin > b.horaInicio;
}

// "Hoy" y "ahora" en la zona del navegador (los usuarios de Rose Face
// están en Argentina, UTC-3 sin horario de verano). Se usa para no ofrecer
// horarios que ya pasaron.
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fecha ISO de mañana — default del calendario de reserva.
export function mananaISO(): string {
  return sumarDiasISO(hoyISO(), 1);
}

// Suma (o resta, con n negativo) días de calendario a una fecha ISO "YYYY-MM-DD".
export function sumarDiasISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const fecha = new Date(y, m - 1, d + n);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function hoyYAhora(): { hoy: string; ahora: string } {
  const d = new Date();
  const hoy = hoyISO();
  const ahora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { hoy, ahora };
}

// Horarios reales disponibles para reservar. Cruza:
//  - los horarios fijos de la profesional para ese día (o la grilla cada
//    30 min si ese día no tiene horarios fijos definidos)
//  - los turnos ya ocupados esa fecha
//  - los bloqueos manuales
//  - la hora actual (si la fecha es hoy, no ofrece horarios que ya pasaron)
export function calcularHorariosDisponibles(
  profesional: Profesional,
  fecha: string,
  duracionMinutos: number,
  turnosExistentes: Turno[],
  bloqueos: BloqueoHorario[] = []
): string[] {
  const diaSemana = DIAS_SEMANA[new Date(`${fecha}T12:00:00`).getDay()];
  const jornada = profesional.horarioDisponible[diaSemana];
  if (!jornada) return [];

  const ocupados = turnosExistentes.filter(
    (t) => t.profesionalId === profesional.id && t.fecha === fecha && turnoBloqueaHorario(t)
  );
  const bloqueosDelDia = bloqueos.filter((b) => b.profesionalId === profesional.id && b.fecha === fecha);
  const { hoy, ahora } = hoyYAhora();
  if (fecha < hoy) return []; // fecha pasada: nunca hay horarios para reservar
  const esHoy = fecha === hoy;

  // Candidatos: horarios fijos de ese día, o la grilla cada 30 min.
  const fijosDelDia = profesional.horariosFijos?.[diaSemana];
  let candidatos: string[];
  if (fijosDelDia && fijosDelDia.length > 0) {
    candidatos = [...fijosDelDia].sort();
  } else {
    candidatos = [];
    let cursor = jornada.desde;
    while (sumarMinutos(cursor, duracionMinutos) <= jornada.hasta) {
      candidatos.push(cursor);
      cursor = sumarMinutos(cursor, 30);
    }
  }

  return candidatos.filter((inicio) => {
    if (esHoy && inicio <= ahora) return false; // ya pasó
    const finSlot = sumarMinutos(inicio, duracionMinutos);
    const seSuperpone = ocupados.some((t) => inicio < t.horaFin && finSlot > t.horaInicio);
    if (seSuperpone) return false;
    const bloqueado = bloqueosDelDia.some((b) => bloqueoCubreFranja(b, inicio, finSlot));
    if (bloqueado) return false;
    return true;
  });
}

// Qué tan "habitual" es un horario para una profesional. El equipo (Yosy y las profesionales)
// puede cargar a mano un turno a CUALQUIER hora y con cualquier profesional — ej. una clienta que
// llega sobre la hora o fuera de horario —; las clientas, en cambio, solo ven en la web los bloques
// fijos de cada una (calcularHorariosDisponibles). Esto solo sirve para avisarle al equipo cuándo
// un turno cae fuera de lo habitual; nunca bloquea nada.
//  - 'habitual':          es uno de los horarios que ven las clientas.
//  - 'dentro_de_jornada': trabaja ese día y a esa hora, pero no es uno de los bloques de la web.
//  - 'fuera_de_jornada':  trabaja ese día pero a esa hora no.
//  - 'dia_libre':         no trabaja ese día.
export type EncajeHorario = 'habitual' | 'dentro_de_jornada' | 'fuera_de_jornada' | 'dia_libre';

const NOMBRE_DIA: Record<(typeof DIAS_SEMANA)[number], string> = {
  domingo: 'domingos',
  lunes: 'lunes',
  martes: 'martes',
  miercoles: 'miércoles',
  jueves: 'jueves',
  viernes: 'viernes',
  sabado: 'sábados',
};

export function encajeEnHorario(
  profesional: Pick<Profesional, 'horarioDisponible' | 'horariosFijos'>,
  fecha: string,
  horaInicio: string
): { tipo: EncajeHorario; dia: string; desde?: string; hasta?: string; bloques?: string[] } {
  const diaSemana = DIAS_SEMANA[new Date(`${fecha}T12:00:00`).getDay()];
  const dia = NOMBRE_DIA[diaSemana];
  const jornada = profesional.horarioDisponible[diaSemana];
  if (!jornada) return { tipo: 'dia_libre', dia };

  const base = { dia, desde: jornada.desde, hasta: jornada.hasta };
  if (horaInicio < jornada.desde || horaInicio >= jornada.hasta) return { tipo: 'fuera_de_jornada', ...base };

  const fijos = profesional.horariosFijos?.[diaSemana];
  if (fijos && fijos.length > 0) {
    return fijos.includes(horaInicio)
      ? { tipo: 'habitual', ...base, bloques: [...fijos].sort() }
      : { tipo: 'dentro_de_jornada', ...base, bloques: [...fijos].sort() };
  }
  // Sin horarios fijos ese día, la web ofrece una grilla cada 30 min dentro de la jornada.
  return horaInicio.endsWith(':00') || horaInicio.endsWith(':30')
    ? { tipo: 'habitual', ...base }
    : { tipo: 'dentro_de_jornada', ...base };
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
  | { tipo: 'ocupado'; turno: Turno }
  | { tipo: 'bloqueado'; bloqueo: BloqueoHorario };

// Para cada franja del día, dice si la profesional no trabaja ese horario,
// si está libre, si tiene un turno tomado ahí, o si Yosy/ella misma
// bloqueó ese horario a mano — la base de la grilla visual.
export function estadoDeFranja(
  profesional: Profesional,
  fecha: string,
  horaFranja: string,
  turnosExistentes: Turno[],
  bloqueos: BloqueoHorario[] = []
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
  if (turno) return { tipo: 'ocupado', turno };

  const horaFinFranja = sumarMinutos(horaFranja, 30);
  const bloqueo = bloqueos.find(
    (b) => b.profesionalId === profesional.id && b.fecha === fecha && bloqueoCubreFranja(b, horaFranja, horaFinFranja)
  );
  if (bloqueo) return { tipo: 'bloqueado', bloqueo };

  return { tipo: 'libre' };
}
