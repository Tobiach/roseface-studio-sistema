// src/lib/comisionesEngine.ts
import { Profesional, Turno, CierreComisionSemanal } from '../types';
import { descuentoMercadoPago } from './pricing';

/**
 * Motor de Cálculo de Comisiones — Rose Face Studio
 * Modelo híbrido:
 * - Porcentaje: Mili (55% profesional / 45% estudio), Sharon (45% profesional / 55% estudio)
 * - Alquiler Fijo: Cris, Ari ($52.500 a $60.000 semanales fijos para el estudio)
 */
export function calcularCierreSemanal(
  profesional: Profesional,
  todosLosTurnos: Turno[],
  semanaInicio: string,
  semanaFin: string
): CierreComisionSemanal {
  // Filtrar turnos completados de este profesional, dentro de la semana elegida
  const turnosCompletados = todosLosTurnos.filter(
    (t) =>
      t.profesionalId === profesional.id &&
      t.estado === 'completado' &&
      t.fecha >= semanaInicio &&
      t.fecha <= semanaFin
  );

  const turnosRealizados = turnosCompletados.length;
  const facturacionBruta = turnosCompletados.reduce((sum, t) => sum + t.montoTotal, 0);

  // Mercado Pago se queda con una comisión de cada reserva que se paga por su
  // checkout: se resta antes de aplicar los porcentajes, para que el reparto
  // entre la profesional y el estudio salga sobre lo que realmente quedó.
  const descuentoMercadoPagoTotal = turnosCompletados.reduce((sum, t) => sum + descuentoMercadoPago(t), 0);
  const reservasMercadoPago = turnosCompletados.filter((t) => descuentoMercadoPago(t) > 0).length;
  const facturacionTotal = Math.max(0, facturacionBruta - descuentoMercadoPagoTotal);
  const datosMP = { facturacionBruta, reservasMercadoPago, descuentoMercadoPago: descuentoMercadoPagoTotal };

  if (profesional.modeloComision.tipo === 'porcentaje') {
    const pct = profesional.modeloComision.porcentajeProfesional;
    const montoComisionProfesional = Math.round(facturacionTotal * (pct / 100));
    const montoParaEstudio = facturacionTotal - montoComisionProfesional;

    return {
      id: `cierre-${profesional.id}-${semanaInicio}`,
      profesionalId: profesional.id,
      semanaInicio,
      semanaFin,
      turnosRealizados,
      ...datosMP,
      facturacionTotal,
      montoComisionProfesional,
      montoParaEstudio,
      modeloAplicado: profesional.modeloComision,
      estadoPago: 'pendiente',
    };
  }

  // Modelo Alquiler Fijo
  const alquilerFijo = profesional.modeloComision.montoSemanal;
  return {
    id: `cierre-${profesional.id}-${semanaInicio}`,
    profesionalId: profesional.id,
    semanaInicio,
    semanaFin,
    turnosRealizados,
    ...datosMP,
    facturacionTotal,
    montoComisionProfesional: 0, // No recibe porcentaje sobre servicios
    montoParaEstudio: alquilerFijo, // El estudio recibe el alquiler fijo semanal
    modeloAplicado: profesional.modeloComision,
    estadoPago: 'pendiente',
  };
}
