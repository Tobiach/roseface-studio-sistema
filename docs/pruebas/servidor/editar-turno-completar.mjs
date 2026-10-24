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
const ADMIN = token('admin', null), MILI = token('profesional', 'prof-mili');
const llamar = (headers, body) => new Promise((resolve) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(o) { resolve({ status: this.statusCode, body: o }); return this; } };
  editar({ method: 'POST', headers, body }, res);
});
const hoy = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const base = { hora_inicio: '09:00:00', hora_fin: '10:30:00', notas_internas: null, id_transaccion_mp: null, aprobado_por_profesional: false, origen_reserva: 'manual' };
function reset() {
  db.servicios = [
    { id: 's-clasica', nombre: 'Clásicas', categoria: 'Pestañas', precio: 41500, duracion_minutos: 90, profesionales_que_lo_realizan: ['prof-mili'] },
    { id: 's-hibridas', nombre: 'Híbridas', categoria: 'Pestañas', precio: 42000, duracion_minutos: 100, profesionales_que_lo_realizan: ['prof-mili'] },
    { id: 's-unas', nombre: 'Uñas esculpidas', categoria: 'Uñas', precio: 46000, duracion_minutos: 90, profesionales_que_lo_realizan: ['prof-ari'] },
  ];
  db.profesionales = [{ id: 'prof-mili', nombre: 'Mili' }, { id: 'prof-yosy', nombre: 'Yosy' }];
  db.clientas = [{ id: 'c1', nombre: 'Ana Pérez', telefono: '1127696736', email: null }];
  db.clientas_recurrentes_estado = [];
  const hora = (h) => ({ hora_inicio: `${h}:00:00`, hora_fin: `${h + 1}:30:00` });
  db.turnos = [
    // 1: reservado, sin extras -> confirmar "Vino" sin cambiar nada
    { ...base, ...hora(9), id: 1, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: hoy, estado: 'reservado', monto_total: 41500, monto_sena: 30000, servicios_extra: [] },
    // 2: reservado -> confirmar cambiando el servicio principal (reservó Clásicas, se hizo Híbridas)
    { ...base, ...hora(10), id: 2, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: hoy, estado: 'reservado', monto_total: 41500, monto_sena: 30000, servicios_extra: [] },
    // 3: reservado -> confirmar sumando un extra
    { ...base, ...hora(11), id: 3, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: hoy, estado: 'reservado', monto_total: 41500, monto_sena: 30000, servicios_extra: [] },
    // 4: YA completado -> Mili intenta editar el servicio (debe rebotar, solo Yosy)
    { ...base, ...hora(12), id: 4, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: hoy, estado: 'completado', monto_total: 41500, monto_sena: 30000, servicios_extra: [] },
    // 5: YA completado, con un extra previo de $5000 -> Yosy cambia el servicio principal (el extra se conserva)
    { ...base, ...hora(13), id: 5, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: hoy, estado: 'completado', monto_total: 46500, monto_sena: 30000, servicios_extra: [{ nombre: 'Retoque', precio: 5000, servicioId: null }] },
    // 6: turno de prof-mili, intenta cambiar a un servicio que NO hace (uñas)
    { ...base, ...hora(14), id: 6, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: hoy, estado: 'reservado', monto_total: 41500, monto_sena: 30000, servicios_extra: [] },
    // 7: cancelado -> no se puede confirmar
    { ...base, ...hora(15), id: 7, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: hoy, estado: 'cancelado', monto_total: 41500, monto_sena: 30000, servicios_extra: [] },
  ];
}
const turno = (id) => db.turnos.find((t) => t.id === id);
let r;

reset();

// ---------- 1) Confirmar "Vino" sin cambios
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'completar' });
ok(r.status === 200 && turno(1).estado === 'completado' && turno(1).monto_total === 41500, `Confirmar sin cambios: completado, total intacto (${r.status}, ${turno(1).monto_total})`);
ok(/Confirmó que la clienta vino/.test(turno(1).notas_internas), 'queda anotado en notas_internas');

// ---------- 2) Confirmar cambiando el servicio PRINCIPAL
r = await llamar({ authorization: MILI }, { turnoId: 2, accion: 'completar', servicioId: 's-hibridas' });
ok(r.status === 200 && turno(2).estado === 'completado' && turno(2).servicio_id === 's-hibridas' && turno(2).monto_total === 42000, `Cambia el servicio principal: Híbridas, total recalculado a $42.000 (${r.status}, ${turno(2).servicio_id}, ${turno(2).monto_total})`);
ok(turno(2).monto_sena === 30000, `La seña YA cobrada no se toca (${turno(2).monto_sena})`);
ok(/Clásicas → Híbridas/.test(turno(2).notas_internas), `queda anotado el cambio de servicio (${turno(2).notas_internas})`);

// ---------- 3) Confirmar sumando un extra (sin cambiar el principal)
r = await llamar({ authorization: MILI }, { turnoId: 3, accion: 'completar', serviciosExtra: [{ nombre: 'Retoque de cejas', precio: 8000 }] });
ok(r.status === 200 && turno(3).estado === 'completado' && turno(3).monto_total === 49500, `Suma un extra de $8.000 al total (${turno(3).monto_total})`);

// ---------- 4) Turno YA completado: una profesional NO puede tocar el servicio
r = await llamar({ authorization: MILI }, { turnoId: 4, accion: 'completar', servicioId: 's-hibridas' });
ok(r.status === 403 && /Solo Yosy/.test(r.body.error), `Profesional sobre turno ya completado -> 403 (${r.status}, ${r.body.error})`);
ok(turno(4).servicio_id === 's-clasica', '... y el servicio no cambió');

// ---------- 5) Turno YA completado: Yosy SÍ puede, y el extra previo se conserva
r = await llamar({ authorization: ADMIN }, { turnoId: 5, accion: 'completar', servicioId: 's-hibridas' });
ok(r.status === 200 && turno(5).servicio_id === 's-hibridas' && turno(5).monto_total === 47000, `Yosy cambia el servicio de un turno completado: 42.000 + 5.000 de extra = 47.000 (${r.status}, ${turno(5).monto_total})`);
ok(turno(5).servicios_extra.length === 1 && turno(5).servicios_extra[0].nombre === 'Retoque', 'el extra previo se conserva intacto');

// ---------- 6) Servicio que la profesional no realiza
r = await llamar({ authorization: MILI }, { turnoId: 6, accion: 'completar', servicioId: 's-unas' });
ok(r.status === 400 && /no realiza/.test(r.body.error), `Servicio que Mili no hace -> 400 (${r.status}, ${r.body.error})`);

// ---------- 7) Turno cancelado
r = await llamar({ authorization: MILI }, { turnoId: 7, accion: 'completar' });
ok(r.status === 400 && /cancelado/.test(r.body.error), `Turno cancelado -> 400 (${r.status}, ${r.body.error})`);

// ---------- 8) Sin token
r = await llamar({}, { turnoId: 1, accion: 'completar' });
ok(r.status === 401, `Sin token -> 401 (${r.status})`);

// ---------- 9) Extras inválidos
reset();
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'completar', serviciosExtra: [{ nombre: '', precio: 100 }] });
ok(r.status === 400 && /no son válidos/.test(r.body.error), `Extra sin nombre -> 400 (${r.status}, ${r.body.error})`);
