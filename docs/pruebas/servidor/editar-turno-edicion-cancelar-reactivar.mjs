import { createHmac } from 'node:crypto';
process.env.VITE_SUPABASE_URL = 'http://fake';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';
delete process.env.RESEND_API_KEY;
const { db } = await import('./fake-supabase.mjs');
const { default: editar } = await import('./editar-turno.mjs');

const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const token = (rol, pid) => {
  const payload = Buffer.from(JSON.stringify({ rol, pid, exp: Date.now() + 3600_000 })).toString('base64url');
  return 'Bearer ' + payload + '.' + createHmac('sha256', 'clave-de-prueba').update('rf-sesion-v1.' + payload).digest('base64url');
};
const ADMIN = token('admin', null), MILI = token('profesional', 'prof-mili'), YOSY_PROF = token('profesional', 'prof-yosy');
const llamar = (headers, body) => new Promise((resolve) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(o) { resolve({ status: this.statusCode, body: o }); return this; } };
  editar({ method: 'POST', headers, body }, res);
});

const manana = new Date(Date.now() + 2 * 86400_000 - 3 * 3600_000).toISOString().slice(0, 10);
const en5 = new Date(Date.now() + 5 * 86400_000 - 3 * 3600_000).toISOString().slice(0, 10);
const ayer = new Date(Date.now() - 86400_000 - 3 * 3600_000).toISOString().slice(0, 10);
function reset() {
  db.servicios = [
    { id: 's-clasica', nombre: 'Clásicas', categoria: 'Pestañas', precio: 41500, duracion_minutos: 90, profesionales_que_lo_realizan: ['prof-mili', 'prof-yosy'] },
    { id: 's-volumen', nombre: 'Volumen 6D', categoria: 'Pestañas', precio: 51000, duracion_minutos: 140, profesionales_que_lo_realizan: ['prof-mili', 'prof-yosy'] },
    { id: 's-cejas', nombre: 'Perfilado', categoria: 'Cejas', precio: 26000, duracion_minutos: 45, profesionales_que_lo_realizan: ['prof-yosy'] },
  ];
  db.profesionales = [{ id: 'prof-mili', nombre: 'Mili' }, { id: 'prof-yosy', nombre: 'Yosy' }];
  db.turnos = [
    { id: 1, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: manana, hora_inicio: '09:00:00', hora_fin: '10:30:00', estado: 'reservado', origen_reserva: 'manual', monto_total: 41500, monto_sena: 30000, aprobado_por_profesional: false, id_transaccion_mp: null, servicios_extra: [{ nombre: 'Retiro', precio: 3000 }], notas_internas: 'Turno cargado a mano' },
    { id: 2, clienta_id: 'c2', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: manana, hora_inicio: '11:00:00', hora_fin: '12:30:00', estado: 'sena_confirmada', origen_reserva: 'web', monto_total: 41500, monto_sena: 30000, aprobado_por_profesional: false, id_transaccion_mp: '999', servicios_extra: [], notas_internas: null },
    { id: 3, clienta_id: 'c3', profesional_id: 'prof-yosy', servicio_id: 's-clasica', fecha: manana, hora_inicio: '09:00:00', hora_fin: '10:30:00', estado: 'completado', origen_reserva: 'manual', monto_total: 41500, monto_sena: 0, aprobado_por_profesional: false, id_transaccion_mp: null, servicios_extra: [], notas_internas: null },
    { id: 4, clienta_id: 'c4', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: en5, hora_inicio: '14:00:00', hora_fin: '15:30:00', estado: 'sena_confirmada', origen_reserva: 'manual', monto_total: 41500, monto_sena: 30000, aprobado_por_profesional: false, id_transaccion_mp: null, servicios_extra: [], notas_internas: null },
  ];
  db.recordatorios_config = [{ turno_id: 1, plantilla: '72h', activado: true }, { turno_id: 1, plantilla: '48h', activado: true }, { turno_id: 2, plantilla: '48h', activado: true }];
  db.clientas_recurrentes_estado = [{ clienta_id: 'c1', servicio_id: 's-clasica', turno_id_ancla: 1, nota: 'Marcada a mano desde la Agenda' }];
}
const turno = (id) => db.turnos.find((t) => t.id === id);
let r;

reset();
r = await llamar({}, { turnoId: 1, accion: 'editar', fecha: en5 }); ok(r.status === 401, `sin token -> 401 (${r.status})`);
r = await llamar({ authorization: 'Bearer x.y' }, { turnoId: 1, accion: 'editar', fecha: en5 }); ok(r.status === 401, `token falso -> 401 (${r.status})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 1, accion: 'rarisima' }); ok(r.status === 400, `acción inválida -> 400 (${r.status})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 99, accion: 'editar', fecha: en5 }); ok(r.status === 404, `turno inexistente -> 404 (${r.status})`);

