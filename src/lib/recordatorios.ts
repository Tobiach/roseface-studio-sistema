// src/lib/recordatorios.ts
//
// Qué recordatorios corresponden a cada turno (15/10/2026, pedido de Yosy) y
// si la seña de un turno está pagada o pendiente.
//
// Los turnos con la seña ya cobrada (los que entran por el sitio, o los
// manuales a los que Yosy les registró la seña) solo necesitan recordatorio de
// turno (48h / 24h antes; el de 4h se sacó el 16/10/2026). En cambio, un turno manual / de clienta
// recurrente con la seña pendiente recibe 72h antes el pedido de seña, 48h
// antes el recordatorio ("si todavía no abonaste") y 24h antes la
// confirmación de la cita.
import type { PlantillaRecordatorio, RecordatorioConfig, Turno } from '../types';
import { formatDateReadable } from './formatters';
import { mensajeRecordatorio } from './whatsapp';

export interface VentanaRecordatorio {
  value: PlantillaRecordatorio;
  label: string;
  horas: number;
}

const VENTANAS_TURNO_PAGO: VentanaRecordatorio[] = [
  { value: '48h', label: '48 horas antes', horas: 48 },
  { value: '24h', label: '24 horas antes', horas: 24 },
];

const VENTANAS_SENA_PENDIENTE: VentanaRecordatorio[] = [
  { value: '72h', label: '72 horas antes · pedir seña', horas: 72 },
  { value: '48h', label: '48 horas antes · seña (si no abonó)', horas: 48 },
  { value: '24h', label: '24 horas antes · confirmar cita', horas: 24 },
];

type CampoSena = Pick<Turno, 'origenReserva' | 'estado' | 'aprobadoPorProfesional'>;

export type EstadoSena = 'pagada' | 'pendiente' | 'no_aplica';

// ¿Ya está paga la seña de este turno?
// - Web: 'reservado' = todavía esperando el pago; cualquier estado posterior
//   (seña confirmada, recordatorio enviado) viene de un pago ya verificado.
// - Manual: el sistema no ve plata, así que la seña está pagada solo si Yosy
//   (o la profesional) la registró — `aprobadoPorProfesional` — o si el turno
//   ya viene como 'sena_confirmada' (ej. los importados de la agenda real).
// - Cancelado / completado: la pregunta ya no aplica.
export function estadoSena(t: CampoSena): EstadoSena {
  if (t.estado === 'cancelado' || t.estado === 'completado') return 'no_aplica';
  if (t.estado === 'sena_confirmada') return 'pagada';
  if (t.origenReserva === 'manual') return t.aprobadoPorProfesional ? 'pagada' : 'pendiente';
  return t.estado === 'reservado' ? 'pendiente' : 'pagada';
}

export const esTurnoConSenaPendiente = (t: CampoSena): boolean =>
  t.origenReserva === 'manual' && estadoSena(t) === 'pendiente';

export const ventanasDelTurno = (t: CampoSena): VentanaRecordatorio[] =>
  esTurnoConSenaPendiente(t) ? VENTANAS_SENA_PENDIENTE : VENTANAS_TURNO_PAGO;

export interface EstadoRecordatorios {
  horasFaltan: number;
  // La ventana más urgente que ya entró en tiempo y todavía no se mandó.
  pendiente: VentanaRecordatorio | null;
  // Si no hay ninguna lista para mandar: la próxima que se va a habilitar.
  proxima: { ventana: VentanaRecordatorio; enHoras: number } | null;
}

// null si el turno ya no necesita recordatorios (pasó, o está cancelado/completado).
export function estadoRecordatorios(
  t: Turno,
  configs: RecordatorioConfig[],
  ahoraMs: number = Date.now()
): EstadoRecordatorios | null {
  if (t.estado === 'cancelado' || t.estado === 'completado') return null;
  const horasFaltan = (new Date(`${t.fecha}T${t.horaInicio}:00`).getTime() - ahoraMs) / 3_600_000;
  if (horasFaltan <= 0) return null;

  const sinMandar = ventanasDelTurno(t).filter(
    (v) => !configs.find((c) => c.turnoId === t.id && c.plantilla === v.value)?.activado
  );
  const vencidas = sinMandar.filter((v) => horasFaltan <= v.horas);
  const futuras = sinMandar.filter((v) => horasFaltan > v.horas);

  return {
    horasFaltan,
    pendiente: vencidas.length ? vencidas.reduce((a, b) => (a.horas <= b.horas ? a : b)) : null,
    proxima: futuras.length
      ? (() => {
          const ventana = futuras.reduce((a, b) => (a.horas >= b.horas ? a : b));
          return { ventana, enHoras: horasFaltan - ventana.horas };
        })()
      : null,
  };
}

// Texto de WhatsApp de un recordatorio puntual (el mismo en la Agenda y en
// Clientas Recurrentes).
export function mensajeParaTurno(
  t: Turno,
  plantilla: PlantillaRecordatorio,
  nombreClienta: string,
  servicio: string
): string {
  return mensajeRecordatorio(plantilla, {
    nombreClienta,
    servicio,
    fecha: formatDateReadable(t.fecha),
    hora: t.horaInicio,
    senaPendiente: esTurnoConSenaPendiente(t),
    montoSena: t.montoSena,
  });
}
