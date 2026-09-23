// src/data/mockProfesionales.ts
//
// Catálogo visual + operativo de las profesionales. Los campos operativos
// (modeloComision, horarioDisponible, aliasCbu, etc.) se pisan con lo que
// venga de Supabase; el resto (nombre, foto, bio, galería, horariosFijos)
// vive acá. Datos reales de Yosy cargados el 10/9/2026 — ver
// project_roseface_datos_reales_yosy.md para lo que sigue pendiente.
import { Profesional } from '../types';
import fotoYosy from '../assets/images/profesionales/prof-yosy.jpg';
import fotoMili from '../assets/images/profesionales/prof-mili.jpg';
import fotoSharon from '../assets/images/profesionales/prof-sharon.jpg';
import fotoMartina from '../assets/images/profesionales/prof-martina.jpg';
import fotoSofia from '../assets/images/profesionales/prof-sofia.jpg';
import fotoAlexandra from '../assets/images/profesionales/prof-alexandra.jpg';
import fotoCamila from '../assets/images/profesionales/prof-camila.jpg';
import { trabajosPorProfesional } from './trabajosFotos';

// Helpers para armar la semana
const SIN_HORARIO = { lunes: null, martes: null, miercoles: null, jueves: null, viernes: null, sabado: null, domingo: null } as const;
const vent = (desde: string, hasta: string) => ({ desde, hasta });