// --- Permisos
r = await llamar({ authorization: MILI }, { turnoId: 3, accion: 'editar', fecha: en5 }); ok(r.status === 403, `Mili sobre turno de Yosy -> 403 (${r.status})`);
r = await llamar({ authorization: YOSY_PROF }, { turnoId: 3, accion: 'editar', servicioId: 's-cejas' }); ok(r.status === 403 && /completado/.test(r.body.error), `profesional sobre turno COMPLETADO -> 403 (${r.body.error})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', profesionalId: 'prof-yosy' }); ok(r.status === 403, `profesional cambiando la profesional -> 403 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', montoTotal: 1 }); ok(r.status === 403, `profesional corrigiendo el total a mano -> 403 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', montoSena: 1 }); ok(r.status === 403, `profesional corrigiendo la seña a mano -> 403 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', fecha: ayer }); ok(r.status === 409, `profesional moviendo al pasado -> 409 (${r.status})`);

// --- Validaciones
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar' }); ok(r.status === 400 && /nada para cambiar/.test(r.body.error), `sin cambios -> 400 (${r.body.error})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', horaInicio: '25:00' }); ok(r.status === 400, `hora inválida -> 400 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', horaInicio: '10:00', horaFin: '09:00' }); ok(r.status === 400, `fin anterior al inicio -> 400 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', servicioId: 's-cejas' }); ok(r.status === 400 && /no realiza/.test(r.body.error), `servicio que la profesional no hace -> 400 (${r.body.error})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', horaInicio: '11:00' }); ok(r.status === 409 && /11:00/.test(r.body.error), `misma hora de inicio que otro turno -> 409 (${r.body.error})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 1, accion: 'editar', servicioId: 'no-existe' }); ok(r.status === 404, `servicio inexistente -> 404 (${r.status})`);

// --- Cambiar servicio (Mili, turno manual con seña pendiente y 1 extra de $3.000)
reset();
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', servicioId: 's-volumen', nota: 'la clienta pidió más volumen' });
let t = turno(1);
ok(r.status === 200 && t.servicio_id === 's-volumen', `profesional cambia el servicio de su turno (${r.status})`);
ok(t.monto_total === 51000 + 3000, `total recalculado en el servidor: precio del servicio nuevo + extras ya cargados = ${t.monto_total}`);
ok(t.hora_fin.slice(0, 5) === '11:20', `la hora de fin sigue la duración del servicio nuevo (09:00 + 140 min = ${t.hora_fin})`);
ok(t.monto_sena === 30000, `seña pendiente recalculada por la regla del servicio (${t.monto_sena})`);
ok(/Mili\] Editó el turno: servicio Clásicas → Volumen 6D; total \$41\.500 → \$54\.000/.test(t.notas_internas) && /Turno cargado a mano/.test(t.notas_internas) && /la clienta pidió más volumen/.test(t.notas_internas), 'queda anotado quién, cuándo y qué cambió (sin perder las notas anteriores)');
ok(db.clientas_recurrentes_estado[0].servicio_id === 's-volumen', 'la marca de "clienta recurrente" sigue al servicio nuevo');
ok(db.recordatorios_config.filter((x) => x.turno_id === 1).length === 2, 'cambiar solo el servicio NO reinicia los recordatorios');

// --- Mover de día/hora (reinicia recordatorios)
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', fecha: en5, horaInicio: '16:00' });
t = turno(1);
ok(r.status === 200 && t.fecha === en5 && t.hora_inicio === '16:00' && t.hora_fin.slice(0, 5) === '18:20', `mueve el turno conservando la duración (${t.fecha} ${t.hora_inicio}-${t.hora_fin})`);
ok(db.recordatorios_config.filter((x) => x.turno_id === 1).length === 0, 'al cambiar día/hora se reinician los recordatorios ya enviados de ESE turno');
ok(db.recordatorios_config.filter((x) => x.turno_id === 2).length === 1, '... y no se tocan los de otros turnos');

// --- Seña ya pagada: no se toca al cambiar de servicio
reset();
r = await llamar({ authorization: MILI }, { turnoId: 2, accion: 'editar', servicioId: 's-volumen' });
t = turno(2);
ok(r.status === 200 && t.monto_sena === 30000 && t.monto_total === 51000, `seña ya pagada no cambia con el servicio (seña ${t.monto_sena}, total ${t.monto_total})`);

