// src/data/mockProfesionales.ts
import { Profesional } from '../types';
import fotoYosy from '../assets/images/profesionales/prof-yosy.jpg';
import fotoMili from '../assets/images/profesionales/prof-mili.jpg';
import fotoSharon from '../assets/images/profesionales/prof-sharon.jpg';
import fotoMartina from '../assets/images/profesionales/prof-martina.jpg';
import fotoSofia from '../assets/images/profesionales/prof-sofia.jpg';
import fotoAlexandra from '../assets/images/profesionales/prof-alexandra.jpg';
import fotoCamila from '../assets/images/profesionales/prof-camila.jpg';
import fotoValentina from '../assets/images/profesionales/prof-valentina.jpg';
import { trabajosPorProfesional } from './trabajosFotos';

export const mockProfesionales: Profesional[] = [
  {
    id: 'prof-yosy',
    nombre: 'Yosy',
    fotoUrl: fotoYosy,
    especialidades: ['Pestañas'],
    bio: 'Fundadora y especialista principal en pestañas de Rose Face Studio. Referente del equipo en técnicas de volumen y diseño de mirada.',
    aniosExperiencia: 8,
    // TODO: reemplazar por trabajos reales de Yosy al cerrar la venta —
    // por ahora reusa fotos ya cargadas de Mili/Sharon (autorizado por Tobias, 17/8).
    galeria: trabajosPorProfesional['prof-yosy'],
    calificacionPromedio: 5.0,
    cantidadResenas: 120,
    modeloComision: {
      tipo: 'porcentaje',
      porcentajeProfesional: 100, // es la dueña — toda la facturación es del estudio
    },
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
    nombre: 'Mili',
    apodo: 'Mili',
    fotoUrl: fotoMili,
    especialidades: ['Pestañas', 'Lifting de Pestañas', 'Cejas'],
    bio: 'Especialista senior en diseño de mirada y lifting de pestañas. Apasionada por resaltar la belleza natural con técnicas de alta precisión.',
    aniosExperiencia: 5,
    galeria: trabajosPorProfesional['prof-mili'],
    calificacionPromedio: 4.9,
    cantidadResenas: 86,
    modeloComision: {
      tipo: 'porcentaje',
      porcentajeProfesional: 55, // 55% para Mili / 45% para el estudio
    },
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
    apodo: 'Sharon',
    fotoUrl: fotoSharon,
    especialidades: ['Pestañas', 'Volumen Ruso'],
    bio: 'Experta certificada en extensiones pelo a pelo y volumen ruso. Enfoque hiper-detallista para miradas de impacto.',
    aniosExperiencia: 3,
    galeria: trabajosPorProfesional['prof-sharon'],
    calificacionPromedio: 4.9,
    cantidadResenas: 142,
    modeloComision: {
      tipo: 'porcentaje',
      porcentajeProfesional: 45, // 45% para Sharon / 55% para el estudio
    },
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
    apodo: 'Marti',
    fotoUrl: fotoMartina,
    especialidades: ['Alisados', 'Alisado Brasilero'],
    bio: 'Especialista en nutrición capilar y alisados progresivos libres de formol. Cabellos brillantes, sedosos y saludables.',
    aniosExperiencia: 4,
    galeria: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800',
    ],
    calificacionPromedio: 4.8,
    cantidadResenas: 52,
    modeloComision: {
      tipo: 'alquiler_fijo',
      montoSemanal: 50000,
    },
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
    apodo: 'Sofi',
    fotoUrl: fotoSofia,
    especialidades: ['Masajes y Faciales', 'Limpieza Facial Profunda'],
    bio: 'Cosmiatra y masoterapeuta. Cuidado integral de la piel, peeling ultrasónico y masajes descontracturantes para el relax total.',
    aniosExperiencia: 6,
    galeria: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800',
    ],
    calificacionPromedio: 4.9,
    cantidadResenas: 86,
    modeloComision: {
      tipo: 'alquiler_fijo',
      montoSemanal: 45000,
    },
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
    apodo: 'Ale',
    fotoUrl: fotoAlexandra,
    especialidades: ['Uñas', 'Semipermanente', 'Esculpidas'],
    bio: 'Nail artist apasionada por la kapping gel, esculpidas en acrílico y esmaltado semipermanente con nail art personalizado.',
    aniosExperiencia: 4,
    galeria: trabajosPorProfesional['prof-alexandra'],
    calificacionPromedio: 4.9,
    cantidadResenas: 142,
    modeloComision: {
      tipo: 'alquiler_fijo',
      montoSemanal: 48000,
    },
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
    apodo: 'Cami',
    fotoUrl: fotoCamila,
    especialidades: ['Depilación Láser', 'Cejas'],
    bio: 'Técnica láser con equipamiento Soprano Ice de última generación y especialista en visajismo de cejas.',
    aniosExperiencia: 3,
    galeria: trabajosPorProfesional['prof-camila'],
    calificacionPromedio: 4.8,
    cantidadResenas: 64,
    modeloComision: {
      tipo: 'alquiler_fijo',
      montoSemanal: 52000,
    },
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
    apodo: 'Valen',
    fotoUrl: fotoValentina,
    especialidades: ['Cejas', 'Laminado de Cejas'],
    bio: 'Especialista en laminado de cejas — cejas peinadas, definidas y con efecto duradero.',
    aniosExperiencia: 2,
    galeria: trabajosPorProfesional['prof-valentina'],
    calificacionPromedio: 4.8,
    cantidadResenas: 45,
    modeloComision: {
      tipo: 'alquiler_fijo',
      montoSemanal: 45000,
    },
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
