// Cuenta bancaria del día (29/10/2026) + que el mensaje de WhatsApp use la cuenta
// correcta en vez del link de Mercado Pago, solo para el circuito "mercado_pago".
// Compilar src/lib/cuentasBancarias.ts como ./cb.mjs, src/lib/recordatorios.ts
// como ./rec.mjs (que a su vez importa cuentasBancarias.ts y whatsapp.ts).
import { cuentaBancariaDelDia } from './cb.mjs';
import { llevaCuentaBancaria, cuentaBancariaParaTurno, mensajeParaTurno } from './rec.mjs';

let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };

// lunes 26/10, martes 27/10, miércoles 28/10 -> Galicia
ok(cuentaBancariaDelDia('2026-10-26').banco === 'Banco Galicia', `lunes -> Galicia (${cuentaBancariaDelDia('2026-10-26').banco})`);
ok(cuentaBancariaDelDia('2026-10-27').banco === 'Banco Galicia', `martes -> Galicia (${cuentaBancariaDelDia('2026-10-27').banco})`);
ok(cuentaBancariaDelDia('2026-10-28').banco === 'Banco Galicia', `miércoles -> Galicia (${cuentaBancariaDelDia('2026-10-28').banco})`);
// jueves 29/10, viernes 30/10 -> Lemon
ok(cuentaBancariaDelDia('2026-10-29').banco === 'Banco Lemon', `jueves -> Lemon (${cuentaBancariaDelDia('2026-10-29').banco})`);
ok(cuentaBancariaDelDia('2026-10-30').banco === 'Banco Lemon', `viernes -> Lemon (${cuentaBancariaDelDia('2026-10-30').banco})`);
// sábado 31/10, domingo 1/11 -> Santander
ok(cuentaBancariaDelDia('2026-10-31').banco === 'Banco Santander', `sábado -> Santander (${cuentaBancariaDelDia('2026-10-31').banco})`);
ok(cuentaBancariaDelDia('2026-11-01').banco === 'Banco Santander', `domingo -> Santander (${cuentaBancariaDelDia('2026-11-01').banco})`);

// Los datos reales no se tocan: CBU/alias/titular exactos del doc de Tobias.
const galicia = cuentaBancariaDelDia('2026-10-26');
ok(galicia.cbu === '0070136130004034722155' && galicia.alias === 'FRANJA.LIJA.BANCO' && galicia.titular === 'Haidi Trinidad Beitia', 'Galicia: CBU/alias/titular exactos');
const santander = cuentaBancariaDelDia('2026-10-31');
ok(santander.cbu === '0720480188000002712640' && santander.alias === 'RoseFace' && santander.cuentaEnPesos === '480-027126/4', 'Santander: CBU/alias/cuenta exactos');

// llevaCuentaBancaria: solo circuito mercado_pago, seña pendiente, 72h/48h
const base = { origenReserva: 'manual', estado: 'reservado', aprobadoPorProfesional: false, fecha: '2026-10-26' };
ok(llevaCuentaBancaria({ ...base, circuitoPago: 'mercado_pago' }, '72h') === true, 'MP + seña pendiente + 72h -> lleva cuenta');
ok(llevaCuentaBancaria({ ...base, circuitoPago: 'mercado_pago' }, '48h') === true, 'MP + 48h -> lleva cuenta');
ok(llevaCuentaBancaria({ ...base, circuitoPago: 'mercado_pago' }, '24h') === false, '24h no pide plata -> no lleva cuenta');
ok(llevaCuentaBancaria({ ...base, circuitoPago: 'transferencia' }, '72h') === false, 'circuito transferencia (Cris/Ari) -> NO lleva cuenta');
ok(llevaCuentaBancaria({ ...base, estado: 'sena_confirmada', circuitoPago: 'mercado_pago' }, '72h') === false, 'seña ya confirmada -> no lleva cuenta');

// El mensaje final: con cuenta, aparece el banco y el CBU; sin cuenta, no aparece nada de eso.
const turno = { fecha: '2026-10-29', horaInicio: '14:00', montoSena: 30000, origenReserva: 'manual', estado: 'reservado', aprobadoPorProfesional: false };
const conCuenta = mensajeParaTurno(turno, '72h', 'Ana', 'Clásicas', cuentaBancariaParaTurno(turno));
ok(/Banco Lemon/.test(conCuenta) && /0000168300000020305972/.test(conCuenta), `mensaje con cuenta incluye banco y CBU del jueves (Lemon): ${conCuenta.slice(0, 60)}...`);
ok(!/Mercado Pago/.test(conCuenta), 'el mensaje con cuenta ya no menciona Mercado Pago');
const sinCuenta = mensajeParaTurno(turno, '72h', 'Ana', 'Clásicas', undefined);
ok(!/CBU|Banco|Mercado Pago/.test(sinCuenta), `mensaje sin cuenta no menciona nada de pago: ${sinCuenta.slice(0, 60)}...`);

console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
