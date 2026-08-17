// src/lib/comisionesEngine.ts
import { Profesional, Turno, CierreComisionSemanal } from '../types';

/**
 * Motor de Cálculo de Comisiones — Rose Face Studio
 * Modelo híbrido:
 * - Porcentaje: Mili (55% profesional / 45% estudio), Sharon (45% profesional / 55% estudio)
 * - Alquiler Fijo: Martina, Sofia, Alexandra ($45.000 a $60.000 semanales fijos para el estudio)
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
  const facturacionTotal = turnosCompletados.reduce((sum, t) => sum + t.montoTotal, 0);

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
    facturacionTotal,
    montoComisionProfesional: 0, // No recibe porcentaje sobre servicios
    montoParaEstudio: alquilerFijo, // El estudio recibe el alquiler fijo semanal
    modeloAplicado: profesional.modeloComision,
    estadoPago: 'pendiente',
  };
}
