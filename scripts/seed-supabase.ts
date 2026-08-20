// scripts/seed-supabase.ts
//
// Carga a Supabase los datos reales de clientas, profesionales y servicios
// que hoy viven en src/data/mock*.ts. Correr una sola vez, después de crear
// las tablas (ver plan de Grupo 1):
//
//   npx tsx scripts/seed-supabase.ts
//
// Necesita VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
// (no se commitea — ver .gitignore).
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { mockClientas } from '../src/data/mockClientas';
import { mockServicios } from '../src/data/mockServicios';
import type { ModeloComision, DisponibilidadSemanal } from '../src/types';

// Campos operativos de profesionales, a mano acá (no se importa
// mockProfesionales.ts porque trae imágenes vía import de Vite que Node no
// puede resolver corriendo este script suelto con tsx). Espejo exacto de
// src/data/mockProfesionales.ts — si cambia el horario/comisión ahí, actualizar acá.
const profesionalesOperativos: {
  id: string;
  nombre: string;
  modeloComision: ModeloComision;
  horarioDisponible: DisponibilidadSemanal;
}[] = [
  {
    id: 'prof-mili',
    nombre: 'Mili',
    modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 55 },
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
    nombre: 'Sharon',
    modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 45 },
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
    nombre: 'Martina',
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 50000 },
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
    nombre: 'Sofía',
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 45000 },
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
    nombre: 'Alexandra',
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 48000 },
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
    nombre: 'Camila',
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 52000 },
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
    nombre: 'Valentina',
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 45000 },
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

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function seed() {
  console.log('Cargando profesionales (campos operativos)...');
  const profesionalesRows = profesionalesOperativos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    modelo_comision: p.modeloComision,
    horario_disponible: p.horarioDisponible,
  }));
  const { error: errorProf } = await supabase.from('profesionales').upsert(profesionalesRows);
  if (errorProf) throw errorProf;

  console.log('Cargando servicios...');
  const serviciosRows = mockServicios.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    categoria: s.categoria,
    descripcion: s.descripcion,
    duracion_minutos: s.duracionMinutos,
    precio: s.precio,
    puntos_vip: s.puntosVIP,
    profesionales_que_lo_realizan: s.profesionalesQueLoRealizan,
  }));
  const { error: errorServ } = await supabase.from('servicios').upsert(serviciosRows);
  if (errorServ) throw errorServ;

  console.log('Cargando clientas...');
  const clientasRows = mockClientas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    email: c.email ?? null,
    fecha_nacimiento: c.fechaNacimiento ?? null,
    fecha_registro: c.fechaRegistro,
    es_vip: c.esVIP,
    nivel_vip: c.nivelVIP ?? null,
    puntos_acumulados: c.puntosAcumulados,
    profesional_habitual: c.profesionalHabitual ?? null,
    ultima_visita: c.ultimaVisita ?? null,
    referido_por: (c.referidoPor ?? null) as string | null,
    notas: c.notas ?? null,
  }));

  // Primero sin referido_por (evita depender del orden de inserción para la FK circular)
  const clientasSinReferido = clientasRows.map(({ referido_por, ...resto }) => resto);
  const { error: errorCli } = await supabase.from('clientas').upsert(clientasSinReferido);
  if (errorCli) throw errorCli;

  const conReferido = clientasRows.filter((c) => c.referido_por);
  for (const c of conReferido) {
    const { error } = await supabase.from('clientas').update({ referido_por: c.referido_por }).eq('id', c.id);
    if (error) throw error;
  }

  console.log(
    `Listo. Profesionales: ${profesionalesRows.length} | Servicios: ${serviciosRows.length} | Clientas: ${clientasRows.length}`
  );
}

seed().catch((err) => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
