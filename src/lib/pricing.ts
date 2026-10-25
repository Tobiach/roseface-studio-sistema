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

// ¿Esta reserva tiene el cargo de gestión de $1.000 ya incluido en el precio?
// (pedido de Yosy, 25/10/2026: antes solo se descontaba si se pagaba por el
// checkout de Mercado Pago; ahora también cuenta si esa misma clienta
// transfirió la seña a mano, porque el precio del servicio ya trae el cargo
// de más sea cual sea el medio de pago). Dos caminos:
// - Mercado Pago: el webhook deja a la vez el id del pago y la marca de
//   "verificada automáticamente".
// - Transferencia: solo en el circuito "mercado_pago" (Mili/Roma — las
//   únicas con precios que ya incluyen el cargo; ver circuitoPago en
//   src/types), con el comprobante ya aprobado (aprobadoPorProfesional).
// Una reserva cobrada en efectivo en el estudio, sin seña adelantada, no
// cumple ninguno de los dos y no tiene cargo.
export function descuentoMercadoPago(turno: {
  idTransaccionMP: string | null;
  senaVerificadaAutomaticamente: boolean;
  fechaCreacion: string;
  circuitoPago?: 'mercado_pago' | 'transferencia';
  aprobadoPorProfesional?: boolean;
}): number {
  if (turno.fechaCreacion.slice(0, 10) < DESCUENTO_MP_DESDE) return 0;
  const pagadoPorMP = !!turno.idTransaccionMP && turno.senaVerificadaAutomaticamente;
  const transferidoEnCircuitoMP = turno.circuitoPago === 'mercado_pago' && !!turno.aprobadoPorProfesional;
  if (pagadoPorMP || transferidoEnCircuitoMP) return DESCUENTO_MP_POR_RESERVA;
  return 0;
}
