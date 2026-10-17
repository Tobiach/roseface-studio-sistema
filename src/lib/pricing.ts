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

// Mercado Pago le descuenta una comisión a la seña de cada reserva que se paga
// por su checkout (pedido de Yosy, 17/10/2026). Se toma como $1.000 fijos por
// reserva y es lo que los precios de Pestañas, Cejas y Depilación Láser ya
// traen de más desde el 13/10/2026 (commit "suma $1.000 a los servicios que se
// cobran por Mercado Pago"). Para repartir bien entre profesional y estudio,
// ese monto se resta de la facturación ANTES de aplicar los porcentajes.
export const DESCUENTO_MP_POR_RESERVA = 1000;

// Las reservas hechas antes de esa fecha tienen el precio viejo (sin los
// $1.000 de más), así que no se les descuenta nada.
export const DESCUENTO_MP_DESDE = '2026-10-13';

// ¿Esta reserva se pagó por Mercado Pago? Solo el webhook de MP deja a la vez
// el id del pago y la marca de "verificada automáticamente": una reserva
// manual, por transferencia o cobrada en el estudio nunca cumple las dos.
export function descuentoMercadoPago(turno: {
  idTransaccionMP: string | null;
  senaVerificadaAutomaticamente: boolean;
  fechaCreacion: string;
}): number {
  if (!turno.idTransaccionMP || !turno.senaVerificadaAutomaticamente) return 0;
  if (turno.fechaCreacion.slice(0, 10) < DESCUENTO_MP_DESDE) return 0;
  return DESCUENTO_MP_POR_RESERVA;
}
