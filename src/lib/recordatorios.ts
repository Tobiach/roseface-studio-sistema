// src/lib/recordatorios.ts
//
// Qué recordatorios corresponden a cada turno (15/10/2026, pedido de Yosy).
//
// Los turnos que entran por el sitio ya pagaron la seña en el checkout, así
// que solo necesitan recordatorio de turno (48h / 24h / 4h antes). En cambio,
// una clienta recurrente / turno manual queda 'reservado' sin seña cobrada:
// a ella se le pide la seña por el mismo hilo de WhatsApp (72h y 48h antes,
// el de 48h aclara "si todavía no abonaste") y 24h antes se confirma la cita.
import type { PlantillaRecordatorio, Turno } from '../types';

export interface VentanaRecordatorio {
  value: PlantillaRecordatorio;
  label: string;
  horas: number;
}

const VENTANAS_TURNO_WEB: VentanaRecordatorio[] = [
  { value: '48h', label: '48 horas antes', horas: 48 },
  { value: '24h', label: '24 horas antes', horas: 24 },
  { value: '4h', label: '4 horas antes', horas: 4 },
];

const VENTANAS_SENA_PENDIENTE: VentanaRecordatorio[] = [
  { value: '72h', label: '72 horas antes · pedir seña', horas: 72 },
  { value: '48h', label: '48 horas antes · seña (si no abonó)', horas: 48 },
  { value: '24h', label: '24 horas antes · confirmar cita', horas: 24 },
];

// Turno cargado a mano (o de clienta recurrente) cuya seña todavía no está
// registrada. La base no deja pasarlo a "seña confirmada" desde el panel (solo
// el webhook de Mercado Pago o la aprobación de comprobante pueden), así que
// el sistema no sabe si ya pagó: por eso el mensaje de 48h es condicional.
export const esTurnoConSenaPendiente = (t: Pick<Turno, 'origenReserva' | 'estado'>): boolean =>
  t.origenReserva === 'manual' && t.estado === 'reservado';

export const ventanasDelTurno = (t: Pick<Turno, 'origenReserva' | 'estado'>): VentanaRecordatorio[] =>
  esTurnoConSenaPendiente(t) ? VENTANAS_SENA_PENDIENTE : VENTANAS_TURNO_WEB;
