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
    especialidades: ['Cejas', 'Laminado de Cejas'],
    bio: 'Fundadora de Rose Face Studio. Especialista en cejas y laminado — diseño de mirada, cejas definidas y con efecto duradero.',
    aniosExperiencia: 8,
    galeria: trabajosPorProfesional['prof-yosy'],
    calificacionPromedio: 5.0,
    cantidadResenas: 120,
    modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 100 }, // es la dueña
    // Lunes a domingo EXCEPTO miércoles. Turnos fijos 9/11/13/15.
    horarioDisponible: {
      ...SIN_HORARIO,
      lunes: vent('09:00', '17:00'),
      martes: vent('09:00', '17:00'),
      jueves: vent('09:00', '17:00'),
      viernes: vent('09:00', '17:00'),
      sabado: vent('09:00', '17:00'),
      domingo: vent('09:00', '17:00'),
    },
    horariosFijos: {
      lunes: ['09:00', '11:00', '13:00', '15:00'],
      martes: ['09:00', '11:00', '13:00', '15:00'],
      jueves: ['09:00', '11:00', '13:00', '15:00'],
      viernes: ['09:00', '11:00', '13:00', '15:00'],
      sabado: ['09:00', '11:00', '13:00', '15:00'],
      domingo: ['09:00', '11:00', '13:00', '15:00'],
    },
  },
  {
    id: 'prof-mili',
    nombre: 'Mili',
    apodo: 'Mili',
    fotoUrl: fotoMili,
    especialidades: ['Pestañas', 'Lifting de Pestañas', 'Cejas'],
    bio: 'Especialista senior en diseño de mirada y lifting de pestañas. Alta precisión y foco en la belleza natural.',
    aniosExperiencia: 5,
    galeria: trabajosPorProfesional['prof-mili'],
    calificacionPromedio: 4.9,
    cantidadResenas: 86,
    modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 55 }, // PLACEHOLDER — pendiente % real de Yosy
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
    apodo: 'Sharon',
    fotoUrl: fotoSharon,
    especialidades: ['Pestañas', 'Volumen Ruso'],
    bio: 'Experta certificada en extensiones pelo a pelo y volumen ruso. Enfoque hiper-detallista.',
    aniosExperiencia: 3,
    galeria: trabajosPorProfesional['prof-sharon'],
    calificacionPromedio: 4.9,
    cantidadResenas: 142,
    modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 45 }, // PLACEHOLDER — pendiente % real de Yosy
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
    apodo: 'Anye',
    fotoUrl: fotoMartina,
    especialidades: ['Alisados', 'Alisado Brasilero'],
    bio: 'Especialista en alisados progresivos libres de formol. Cabellos brillantes, sedosos y saludables.',
    aniosExperiencia: 4,
    galeria: trabajosPorProfesional['prof-martina'] ?? [],
    calificacionPromedio: 4.8,
    cantidadResenas: 52,
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 50000 }, // PLACEHOLDER — alquiler real pendiente
    aliasCbu: 'Anye.studio',
    // Lunes a sábado 9-16 (último turno). Turnos largos (3-4h) → 2 por día. PLACEHOLDER.
    horarioDisponible: {
      ...SIN_HORARIO,
      lunes: vent('09:00', '20:00'),
      martes: vent('09:00', '20:00'),
      miercoles: vent('09:00', '20:00'),
      jueves: vent('09:00', '20:00'),
      viernes: vent('09:00', '20:00'),
      sabado: vent('09:00', '20:00'),
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
    apodo: 'Cris',
    fotoUrl: fotoSofia,
    especialidades: ['Masajes y Faciales', 'Limpieza Facial Profunda'],
    bio: 'Cosmiatra y masoterapeuta. Cuidado integral de la piel, peeling ultrasónico y masajes descontracturantes.',
    aniosExperiencia: 6,
    galeria: trabajosPorProfesional['prof-sofia'] ?? [],
    calificacionPromedio: 4.9,
    cantidadResenas: 86,
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 45000 }, // PLACEHOLDER
    aliasCbu: 'Crisbel.gonzalez',
    // "Corrido, 2h por turno". Ventana PLACEHOLDER 9-19.
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
  },
  {
    id: 'prof-alexandra',
    nombre: 'Ariannys',
    fotoUrl: fotoAlexandra,
    especialidades: ['Uñas', 'Semipermanente', 'Esculpidas'],
    bio: 'Nail artist. Capping en gel, esculpidas en acrílico y esmaltado semipermanente con nail art personalizado.',
    aniosExperiencia: 4,
    galeria: trabajosPorProfesional['prof-alexandra'],
    calificacionPromedio: 4.9,
    cantidadResenas: 142,
    modeloComision: { tipo: 'alquiler_fijo', montoSemanal: 48000 }, // PLACEHOLDER
    aliasCbu: 'Aribell.st',
    // "De 9 a 19", 2h por turno. Días PLACEHOLDER (no los dijo) → lun a sáb.
    horarioDisponible: {
      ...SIN_HORARIO,
      lunes: vent('09:00', '21:00'),
      martes: vent('09:00', '21:00'),
      miercoles: vent('09:00', '21:00'),
      jueves: vent('09:00', '21:00'),
      viernes: vent('09:00', '21:00'),
      sabado: vent('09:00', '21:00'),
    },
    horariosFijos: {
      lunes: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      martes: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      miercoles: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      jueves: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      viernes: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      sabado: ['09:00', '11:00', '13:00', '15:00', '17:00'],
    },
  },
  {
    id: 'prof-camila',
    nombre: 'Depilación Láser',
    fotoUrl: fotoCamila,
    especialidades: ['Depilación Láser'],
    bio: 'Sesiones de depilación láser con tecnología Soprano Ice. El día de atención es el 3er viernes de cada mes.',
    aniosExperiencia: 3,
    galeria: trabajosPorProfesional['prof-camila'] ?? [],
    calificacionPromedio: 4.8,
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
