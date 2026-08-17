// scripts/seed-turnos-demo.ts
//
// Genera una agenda realista (turnos) para que el panel de Yosy no se vea
// vacío en la demo: 2 semanas hacia atrás (completados/cancelados), la
// semana actual y unos días de la próxima (reservados/confirmados).
// Respeta el horario real de cada profesional (no inventa turnos en días
// que no trabaja) y no pisa horarios entre sí.
//
// Correr una sola vez (o cuando se quiera refrescar la demo):
//   npx tsx scripts/seed-turnos-demo.ts
//
// Necesita VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { mockServicios } from '../src/data/mockServicios';
import { mockClientas } from '../src/data/mockClientas';
import { sumarMinutos, DIAS_SEMANA } from '../src/lib/disponibilidad';
import type { DisponibilidadSemanal, EstadoTurno } from '../src/types';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

// Espejo de los horarios reales de src/data/mockProfesionales.ts
const PROFESIONALES: { id: string; horarioDisponible: DisponibilidadSemanal }[] = [
  {
    id: 'prof-yosy',
    horarioDisponible: {
      lunes: { desde: '09:00', hasta: '19:00' },
      martes: { desde: '09:00', hasta: '19:00' },
      miercoles: { desde: '09:00', hasta: '19:00' },
      jueves: { desde: '09:00', hasta: '19:00' },
      viernes: { desde: '09:00', hasta: '19:00' },
      sabado: { desde: '09:00', hasta: '15:00' },
      domingo: null,
    },
  },
  {
    id: 'prof-mili',
    horarioDisponible: {
      lunes: { desde: '09:00', hasta: '18:00' },
      martes: { desde: '09:00', hasta: '18:00' },
      miercoles: { desde: '09:00', hasta: '18:00' },
      jueves: { desde: '09:00', hasta: '18:00' },
      viernes: { desde: '09:00', hasta: '19:00' },
      sabado: { desde: '09:00', hasta: '15:00' },
      domingo: null,
    },
  },
  {
    id: 'prof-sharon',
    horarioDisponible: {
      lunes: null,
      martes: { desde: '10:00', hasta: '19:00' },
      miercoles: { desde: '10:00', hasta: '19:00' },
      jueves: { desde: '10:00', hasta: '19:00' },
      viernes: { desde: '10:00', hasta: '19:00' },
      sabado: { desde: '09:00', hasta: '17:00' },
      domingo: null,
    },
  },
  {
    id: 'prof-martina',
    horarioDisponible: {
      lunes: { desde: '09:00', hasta: '18:00' },
      martes: { desde: '09:00', hasta: '18:00' },
      miercoles: { desde: '09:00', hasta: '18:00' },
      jueves: { desde: '09:00', hasta: '18:00' },
      viernes: { desde: '09:00', hasta: '18:00' },
      sabado: { desde: '09:00', hasta: '14:00' },
      domingo: null,
    },
  },
  {
    id: 'prof-sofia',
    horarioDisponible: {
      lunes: { desde: '10:00', hasta: '18:00' },
      martes: { desde: '10:00', hasta: '18:00' },
      miercoles: { desde: '10:00', hasta: '18:00' },
      jueves: { desde: '10:00', hasta: '18:00' },
      viernes: { desde: '10:00', hasta: '18:00' },
      sabado: null,
      domingo: null,
    },
  },
  {
    id: 'prof-alexandra',
    horarioDisponible: {
      lunes: { desde: '09:00', hasta: '19:00' },
      martes: { desde: '09:00', hasta: '19:00' },
      miercoles: { desde: '09:00', hasta: '19:00' },
      jueves: { desde: '09:00', hasta: '19:00' },
      viernes: { desde: '09:00', hasta: '19:00' },
      sabado: { desde: '09:00', hasta: '16:00' },
      domingo: null,
    },
  },
  {
    id: 'prof-camila',
    horarioDisponible: {
      lunes: { desde: '10:00', hasta: '18:00' },
      martes: null,
      miercoles: { desde: '10:00', hasta: '18:00' },
      jueves: null,
      viernes: { desde: '10:00', hasta: '19:00' },
      sabado: { desde: '09:00', hasta: '15:00' },
      domingo: null,
    },
  },
  {
    id: 'prof-valentina',
    horarioDisponible: {
      lunes: { desde: '11:00', hasta: '19:00' },
      martes: { desde: '11:00', hasta: '19:00' },
      miercoles: { desde: '11:00', hasta: '19:00' },
      jueves: { desde: '11:00', hasta: '19:00' },
      viernes: { desde: '11:00', hasta: '19:00' },
      sabado: { desde: '10:00', hasta: '14:00' },
      domingo: null,
    },
  },
];

const HOY = '2026-08-17'; // lunes — mismo "hoy" que usa la app
const DESDE = '2026-08-03'; // 2 semanas atrás
const HASTA = '2026-08-21'; // hasta el viernes de la próxima semana

