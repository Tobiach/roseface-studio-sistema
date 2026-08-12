// src/data/mockFidelizacion.ts
import { BeneficioVIP, ReferidoRegistro, ClientaEnRiesgo } from '../types';

export const mockBeneficiosVIP: BeneficioVIP[] = [
  {
    id: 'ben-01',
    nombre: '10% OFF en tu próximo servicio de pestañas',
    descripcion: 'Aplica en cualquier colocación o retoque de pestañas con tu especialista.',
    puntosNecesarios: 40,
    tipo: 'descuento',
  },
  {
    id: 'ben-02',
    nombre: 'Perfilado de cejas gratis',
    descripcion: 'Perfilado y diseño de cejas de obsequio añadido a tu turno.',
    puntosNecesarios: 50,
    tipo: 'servicio_gratis',
  },
  {
    id: 'ben-03',
    nombre: '20% OFF en Volumen Brasileño',
    descripcion: 'Descuento especial válido para colocación de Volumen Brasileño 4D o 6D.',
    puntosNecesarios: 80,
    tipo: 'descuento',
  },
  {
    id: 'ben-04',
    nombre: 'Lash Lifting gratis',
    descripcion: 'Lash Lifting completo con tintura de pestañas e hidratación con nutrición de regalo.',
    puntosNecesarios: 100,
    tipo: 'servicio_gratis',
  },
  {
    id: 'ben-05',
    nombre: 'Sesión de depilación láser (Combo 3) gratis',
    descripcion: 'Sesión sin costo de Pelvis + Tira de cola con tecnología Soprano Ice.',
    puntosNecesarios: 130,
    tipo: 'servicio_gratis',
  },
];

export const mockReferidos: ReferidoRegistro[] = [
  {
    id: 'ref-01',
    clientaReferenteId: 'cli-01', // Sofía Martínez
    clientaReferidaId: 'cli-02',  // Camila Rodríguez
    fecha: '2026-07-12',
    recompensaOtorgada: true, // Sofía recibió 200 pts bonus
  },
  {
    id: 'ref-02',
    clientaReferenteId: 'cli-03', // Valentina Gómez
    clientaReferidaId: 'cli-07',  // Delfina Rossi
    fecha: '2026-08-02',
    recompensaOtorgada: true,
  },
];

export const mockClientasEnRiesgo: ClientaEnRiesgo[] = [
  {
    clientaId: 'cli-04', // Lucía Fernández (63 días sin visitar)
    diasSinVisitar: 63,
    ultimoServicio: 'Alisado Brasilero',
    flujoRecuperacionActivado: false,
  },
  {
    clientaId: 'cli-06', // Agustina López (79 días sin visitar)
    diasSinVisitar: 79,
    ultimoServicio: 'Depilación Láser — Combo 1',
    flujoRecuperacionActivado: false,
  },
  {
    clientaId: 'cli-08', // Paula Pereyra (42 días sin visitar)
    diasSinVisitar: 42,
    ultimoServicio: 'Laminado de Cejas',
    flujoRecuperacionActivado: true,
  },
];