export const mockProfesionales: Profesional[] = [
  {
    id: 'prof-yosy',
    nombre: 'Yosy',
    fotoUrl: fotoYosy,
    // Sumado 'Pestañas' (22/9/2026): "Sharon y Yosy hacemos todo, eso más
    // incluido volumen ruso" (doc "dia a dia Rose Face") — Yosy también
    // hace pestañas, no solo cejas.
    especialidades: ['Cejas', 'Laminado de Cejas', 'Pestañas'],
    bio: 'Especialista en cejas, laminado y pestañas — diseño de mirada, cejas definidas y con efecto duradero.',
    aniosExperiencia: 8,
    galeria: trabajosPorProfesional['prof-yosy'],
    calificacionPromedio: 5.0,
    cantidadResenas: 120,
    modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 100 }, // es la dueña
    // Confirmado por Yosy (doc "dia a dia Rose Face", 22/9/2026): lunes a
    // viernes excepto miércoles 9-15 (fijos 9/11/13/15); sábado suma un
    // turno más a las 17; domingo es corto, solo 10 y 12.
    horarioDisponible: {
      ...SIN_HORARIO,
      lunes: vent('09:00', '17:00'),
      martes: vent('09:00', '17:00'),
      jueves: vent('09:00', '17:00'),
      viernes: vent('09:00', '17:00'),
      sabado: vent('09:00', '19:00'),
      domingo: vent('10:00', '14:00'),
    },
    horariosFijos: {
      lunes: ['09:00', '11:00', '13:00', '15:00'],
      martes: ['09:00', '11:00', '13:00', '15:00'],
      jueves: ['09:00', '11:00', '13:00', '15:00'],
      viernes: ['09:00', '11:00', '13:00', '15:00'],
      sabado: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      domingo: ['10:00', '12:00'],
    },
  },
  {
    id: 'prof-mili',
    nombre: 'Mili',
    fotoUrl: fotoMili,
    especialidades: ['Pestañas', 'Lifting de Pestañas', 'Cejas'],
    bio: 'Especialista senior en diseño de mirada y lifting de pestañas. Alta precisión y foco en la belleza natural.',
    aniosExperiencia: 5,
    galeria: trabajosPorProfesional['prof-mili'],
    calificacionPromedio: 5.0,
    cantidadResenas: 86,
    // 55% confirmado por Yosy, texto literal (doc "dia a dia Rose Face",
    // 22/9/2026): "Mili: 55% mili, el 45% estudio". Ya no es placeholder.
    modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 55 },
    // Martes a sábado. Turnos fijos 9/11/14/16.
    horarioDisponible: {
      ...SIN_HORARIO,
      martes: vent('09:00', '18:30'),
      miercoles: vent('09:00', '18:30'),
      jueves: vent('09:00', '18:30'),
      viernes: vent('09:00', '18:30'),
      sabado: vent('09:00', '18:30'),
    },
    horariosFijos: {
      martes: ['09:00', '11:00', '14:00', '16:00'],
      miercoles: ['09:00', '11:00', '14:00', '16:00'],
      jueves: ['09:00', '11:00', '14:00', '16:00'],
      viernes: ['09:00', '11:00', '14:00', '16:00'],
      sabado: ['09:00', '11:00', '14:00', '16:00'],
    },
  },
  {
    id: 'prof-sharon',
    nombre: 'Sharon',
    fotoUrl: fotoSharon,
    // Sumado 'Cejas' (22/9/2026), mismo dato que en Yosy: "Sharon y Yosy
    // hacemos todo" — Sharon también hace cejas, no solo pestañas.
    especialidades: ['Pestañas', 'Volumen Ruso', 'Cejas'],
    bio: 'Experta certificada en extensiones pelo a pelo, volumen ruso y cejas. Enfoque hiper-detallista.',
    aniosExperiencia: 3,
    galeria: trabajosPorProfesional['prof-sharon'],
    calificacionPromedio: 5.0,
    cantidadResenas: 142,
    // 45% CONFIRMADO — Yosy lo reconfirmó directo por WhatsApp con Tobias
    // (22/9/2026), después de que la planilla "Agenda Sharon" diera 50%
    // matemático y el doc "dia a dia Rose Face" ya dijera 45% por escrito.
    // Ya no es un dato en duda: la planilla debe tener otro descuento
    // mezclado en el "% Salón" que no es la comisión pura.
    modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 45 },
    // Lunes a sábado. Bloques de 2h: 9/11/14/16/18/20.
    horarioDisponible: {
      ...SIN_HORARIO,
      lunes: vent('09:00', '22:00'),
      martes: vent('09:00', '22:00'),
      miercoles: vent('09:00', '22:00'),
      jueves: vent('09:00', '22:00'),
      viernes: vent('09:00', '22:00'),
      sabado: vent('09:00', '22:00'),
    },
    horariosFijos: {
      lunes: ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'],
      martes: ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'],
      miercoles: ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'],
      jueves: ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'],
      viernes: ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'],
      sabado: ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'],
    },
  },
  {
    id: 'prof-martina',
    nombre: 'Anye',
    fotoUrl: fotoMartina,
    especialidades: ['Alisados', 'Alisado Brasilero'],
    bio: 'Especialista en alisados progresivos libres de formol. Cabellos brillantes, sedosos y saludables.',
    aniosExperiencia: 4,
    galeria: trabajosPorProfesional['prof-martina'] ?? [],
    calificacionPromedio: 5.0,
    cantidadResenas: 52,
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 50000 }, // PLACEHOLDER — alquiler real pendiente
    aliasCbu: 'Anye.studio',
    // Lunes a sábado 9-16 (último turno), tal cual el formulario real de
    // Yosy. Turnos largos (3-4h) → 2 por día, fijos 9/13.
    horarioDisponible: {
      ...SIN_HORARIO,
      lunes: vent('09:00', '16:00'),
      martes: vent('09:00', '16:00'),
      miercoles: vent('09:00', '16:00'),
      jueves: vent('09:00', '16:00'),
      viernes: vent('09:00', '16:00'),
      sabado: vent('09:00', '16:00'),
    },
    horariosFijos: {
      lunes: ['09:00', '13:00'],
      martes: ['09:00', '13:00'],
      miercoles: ['09:00', '13:00'],
      jueves: ['09:00', '13:00'],
      viernes: ['09:00', '13:00'],
      sabado: ['09:00', '13:00'],
    },
  },
  {
    id: 'prof-sofia',
    nombre: 'Cris',
    fotoUrl: fotoSofia,
    especialidades: ['Faciales', 'Corporales'],
    bio: 'Cosmiatra y masoterapeuta. Cuidado integral de la piel, peeling ultrasónico y masajes descontracturantes.',
    aniosExperiencia: 6,
    galeria: trabajosPorProfesional['prof-sofia'] ?? [],
    calificacionPromedio: 5.0,
    cantidadResenas: 86,
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 45000 }, // PLACEHOLDER
    // OJO: el doc "dia a dia Rose Face" escribe el alias como
    // "Crisbel.gonzlz" (sin la "a") en la tabla de CBUs, pero como
    // "Crisbel.gonzalez" en el texto de la pregunta — puede ser un typo de
    // Yosy o de quien tipeó el doc. NO se corrigió a ciegas por ser un
    // alias bancario real; confirmar con Yosy cuál es el correcto antes de
    // usarlo para una transferencia real.
    aliasCbu: 'Crisbel.gonzalez',
    // Confirmado por Yosy (doc "dia a dia Rose Face", 22/9/2026): "desde
    // las 13 hrs de lunes a viernes" y sábado "desde la mañana 9 am hasta
    // 20 hrs". El hasta de lunes a viernes sigue siendo estimado (no dijo
    // hora de cierre) manteniendo "corrido, 2h por turno".
    horarioDisponible: {
      ...SIN_HORARIO,
      lunes: vent('13:00', '19:00'),
      martes: vent('13:00', '19:00'),
      miercoles: vent('13:00', '19:00'),
      jueves: vent('13:00', '19:00'),
      viernes: vent('13:00', '19:00'),
      sabado: vent('09:00', '20:00'),
    },
    horariosFijos: {
      lunes: ['13:00', '15:00', '17:00'],
      martes: ['13:00', '15:00', '17:00'],
      miercoles: ['13:00', '15:00', '17:00'],
      jueves: ['13:00', '15:00', '17:00'],
      viernes: ['13:00', '15:00', '17:00'],
      sabado: ['09:00', '11:00', '13:00', '15:00', '17:00'],
    },
  },
  {
    id: 'prof-alexandra',
    nombre: 'Ari',
    fotoUrl: fotoAlexandra,
    especialidades: ['Uñas', 'Semipermanente', 'Esculpidas'],
    bio: 'Nail artist. Capping en gel, esculpidas en acrílico y esmaltado semipermanente con nail art personalizado.',
    aniosExperiencia: 4,
    galeria: trabajosPorProfesional['prof-alexandra'],
    calificacionPromedio: 5.0,
    cantidadResenas: 142,
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 48000 }, // PLACEHOLDER
    aliasCbu: 'Aribell.st',
    // "De 9 a 19", 2h por turno — tal cual el formulario real de Yosy.
    // Sábado confirmado: "Ari igual si trabaja sábado corrido" (doc "dia a
    // dia Rose Face", 22/9/2026). Ya no es placeholder.
    horarioDisponible: {
      ...SIN_HORARIO,
      lunes: vent('09:00', '19:00'),
      martes: vent('09:00', '19:00'),
      miercoles: vent('09:00', '19:00'),
      jueves: vent('09:00', '19:00'),
      viernes: vent('09:00', '19:00'),
      sabado: vent('09:00', '19:00'),
    },
    horariosFijos: {
      lunes: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      martes: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      miercoles: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      jueves: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      viernes: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      sabado: ['09:00', '11:00', '13:00', '15:00', '17:00'],
    },
    // Extras que se suman a un servicio ya reservado — no van al flujo de
    // Reserva (no son un turno en sí). Verificado 23/9/2026 contra el
    // formulario original de Yosy (no solo el cartel con la fila cortada):
    // "French / baby boomer $3000/$5000" son 2 precios distintos, y
    // "Chrome/ degrade - cat eye $3000" era el ítem que faltaba (la fila
    // cortada en la foto). Ya completo, 7 ítems.
    adicionales: [
      { nombre: 'Retiro común', precio: 3000 },
      { nombre: 'Retiro Semipermanente', precio: 8000 },
      { nombre: 'Reconstrucciones', precio: 4000 },
      { nombre: 'Parches', precio: 3000 },
      { nombre: 'Decos (desde)', precio: 2000 },
      { nombre: 'French (desde)', precio: 3000 },
      { nombre: 'BabyBoomer (desde)', precio: 5000 },
      { nombre: 'Chrome / Degradé / Cat Eye', precio: 3000 },
    ],
  },
  {
    id: 'prof-camila',
    nombre: 'Depilación Láser',
    fotoUrl: fotoCamila,
    especialidades: ['Depilación Láser'],
    bio: 'Sesiones de depilación láser con tecnología Soprano Ice. El día de atención es el 3er viernes de cada mes.',
    aniosExperiencia: 3,
    galeria: trabajosPorProfesional['prof-camila'] ?? [],
    calificacionPromedio: 5.0,
    cantidadResenas: 64,
    modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 0 }, // servicio del estudio, no de una persona
    // Solo viernes (grilla cada 30 min). Los viernes que NO son el 3ro del
    // mes, Yosy los bloquea a mano desde el panel.
    horarioDisponible: {
      ...SIN_HORARIO,
      viernes: vent('08:00', '20:00'),
    },
  },
];
