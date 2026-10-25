import { resumenReservasMercadoPago, calcularCierreSemanal } from './eng.mjs';
let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };

const base = { idTransaccionMP: '184760000001', senaVerificadaAutomaticamente: true, fechaCreacion: '2026-10-16T23:59:23Z', estado: 'sena_confirmada', montoTotal: 45000, profesionalId: 'p1', fecha: '2026-10-22' };
const T = (o) => ({ ...base, ...o });
const SEM = ['2026-10-19', '2026-10-25'];

const turnos = [
  T({ id: 'a', estado: 'completado', fecha: '2026-10-19' }),                         // atendida, esta semana
  T({ id: 'b', fecha: '2026-10-24' }),                                               // por atender, esta semana (sábado)
  T({ id: 'c', fecha: '2026-10-25' }),                                               // por atender, domingo (último día de la semana)
  T({ id: 'd', fecha: '2026-10-26' }),                                               // semana siguiente: solo en el total
  T({ id: 'e', fecha: '2026-10-17', estado: 'completado' }),                         // semana anterior: solo en el total
  T({ id: 'f', estado: 'cancelado' }),                                               // cancelada: no cuenta
  T({ id: 'g', idTransaccionMP: 'MP-SEED-12345678', fechaCreacion: '2026-09-27T10:00:00Z', estado: 'completado' }), // demo (27/9): antes del corte
  T({ id: 'h', fechaCreacion: '2026-10-12T23:00:00Z' }),                             // creada antes del 13/10
  T({ id: 'i', idTransaccionMP: null }),                                             // sin pago de MP (seña manual/transferencia)
  T({ id: 'j', senaVerificadaAutomaticamente: false }),                              // id sin verificar
  T({ id: 'k', profesionalId: 'p2' }),                                               // otra profesional
  T({ id: 'l', estado: 'reservado' }),                                               // reservado con MP (pendiente de pago confirmado?) cuenta como por atender
];
const r = resumenReservasMercadoPago('p1', turnos, ...SEM);
ok(r.atendidasSemana === 1, `atendidas de la semana = 1 (da ${r.atendidasSemana})`);
ok(r.porAtenderSemana === 3, `por atender de la semana = 3: b, c, l (da ${r.porAtenderSemana})`);
ok(r.totalReservas === 6, `total = 6: a, b, c, d, e, l (da ${r.totalReservas})`);
const r2 = resumenReservasMercadoPago('p2', turnos, ...SEM);
ok(r2.porAtenderSemana === 1 && r2.totalReservas === 1, 'cada profesional cuenta solo lo suyo');
const r0 = resumenReservasMercadoPago('nadie', turnos, ...SEM);
ok(r0.atendidasSemana === 0 && r0.porAtenderSemana === 0 && r0.totalReservas === 0, 'sin reservas: todo en 0');

// El descuento del cierre NO cambió: sigue contando solo las ya atendidas (a) de la semana
const prof = { id: 'p1', modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 55 } };
const cierre = calcularCierreSemanal(prof, turnos, ...SEM);
ok(cierre.reservasMercadoPago === 1 && cierre.descuentoMercadoPago === 1000, `el cierre descuenta solo la atendida: 1 reserva, $1.000 (da ${cierre.reservasMercadoPago} / ${cierre.descuentoMercadoPago})`);
ok(cierre.facturacionBruta === 90000 && cierre.facturacionTotal === 89000, `bruta 90.000 (2 completadas: a y la de demo g) − 1.000 de MP = base 89.000 (da ${cierre.facturacionBruta} / ${cierre.facturacionTotal})`);

// ---------- 25/10: el cargo de gestión también cuenta si se pagó por transferencia,
// pero SOLO en el circuito "mercado_pago" (Mili/Roma) con el comprobante ya aprobado.
const turnosTransferencia = [
  // completado, circuito mercado_pago, transferencia YA aprobada -> cuenta
  T({ id: 'm1', estado: 'completado', fecha: '2026-10-20', idTransaccionMP: null, senaVerificadaAutomaticamente: false, circuitoPago: 'mercado_pago', aprobadoPorProfesional: true }),
  // completado, circuito mercado_pago, transferencia TODAVÍA sin aprobar -> no cuenta
  T({ id: 'm2', estado: 'completado', fecha: '2026-10-20', idTransaccionMP: null, senaVerificadaAutomaticamente: false, circuitoPago: 'mercado_pago', aprobadoPorProfesional: false }),
  // completado, circuito transferencia (alquiler fijo), comprobante aprobado -> NO cuenta (no reparte por %)
  T({ id: 'm3', estado: 'completado', fecha: '2026-10-20', idTransaccionMP: null, senaVerificadaAutomaticamente: false, circuitoPago: 'transferencia', aprobadoPorProfesional: true }),
];
const cierreTransferencia = calcularCierreSemanal(
  { id: 'p1', modeloComision: { tipo: 'porcentaje', porcentajeProfesional: 55 } },
  turnosTransferencia,
  '2026-10-19',
  '2026-10-25'
);
ok(cierreTransferencia.reservasMercadoPago === 1 && cierreTransferencia.descuentoMercadoPago === 1000, `solo m1 (transferencia aprobada, circuito MP) tiene cargo: 1 reserva, $1.000 (da ${cierreTransferencia.reservasMercadoPago} / ${cierreTransferencia.descuentoMercadoPago})`);

console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
