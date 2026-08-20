// src/lib/supabaseMappers.ts
// Conversión entre las filas de Supabase (snake_case) y los tipos de la app
// (camelCase, definidos en src/types/index.ts) — para no tener que tocar el
// resto de la app cuando cambia el origen de los datos.
import { Turno, Clienta, Servicio, ModeloComision, DisponibilidadSemanal } from '../types';

export function turnoFromRow(row: any): Turno {
  return {
    id: String(row.id),
    clientaId: row.clienta_id,
    profesionalId: row.profesional_id,
    servicioId: row.servicio_id,
    fecha: row.fecha,
    horaInicio: (row.hora_inicio as string).slice(0, 5),
    horaFin: (row.hora_fin as string).slice(0, 5),
    estado: row.estado,
    montoTotal: Number(row.monto_total),
    montoSena: Number(row.monto_sena),
    senaVerificadaAutomaticamente: row.sena_verificada_automaticamente,
    fechaCreacion: row.fecha_creacion,
    origenReserva: row.origen_reserva,
    idTransaccionMP: row.id_transaccion_mp,
    notasInternas: row.notas_internas ?? undefined,
  };
}

export function turnoToInsertRow(data: Omit<Turno, 'id' | 'fechaCreacion'>) {
  return {
    clienta_id: data.clientaId,
    profesional_id: data.profesionalId,
    servicio_id: data.servicioId,
    fecha: data.fecha,
    hora_inicio: data.horaInicio,
    hora_fin: data.horaFin,
    estado: data.estado,
    monto_total: data.montoTotal,
    monto_sena: data.montoSena,
    sena_verificada_automaticamente: data.senaVerificadaAutomaticamente,
    origen_reserva: data.origenReserva,
    id_transaccion_mp: data.idTransaccionMP,
    notas_internas: data.notasInternas ?? null,
  };
}

export function clientaFromRow(row: any): Clienta {
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono,
    email: row.email ?? undefined,
    fechaNacimiento: row.fecha_nacimiento ?? undefined,
    fechaRegistro: row.fecha_registro,
    esVIP: row.es_vip,
    nivelVIP: row.nivel_vip ?? undefined,
    puntosAcumulados: row.puntos_acumulados,
    // No se guarda como columna — se consulta turnos por clienta_id cuando hace falta.
    historialTurnos: [],
    profesionalHabitual: row.profesional_habitual ?? undefined,
    ultimaVisita: row.ultima_visita ?? undefined,
    referidoPor: row.referido_por ?? undefined,
    notas: row.notas ?? undefined,
  };
}

export function clientaToInsertRow(data: Omit<Clienta, 'historialTurnos'>) {
  return {
    id: data.id,
    nombre: data.nombre,
    telefono: data.telefono,
    email: data.email ?? null,
    fecha_nacimiento: data.fechaNacimiento ?? null,
    fecha_registro: data.fechaRegistro,
    es_vip: data.esVIP,
    nivel_vip: data.nivelVIP ?? null,
    puntos_acumulados: data.puntosAcumulados,
    profesional_habitual: data.profesionalHabitual ?? null,
    ultima_visita: data.ultimaVisita ?? null,
    referido_por: data.referidoPor ?? null,
    notas: data.notas ?? null,
  };
}

export interface ProfesionalOperativo {
  id: string;
  modeloComision: ModeloComision;
  horarioDisponible: DisponibilidadSemanal;
}

export function profesionalOperativoFromRow(row: any): ProfesionalOperativo {
  return {
    id: row.id,
    modeloComision: row.modelo_comision,
    horarioDisponible: row.horario_disponible,
  };
}

export function servicioFromRow(row: any): Servicio {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    descripcion: row.descripcion,
    duracionMinutos: row.duracion_minutos,
    precio: Number(row.precio),
    requiereSena: true,
    puntosVIP: row.puntos_vip,
    profesionalesQueLoRealizan: row.profesionales_que_lo_realizan,
  };
}
