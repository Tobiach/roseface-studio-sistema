// src/lib/ordenServicios.ts
import { Servicio } from '../types';

// Orden pedido por Yosy para cómo aparecen los servicios de Pestañas al
// reservar un turno (21/9/2026) — no es alfabético ni por precio, es el
// que ella arma para guiar a la clienta de más simple a más elaborado.
const ORDEN_PESTANAS: Record<string, number> = {
  'serv-pestanas-clasica': 0,
  'serv-pestanas-hibridas': 1,
  'serv-pestanas-natural-volumen': 2,
  'serv-pestanas-efecto-humedo': 3,
  'serv-pestanas-medio-volumen': 4,
  'serv-pestanas-roseface': 5,
  'serv-pestanas-mega-volumen': 6,
  'serv-pestanas-volumen-tecnologico': 7,
  'serv-pestanas-brasileno-4d': 8,
  'serv-pestanas-brasileno-6d': 9,
  'serv-lifting': 10,
};

// La tabla 'servicios' de Supabase no tiene columna de orden y el SELECT
// no garantiza el orden de fila — así que el orden que Yosy pidió hay que
// aplicarlo acá, en el cliente, cada vez que llega la lista (de Supabase o
// del mock). Solo reordena los servicios de Pestañas listados arriba entre
// sí; todo lo demás mantiene el orden en el que llegó (sort estable).
export function ordenarServicios(servicios: Servicio[]): Servicio[] {
  return [...servicios].sort((a, b) => {
    const pa = ORDEN_PESTANAS[a.id];
    const pb = ORDEN_PESTANAS[b.id];
    if (pa !== undefined && pb !== undefined) return pa - pb;
    return 0;
  });
}
