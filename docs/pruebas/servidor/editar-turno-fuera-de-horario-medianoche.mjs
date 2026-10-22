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
const llamar = (headers, body) => new Promise((resolve) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(o) { resolve({ status: this.statusCode, body: o }); return this; } };
  editar({ method: 'POST', headers, body }, res);
});
const en5 = new Date(Date.now() + 5 * 86400_000 - 3 * 3600_000).toISOString().slice(0, 10);
db.servicios = [{ id: 's1', nombre: 'Clásicas', categoria: 'Pestañas', precio: 41500, duracion_minutos: 90, profesionales_que_lo_realizan: ['prof-mili'] }];
db.profesionales = [{ id: 'prof-mili', nombre: 'Mili' }];
db.turnos = [{ id: 1, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's1', fecha: en5, hora_inicio: '10:00:00', hora_fin: '11:30:00', estado: 'reservado', origen_reserva: 'manual', monto_total: 41500, monto_sena: 30000, aprobado_por_profesional: false, id_transaccion_mp: null, servicios_extra: [], notas_internas: null }];
db.recordatorios_config = []; db.clientas_recurrentes_estado = [];
const MILI = token('profesional', 'prof-mili');
let r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', horaInicio: '23:00' });
ok(r.status === 200 && db.turnos[0].hora_inicio === '23:00' && db.turnos[0].hora_fin === '23:59', `una profesional mueve su turno a las 23:00 (fuera de horario): termina a las 23:59, sin dar la vuelta (${db.turnos[0].hora_inicio}-${db.turnos[0].hora_fin})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', horaInicio: '06:30', fecha: en5 });
ok(r.status === 200 && db.turnos[0].hora_inicio === '06:30' && db.turnos[0].hora_fin === '08:00', `y a las 06:30 (antes de abrir): conserva la duración (${db.turnos[0].hora_inicio}-${db.turnos[0].hora_fin})`);
const domingo = (() => { const d = new Date(`${en5}T12:00:00`); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return d.toISOString().slice(0, 10); })();
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'editar', fecha: domingo, horaInicio: '12:00' });
ok(r.status === 200 && db.turnos[0].fecha === domingo, `y a un domingo (día que no trabaja): el servidor lo permite (${domingo})`);
process.exit(0);