// --- Yosy (admin): cambiar profesional, corregir precio
reset();
r = await llamar({ authorization: ADMIN }, { turnoId: 1, accion: 'editar', profesionalId: 'prof-yosy', horaInicio: '13:00', montoTotal: 45000, montoSena: 20000 });
t = turno(1);
ok(r.status === 200 && t.profesional_id === 'prof-yosy' && t.monto_total === 45000 && t.monto_sena === 20000, `Yosy cambia la profesional y corrige total/seña (${t.profesional_id}, ${t.monto_total}, ${t.monto_sena})`);
ok(/Yosy\] Editó el turno/.test(t.notas_internas), 'queda firmado por Yosy');
r = await llamar({ authorization: ADMIN }, { turnoId: 3, accion: 'editar', servicioId: 's-cejas' });
ok(r.status === 200 && turno(3).monto_total === 26000, `Yosy puede editar un turno completado (total -> ${turno(3).monto_total})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 1, accion: 'editar', profesionalId: 'prof-yosy', servicioId: 's-cejas', horaInicio: '09:00' });
ok(r.status === 409, `Yosy: choque exacto con el turno 3 de Yosy a las 09:00 -> 409 (${r.status}: ${r.body.error})`);

// --- Cancelar / reactivar
reset();
r = await llamar({ authorization: MILI }, { turnoId: 3, accion: 'cancelar' }); ok(r.status === 403, `profesional cancelando turno ajeno -> 403 (${r.status})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 3, accion: 'cancelar' }); ok(r.status === 400, `no se cancela un turno completado -> 400 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 4, accion: 'cancelar', motivo: 'la clienta avisó que no viene' });
t = turno(4);
ok(r.status === 200 && t.estado === 'cancelado' && /la clienta avisó que no viene/.test(t.notas_internas), 'cancelar con motivo queda anotado');
ok(t.aprobado_por_profesional === true, 'un turno manual con seña ya confirmada conserva el dato de "seña pagada" al cancelarse');
r = await llamar({ authorization: MILI }, { turnoId: 4, accion: 'editar', fecha: manana }); ok(r.status === 400 && /reactivalo/.test(r.body.error), `editar un cancelado -> 400 "reactivalo" (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 4, accion: 'reactivar' });
ok(r.status === 200 && turno(4).estado === 'reservado' && turno(4).aprobado_por_profesional === true, `reactivar un manual: vuelve reservado y sigue con la seña marcada como pagada (${turno(4).estado})`);
// reactivar un turno cuyo horario fue ocupado por otro
db.turnos.push({ id: 5, clienta_id: 'c5', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: en5, hora_inicio: '14:00:00', hora_fin: '15:30:00', estado: 'reservado', origen_reserva: 'manual', monto_total: 1, monto_sena: 0, aprobado_por_profesional: false, id_transaccion_mp: null, servicios_extra: [], notas_internas: null });
await llamar({ authorization: ADMIN }, { turnoId: 4, accion: 'cancelar' });
r = await llamar({ authorization: ADMIN }, { turnoId: 4, accion: 'reactivar' });
ok(r.status === 409, `reactivar con el horario ya ocupado -> 409 (${r.status}: ${r.body.error})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 2, accion: 'cancelar' });
r = await llamar({ authorization: ADMIN }, { turnoId: 2, accion: 'reactivar' });
ok(r.status === 200 && turno(2).estado === 'sena_confirmada', `un turno del sitio con pago confirmado vuelve como seña confirmada (${turno(2).estado})`);

// --- Servicios extra desde "Editar reserva" (29/10/2026): antes solo se sumaban
// al confirmar "Vino" — ahora también se pueden cargar/editar acá sin completar el turno.
reset();
// Turno 2: reservado, sin extras todavía -> una profesional suma 2 extras sin cambiar el servicio
r = await llamar({ authorization: MILI }, { turnoId: 2, accion: 'editar', serviciosExtra: [{ nombre: 'Retiro', precio: 3000 }, { nombre: 'Diseño', precio: 2000 }] });
t = turno(2);
ok(r.status === 200 && t.servicios_extra.length === 2 && t.monto_total === 41500 + 5000, `profesional suma 2 extras sin cambiar el servicio: total ${t.monto_total} (esperado 46500)`);
ok(t.monto_sena === 30000, 'la seña ya pagada no se toca');
ok(/extras: Retiro, Diseño/.test(t.notas_internas), 'queda anotado qué extras quedaron');

// Turno 1: cambia el servicio Y los extras a la vez (reemplaza el extra de $3.000 que ya tenía)
reset();
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', servicioId: 's-volumen', serviciosExtra: [{ nombre: 'Masaje', precio: 4000 }] });
t = turno(1);
ok(r.status === 200 && t.servicio_id === 's-volumen' && t.servicios_extra.length === 1 && t.servicios_extra[0].nombre === 'Masaje' && t.monto_total === 51000 + 4000, `cambia servicio y extras juntos: total ${t.monto_total} (esperado 55000)`);

// Vaciar los extras (mandar un array vacío es un cambio válido, saca el que tenía)
reset();
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', serviciosExtra: [] });
t = turno(1);
ok(r.status === 200 && t.servicios_extra.length === 0 && t.monto_total === 41500, `vaciar los extras saca el de $3.000 (total ${t.monto_total}, esperado 41500)`);

// Extras inválidos -> 400, no guarda nada
reset();
r = await llamar({ authorization: MILI }, { turnoId: 2, accion: 'editar', serviciosExtra: [{ nombre: '', precio: 100 }] });
ok(r.status === 400 && /no son válidos/.test(r.body.error), `extra sin nombre -> 400 (${r.status}, ${r.body.error})`);
ok(turno(2).servicios_extra.length === 0, '... y no se guardó nada');

// Mandar los mismos extras que ya tenía igual cuenta como "hay cambios" (no hace falta que cambien para poder guardar)
reset();
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', serviciosExtra: [{ nombre: 'Retiro', precio: 3000 }] });
ok(r.status === 200, `mandar los mismos extras -> 200, no exige que sean distintos (${r.status})`);
