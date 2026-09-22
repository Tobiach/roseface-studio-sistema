// src/lib/pricing.ts
//
// Seña fija para la mayoría de los servicios (decisión de negocio confirmada
// con Tobias, ligada al acuerdo con Yosy).
// Actualizado 10/9/2026: $20.000 -> $30.000 (definido con Yosy por WhatsApp).
export const MONTO_SENA_FIJO = 30000;

// Dos excepciones reales a la seña fija, confirmadas por Yosy (doc "dia a
// dia Rose Face", 22/9/2026):
// 1. Ningún servicio puede pedir una seña mayor a su propio precio (ej.
//    "Remoción de Pestañas" $16.000: la seña ahí es el total del servicio).
// 2. Depilación Láser se cobra 100% por adelantado (no solo la seña), para
//    que la clienta llegue con el servicio ya pago y solo se atienda.
export function calcularMontoSena(servicio: { precio: number; categoria: string; requiereSena?: boolean }): number {
  if (servicio.requiereSena === false) return 0;
  if (servicio.categoria === 'Depilación Láser') return servicio.precio;
  return Math.min(MONTO_SENA_FIJO, servicio.precio);
}
