// src/types/index.ts

export type RolUsuario = 'clienta' | 'profesional' | 'admin';

export interface Profesional {
  id: string;
  nombre: string;
  apodo?: string;
  fotoUrl: string;
  especialidades: string[];        // ej: ['Pestañas', 'Lifting']
  bio: string;
  aniosExperiencia: number;
  galeria: string[];               // urls de trabajos realizados
  calificacionPromedio: number;    // 1-5
  cantidadResenas: number;
  modeloComision: ModeloComision;
  horarioDisponible: DisponibilidadSemanal;
  // Horarios de inicio FIJOS por día (ej. Mili: 09:00/11:00/14:00/16:00).
  // Si un día tiene lista acá, la disponibilidad de ese día son exactamente
  // esas horas (no la grilla cada 30 min). Si es null/ausente para un día,
  // se usa la grilla dentro de horarioDisponible. Es como trabaja Rose Face.
  horariosFijos?: { [dia: string]: string[] | null };
  // Solo se usa para el modelo alquiler_fijo (circuito de pago por
  // transferencia) — dónde le transfiere la clienta.
  aliasCbu?: string | null;
  videoUrl?: string | null;
  // Link de auto-agendado propio, para el aviso de recurrencia (Fase 8).
  linkAutoagenda?: string | null;
}

export type ModeloComision =
  | { tipo: 'porcentaje'; porcentajeProfesional: number }  // ej Mili: 55, Sharon: 45
  | { tipo: 'alquiler_fijo'; montoSemanal: number };

export interface DisponibilidadSemanal {
  [dia: string]: { desde: string; hasta: string } | null;  // null = no trabaja ese día
}

export interface Servicio {
  id: string;
  nombre: string;
  categoria: 'Pestañas' | 'Cejas' | 'Uñas' | 'Alisados' | 'Depilación Láser' | 'Masajes y Faciales';
  descripcion: string;
  duracionMinutos: number;
  precio: number;                  // ARS
  requiereSena: boolean;
  puntosVIP: number;               // Puntos VIP otorgados
  profesionalesQueLoRealizan: string[];  // ids de Profesional
  // Cada cuántos días vuelve una clienta típica para este servicio (ej.
  // retoque de pestañas ~21 días). null = no aplica.
  cicloRecurrenciaDias?: number | null;
}

export interface Clienta {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  fechaNacimiento?: string;        // YYYY-MM-DD para el bono de cumpleaños
  fechaRegistro: string;
  esVIP: boolean;
  nivelVIP?: 'Clienta' | 'VIP' | 'VIP+';
  puntosAcumulados: number;
  historialTurnos: string[];       // ids de Turno
  profesionalHabitual?: string;    // id de Profesional
  ultimaVisita?: string;
  referidoPor?: string;            // id de Clienta
  notas?: string;                  // preferencias, alergias, etc
}

export type EstadoTurno =
  | 'reservado'           // reservado pero seña pendiente
  | 'sena_confirmada'     // pagó la seña
  | 'recordatorio_enviado'
  | 'completado'
  | 'cancelado';          // la seña no se devuelve, sin importar cuándo cancele

export interface Turno {
  id: string;
  clientaId: string;
  profesionalId: string;
  servicioId: string;
  fecha: string;                   // YYYY-MM-DD
  horaInicio: string;              // HH:mm
  horaFin: string;                 // HH:mm
  estado: EstadoTurno;
  montoTotal: number;
  montoSena: number;
  senaVerificadaAutomaticamente: boolean;
  fechaCreacion: string;
  origenReserva: 'web' | 'asistente' | 'manual';
  idTransaccionMP: string | null;
  notasInternas?: string;
  // Hold de 15 min mientras la clienta está en el checkout de MP: pasado
  // este horario, un turno 'reservado' deja de contar como ocupado y el
  // horario se libera. Solo lo setea crear-preferencia.ts; null/undefined
  // en cualquier otro turno (seed, simulado, ya confirmado).
  expiraEn?: string | null;
  // Doble circuito de pago (Fase 5): 'mercado_pago' para modelo porcentaje
  // (Mili/Sharon), 'transferencia' para alquiler_fijo (Martina, Sofía,
  // Alexandra, Camila, Valentina) — 1:1 con el modeloComision de la
  // profesional al momento de reservar.
  circuitoPago?: 'mercado_pago' | 'transferencia';
  comprobanteTransferenciaUrl?: string | null;
  aprobadoPorProfesional?: boolean;
}

export interface CierreComisionSemanal {
  id: string;
  profesionalId: string;
  semanaInicio: string;
  semanaFin: string;
  turnosRealizados: number;
  facturacionTotal: number;
  montoComisionProfesional: number;
  montoParaEstudio: number;
  modeloAplicado: ModeloComision;
  estadoPago: 'pendiente' | 'pagado';
}

export interface KPIsDashboard {
  facturacionHoy: number;
  facturacionSemana: number;
  facturacionMes: number;
  turnosHoy: number;
  turnosSemana: number;
  tasaCancelacion: number;         // %
  clientasNuevasMes: number;
  clientasRecurrentesMes: number;
  profesionalTopFacturacion: { profesionalId: string; monto: number };
}

export interface BeneficioVIP {
  id: string;
  nombre: string;
  descripcion: string;
  puntosNecesarios: number;
  tipo: 'descuento' | 'servicio_gratis' | 'producto';
}

export interface ReferidoRegistro {
  id: string;
  clientaReferenteId: string;
  clientaReferidaId: string;
  fecha: string;
  recompensaOtorgada: boolean;
}

export interface ClientaEnRiesgo {
  clientaId: string;
  diasSinVisitar: number;
  ultimoServicio: string;
  flujoRecuperacionActivado: boolean;
}

// Recordatorio por turno (Fase 7): Yosy activa cada plantilla
// individualmente por turno, no hay un selector global. Sigue sin mandar
// WhatsApp real — solo queda registrado como activado.
export interface RecordatorioConfig {
  turnoId: string;
  plantilla: '48h' | '24h' | '4h';
  activado: boolean;
  activadoEn?: string | null;
}

// Bloqueo manual de horario (Fase 6): Yosy bloquea para cualquier
// profesional, cada profesional solo puede bloquear la suya.
export interface BloqueoHorario {
  id: string;
  profesionalId: string;
  fecha: string;                   // YYYY-MM-DD
  diaCompleto: boolean;
  horaInicio?: string | null;      // solo si diaCompleto = false
  horaFin?: string | null;
  motivo?: string | null;
  creadoPor?: string | null;
}