function rango(desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  let cursor = new Date(`${desde}T12:00:00`);
  const fin = new Date(`${hasta}T12:00:00`);
  while (cursor <= fin) {
    fechas.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return fechas;
}

function elegir<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function azar(prob: number): boolean {
  return Math.random() < prob;
}

function turnosParaElDia(diaSemana: string): number {
  if (diaSemana === 'viernes' || diaSemana === 'sabado') return 2 + Math.floor(Math.random() * 3); // 2-4
  if (diaSemana === 'lunes') return 1 + Math.floor(Math.random() * 2); // 1-2
  return 1 + Math.floor(Math.random() * 3); // 1-3
}

function seSuperpone(ocupados: { inicio: string; fin: string }[], inicio: string, fin: string): boolean {
  return ocupados.some((o) => inicio < o.fin && fin > o.inicio);
}

function fechaConHora(fechaISO: string, hora: string): string {
  return `${fechaISO}T${hora}:00Z`;
}

const NOTAS_POSIBLES = [
  'Cliente puntual.',
  'Primera vez en el estudio.',
  'Pidió recomendación de horario para la próxima.',
  'Cliente frecuente.',
  'Vino por recomendación de otra clienta.',
];

async function main() {
  const clientasIds = mockClientas.map((c) => c.id);
  const filas: Record<string, unknown>[] = [];

  for (const fecha of rango(DESDE, HASTA)) {
    const diaSemana = DIAS_SEMANA[new Date(`${fecha}T12:00:00`).getDay()];
    const esPasado = fecha < HOY;
    const esHoy = fecha === HOY;

    for (const prof of PROFESIONALES) {
      const jornada = prof.horarioDisponible[diaSemana];
      if (!jornada) continue; // no trabaja ese día

      const serviciosDeLaProf = mockServicios.filter((s) => s.profesionalesQueLoRealizan.includes(prof.id));
      if (serviciosDeLaProf.length === 0) continue;

      const cantidad = turnosParaElDia(diaSemana);
      const ocupados: { inicio: string; fin: string }[] = [];

      for (let i = 0; i < cantidad; i++) {
        const servicio = elegir(serviciosDeLaProf);
        let horaInicio: string | null = null;
        let horaFin = '';

        // hasta 8 intentos de encontrar un hueco libre ese día
        for (let intento = 0; intento < 8; intento++) {
          const rangoMinutos =
            (parseInt(jornada.hasta.slice(0, 2)) * 60 + parseInt(jornada.hasta.slice(3, 5))) -
            (parseInt(jornada.desde.slice(0, 2)) * 60 + parseInt(jornada.desde.slice(3, 5))) -
            servicio.duracionMinutos;
          if (rangoMinutos <= 0) break;
          const offsetMedias = Math.floor((Math.random() * rangoMinutos) / 30) * 30;
          const candidatoInicio = sumarMinutos(jornada.desde, offsetMedias);
          const candidatoFin = sumarMinutos(candidatoInicio, servicio.duracionMinutos);
          if (!seSuperpone(ocupados, candidatoInicio, candidatoFin)) {
            horaInicio = candidatoInicio;
            horaFin = candidatoFin;
            break;
          }
        }
        if (!horaInicio) continue;

        ocupados.push({ inicio: horaInicio, fin: horaFin });

        let estado: EstadoTurno;
        if (esPasado) {
          estado = azar(0.9) ? 'completado' : 'cancelado';
        } else if (esHoy) {
          estado = azar(0.05) ? 'cancelado' : azar(0.6) ? 'sena_confirmada' : 'recordatorio_enviado';
        } else {
          estado = azar(0.05) ? 'cancelado' : azar(0.45) ? 'reservado' : 'sena_confirmada';
        }

        const montoTotal = servicio.precio;
        const montoSena = Math.round(montoTotal * (servicio.porcentajeSena / 100));
        const clientaId = elegir(clientasIds);

        // fecha de creación de la reserva: antes del turno, más lejos si ya pasó
        // (todo en UTC para no mezclar con la zona horaria local del script)
        const diasAntes = esPasado ? 2 + Math.floor(Math.random() * 10) : Math.floor(Math.random() * 5);
        const fechaCreacionDate = new Date(`${fecha}T12:00:00Z`);
        fechaCreacionDate.setUTCDate(fechaCreacionDate.getUTCDate() - diasAntes);
        fechaCreacionDate.setUTCHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

        filas.push({
          clienta_id: clientaId,
          profesional_id: prof.id,
          servicio_id: servicio.id,
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          estado,
          monto_total: montoTotal,
          monto_sena: montoSena,
          sena_verificada_automaticamente: estado !== 'reservado',
          fecha_creacion: fechaCreacionDate.toISOString(),
          origen_reserva: azar(0.85) ? 'web' : 'manual',
          id_transaccion_mp: null,
          notas_internas: azar(0.15) ? elegir(NOTAS_POSIBLES) : null,
        });
      }
    }
  }

  console.log(`Insertando ${filas.length} turnos demo (${DESDE} a ${HASTA})...`);

  // Insertar en tandas para no pegarle un payload gigante a Supabase de una
  const TAMANO_TANDA = 50;
  for (let i = 0; i < filas.length; i += TAMANO_TANDA) {
    const tanda = filas.slice(i, i + TAMANO_TANDA);
    const { error } = await supabase.from('turnos').insert(tanda);
    if (error) {
      console.error(`Error insertando tanda ${i / TAMANO_TANDA + 1}:`, error);
      process.exit(1);
    }
    console.log(`Tanda ${i / TAMANO_TANDA + 1} ok (${tanda.length} turnos)`);
  }

  console.log('Listo.');
}

main().catch((err) => {
  console.error('Error generando datos demo:', err);
  process.exit(1);
});
