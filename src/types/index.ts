// src/types/index.ts

export type RolUsuario = 'clienta' | 'profesional' | 'admin';

export interface Profesional {
  id: string;
  nombre: string;
  apodo?: string;
  fotoUrl: string;
  especialidades: string[];        // ej: ['Pestañas', 'Lifting']
  bio: string;  galeria: string[];               // urls de trabajos realizados
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
  // Extras que se suman a un servicio ya reservado (no se agendan solos,
  // por eso no son un Servicio más) — hoy solo Ari (uñas).
  adicionales?: { nombre: string; precio: number }[];
  // false = ya no trabaja en el estudio (13/10/2026, primer caso: Anye).
  // El id NUNCA se borra (quedan turnos históricos con esa FK) — esto solo
  // la saca de toda la app (AppContext no la carga en el estado). Por defecto true;
  // ausente en el resto del plantel a propósito (no hace falta tocar a
  // nadie más).
  activa?: boolean;
}

export type ModeloComision =
  | { tipo: 'porcentaje'; porcentajeProfesional: number }  // ej Mili: 55, Roma: 45
  | { tipo: 'alquiler_fijo'; montoSemanal: number };

export interface DisponibilidadSemanal {
  [dia: string]: { desde: string; hasta: string } | null;  // null = no trabaja ese día
}

export interface Servicio {
  id: string;
  nombre: string;
  categoria: 'Pestañas' | 'Cejas' | 'Uñas' | 'Depilación Láser' | 'Faciales' | 'Corporales';
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
  // (Mili/Roma), 'transferencia' para alquiler_fijo (Sofía,
  // Alexandra, Camila, Valentina) — 1:1 con el modeloComision de la
  // profesional al momento de reservar.
  circuitoPago?: 'mercado_pago' | 'transferencia';
  comprobanteTransferenciaUrl?: string | null;
  aprobadoPorProfesional?: boolean;
  // Extras cargados al confirmar que la clienta vino (ver ServicioExtra).
  // montoTotal = precio del servicio reservado + suma de estos extras.
  serviciosExtra?: ServicioExtra[];
  // Hora real en que se confirmó "Vino" por primera vez (25/10/2026). La
  // pone el servidor, nunca se resetea al corregir el servicio dentro de la
  // ventana de edición — mide "hace cuánto se completó", no la última edición.
  completadoEn?: string | null;
}

// Servicio realizado de más en el momento (ej. retiro, deco, un servicio que la
// clienta suma presencial) y que no estaba en la reserva original. Su precio
// ya está sumado dentro de Turno.montoTotal — esto es solo el desglose.
export interface ServicioExtra {
  nombre: string;
  precio: number;                  // ARS, editable al cargarlo (hay ítems 'desde $X')
  servicioId?: string | null;      // si salió del catálogo; null/ausente = cargado a mano
}

export interface CierreComisionSemanal {
  id: string;
  profesionalId: string;
  semanaInicio: string;
  semanaFin: string;
  turnosRealizados: number;
  // Suma de lo que pagaron las clientas por los turnos completados.
  facturacionBruta: number;
  // Reservas de la semana que se pagaron por Mercado Pago y lo que MP descontó por ellas.
  reservasMercadoPago: number;
  descuentoMercadoPago: number;
  // facturacionBruta - descuentoMercadoPago: la base sobre la que se calculan los porcentajes.
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
// El de '4h' se sacó el 16/10/2026 (la tabla en Supabase todavía lo admite por los registros viejos).
export type PlantillaRecordatorio = '72h' | '48h' | '24h';

export interface RecordatorioConfig {
  turnoId: string;
  plantilla: PlantillaRecordatorio;
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
