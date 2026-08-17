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
  porcentajeSena: number;          // ej 30 = 30%
  puntosVIP: number;               // Puntos VIP otorgados
  profesionalesQueLoRealizan: string[];  // ids de Profesional
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
