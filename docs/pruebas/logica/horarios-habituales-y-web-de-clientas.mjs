const { encajeEnHorario, calcularHorariosDisponibles } = await import('./disp.mjs');
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);

// Mili: lunes no trabaja; sábado 09:00 a 18:30 con bloques fijos 9/11/14/16
const mili = {
  id: 'prof-mili',
  nombre: 'Mili',
  horarioDisponible: { lunes: null, sabado: { desde: '09:00', hasta: '18:30' }, jueves: { desde: '09:00', hasta: '16:00' }, domingo: null },
  horariosFijos: { sabado: ['09:00', '11:00', '14:00', '16:00'], jueves: null },
};
const SAB = '2027-01-09';      // sábado
const LUN = '2027-01-11';      // lunes
const JUE = '2027-01-14';      // jueves (sin bloques fijos: grilla cada 30 min)

// --- encajeEnHorario
let e = encajeEnHorario(mili, SAB, '11:00'); ok(e.tipo === 'habitual', `sábado 11:00 es un bloque que ven las clientas -> ${e.tipo}`);
e = encajeEnHorario(mili, SAB, '11:30'); ok(e.tipo === 'dentro_de_jornada' && e.bloques.join() === '09:00,11:00,14:00,16:00', `sábado 11:30: dentro de la jornada pero no es un bloque de la web -> ${e.tipo}`);
e = encajeEnHorario(mili, SAB, '19:00'); ok(e.tipo === 'fuera_de_jornada' && e.desde === '09:00' && e.hasta === '18:30', `sábado 19:00: fuera de su horario (09:00 a 18:30) -> ${e.tipo}`);
e = encajeEnHorario(mili, SAB, '07:30'); ok(e.tipo === 'fuera_de_jornada', `sábado 07:30: antes de abrir -> ${e.tipo}`);
e = encajeEnHorario(mili, LUN, '10:00'); ok(e.tipo === 'dia_libre' && e.dia === 'lunes', `lunes: no trabaja -> ${e.tipo} (${e.dia})`);
e = encajeEnHorario(mili, JUE, '10:30'); ok(e.tipo === 'habitual', `jueves sin bloques fijos: 10:30 está en la grilla de 30 min -> ${e.tipo}`);
e = encajeEnHorario(mili, JUE, '10:20'); ok(e.tipo === 'dentro_de_jornada', `jueves 10:20: hora suelta dentro de la jornada -> ${e.tipo}`);

// --- Lo que ven las clientas NO cambia por culpa de turnos cargados a mano fuera de horario
const turno = (id, fecha, ini, fin, estado = 'reservado') => ({ id, profesionalId: 'prof-mili', fecha, horaInicio: ini, horaFin: fin, estado, origenReserva: 'manual', expiraEn: null });
const dur = 90;
const base = calcularHorariosDisponibles(mili, SAB, dur, [], []);
ok(base.join() === '09:00,11:00,14:00,16:00', `sábado sin turnos: la web ofrece solo los bloques fijos (${base.join(' ')})`);

let h = calcularHorariosDisponibles(mili, SAB, dur, [turno(1, SAB, '19:00', '20:30'), turno(2, SAB, '07:00', '08:00')], []);
ok(h.join() === base.join(), 'turnos manuales FUERA de la jornada (19:00 y 07:00) no cambian nada de lo que ve la clienta');

h = calcularHorariosDisponibles(mili, SAB, dur, [turno(3, SAB, '11:30', '12:30')], []);
ok(h.join() === '09:00,14:00,16:00', `un turno manual a las 11:30 (pisa el bloque de 11:00) lo saca de la web, sin ofrecer horarios nuevos (${h.join(' ')})`);

h = calcularHorariosDisponibles(mili, SAB, dur, [turno(4, SAB, '08:00', '09:15')], []);
ok(h.join() === '11:00,14:00,16:00', `un turno manual 08:00-09:15 (se pisa con el bloque de 09:00) también lo saca (${h.join(' ')})`);

h = calcularHorariosDisponibles(mili, LUN, dur, [turno(5, LUN, '10:00', '11:30')], []);
ok(h.length === 0, 'un lunes (día libre) con un turno manual: la web sigue sin ofrecer nada ese día');

h = calcularHorariosDisponibles(mili, SAB, dur, [turno(6, SAB, '14:00', '15:30', 'cancelado')], []);
ok(h.join() === base.join(), 'un turno manual CANCELADO libera el bloque otra vez');

// --- Un turno manual en el MISMO horario de un bloque lo ocupa (y la base lo respalda con el índice único)
h = calcularHorariosDisponibles(mili, SAB, dur, [turno(7, SAB, '16:00', '17:30')], []);
ok(h.join() === '09:00,11:00,14:00', `turno manual exactamente a las 16:00 ocupa ese bloque (${h.join(' ')})`);
process.exit(0);
