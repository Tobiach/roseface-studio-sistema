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
const ayer = new Date(Date.now() - 27 * 3600_000).toISOString().slice(0, 10);
const base = { servicio_id: 's-clasica', hora_inicio: '09:00:00', hora_fin: '10:30:00', monto_total: 41500, monto_sena: 30000, servicios_extra: [], notas_internas: null, id_transaccion_mp: null, aprobado_por_profesional: false };
function reset() {
  db.servicios = [{ id: 's-clasica', nombre: 'Clásicas', categoria: 'Pestañas', precio: 41500, duracion_minutos: 90, profesionales_que_lo_realizan: ['prof-mili'] }];
  db.profesionales = [{ id: 'prof-mili', nombre: 'Mili' }, { id: 'prof-yosy', nombre: 'Yosy' }];
  db.clientas = [
    { id: 'c1', nombre: 'Ana Pérez', telefono: '1127696736', email: null },
    { id: 'c2', nombre: 'Bea Gómez', telefono: '', email: 'bea@mail.com' },
    { id: 'c3', nombre: 'Cami Ruiz', telefono: '1153690865', email: null },
  ];
  db.turnos = [
    { ...base, id: 1, clienta_id: 'c1', profesional_id: 'prof-mili', fecha: hoy, estado: 'completado', origen_reserva: 'manual' },
    { ...base, id: 2, clienta_id: 'c2', profesional_id: 'prof-mili', fecha: ayer, hora_inicio: '11:00:00', estado: 'completado', origen_reserva: 'manual' },
    { ...base, id: 3, clienta_id: 'c3', profesional_id: 'prof-mili', fecha: hoy, hora_inicio: '13:00:00', estado: 'completado', origen_reserva: 'web', id_transaccion_mp: '555' },
    { ...base, id: 4, clienta_id: 'c1', profesional_id: 'prof-mili', fecha: hoy, hora_inicio: '15:00:00', estado: 'completado', origen_reserva: 'manual', aprobado_por_profesional: true },
    { ...base, id: 5, clienta_id: 'c3', profesional_id: 'prof-yosy', fecha: hoy, hora_inicio: '17:00:00', estado: 'reservado', origen_reserva: 'manual' },
  ];
}
const turno = (id) => db.turnos.find((t) => t.id === id);
const clienta = (id) => db.clientas.find((c) => c.id === id);
let r;

// ---------- DESHACER "VINO"
reset();
r = await llamar({ authorization: MILI }, { turnoId: 5, accion: 'reabrir' }); ok(r.status === 403, `profesional sobre turno ajeno -> 403 (${r.status})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 5, accion: 'reabrir' }); ok(r.status === 400 && /no está completado/.test(r.body.error), `turno que no está completado -> 400 (${r.body.error})`);
r = await llamar({ authorization: MILI }, { turnoId: 2, accion: 'reabrir' }); ok(r.status === 403 && /otro día/.test(r.body.error), `profesional deshaciendo uno de AYER -> 403 (${r.body.error})`);
ok(turno(2).estado === 'completado', '... y el turno de ayer sigue completado');
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'reabrir' });
ok(r.status === 200 && turno(1).estado === 'reservado', `profesional deshace el "Vino" de HOY: turno manual vuelve a reservado (${turno(1).estado})`);
ok(/Mili\] Se deshizo el "Vino"/.test(turno(1).notas_internas), 'queda anotado quién lo deshizo');
r = await llamar({ authorization: MILI }, { turnoId: 3, accion: 'reabrir' });
ok(r.status === 200 && turno(3).estado === 'sena_confirmada', `turno del sitio (pago verificado) vuelve a seña confirmada (${turno(3).estado})`);
r = await llamar({ authorization: MILI }, { turnoId: 4, accion: 'reabrir' });
ok(r.status === 200 && turno(4).estado === 'sena_confirmada', `manual con la seña registrada vuelve a seña confirmada (${turno(4).estado})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 2, accion: 'reabrir' });
ok(r.status === 200 && turno(2).estado === 'reservado', `Yosy deshace el de ayer (${r.status})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 2, accion: 'reabrir' }); ok(r.status === 400, `deshacer dos veces -> 400 (${r.status})`);

// ---------- DATOS DE LA CLIENTA
reset();
r = await llamar({}, { turnoId: 1, accion: 'clienta', cliente: { nombre: 'X' } }); ok(r.status === 401, `sin token -> 401 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 5, accion: 'clienta', cliente: { telefono: '1155551234' } }); ok(r.status === 403, `profesional sobre clienta de turno ajeno -> 403 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'clienta', cliente: {} }); ok(r.status === 400 && /nada para cambiar/.test(r.body.error), `sin cambios -> 400 (${r.body.error})`);
// Formato de teléfono se prueba con ADMIN: desde el 29/10 una profesional nunca llega a esa
// validación — cualquier teléfono que mande (c1 con uno cargado, o c2 que todavía no tiene)
// rebota 403 antes, sin excepción para completar uno vacío (la única que había hasta el 25/10).
r = await llamar({ authorization: ADMIN }, { turnoId: 2, accion: 'clienta', cliente: { telefono: '12345' } }); ok(r.status === 400, `teléfono muy corto -> 400 (${r.status})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 2, accion: 'clienta', cliente: { telefono: 'llamar a la tarde' } }); ok(r.status === 400, `teléfono con letras -> 400 (${r.status})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 2, accion: 'clienta', cliente: { telefono: '1'.repeat(20) } }); ok(r.status === 400, `teléfono larguísimo -> 400 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'clienta', cliente: { telefono: '' } }); ok(r.status === 403 && /Solo Yosy/.test(r.body.error), `profesional vaciando un teléfono YA cargado -> 403 (${r.status}, ${r.body.error})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'clienta', cliente: { telefono: '011 15 2769-6736' } }); ok(r.status === 403 && /Solo Yosy/.test(r.body.error), `profesional cambiando un teléfono YA cargado -> 403 (${r.status}, ${r.body.error})`);
r = await llamar({ authorization: MILI }, { turnoId: 2, accion: 'clienta', cliente: { telefono: '1153690865' } }); ok(r.status === 403 && /Solo Yosy/.test(r.body.error), `profesional completando un teléfono VACÍO -> 403, ya no hay excepción (${r.status}, ${r.body.error})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'clienta', cliente: { nombre: 'A' } }); ok(r.status === 400, `nombre de 1 letra -> 400 (${r.status})`);
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'clienta', cliente: { email: 'esto-no-es-un-mail' } }); ok(r.status === 400, `mail inválido -> 400 (${r.status})`);
ok(clienta('c1').telefono === '1127696736' && clienta('c2').telefono === '', 'ninguno de los rechazos modificó a ninguna clienta');
r = await llamar({ authorization: MILI }, { turnoId: 1, accion: 'clienta', cliente: { nombre: '  Ana   María  Pérez ', email: 'ana@mail.com' } });
ok(r.status === 200 && clienta('c1').nombre === 'Ana María Pérez' && clienta('c1').telefono === '1127696736' && clienta('c1').email === 'ana@mail.com', `profesional corrige nombre y mail, SIN tocar el teléfono (${clienta('c1').nombre} / ${clienta('c1').telefono} / ${clienta('c1').email})`);
ok(r.body.clienta?.id === 'c1', 'devuelve la clienta ya guardada (para refrescar la pantalla)');
ok(/Mili\] Corrigió datos de la clienta: nombre Ana Pérez → Ana María Pérez; mail actualizado/.test(turno(1).notas_internas), 'queda anotado en el turno, sin mención al teléfono');
r = await llamar({ authorization: ADMIN }, { turnoId: 2, accion: 'clienta', cliente: { telefono: '1153690865' } });
ok(r.status === 200 && (r.body.advertencias ?? []).some((a) => /Cami Ruiz/.test(a)), `Yosy completa el teléfono vacío de c2: guarda y avisa que ya lo tiene otra clienta (${(r.body.advertencias ?? []).join(' ')})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 1, accion: 'clienta', cliente: { telefono: '011 15 2769-6736' } });
ok(r.status === 200 && clienta('c1').telefono === '011 15 2769-6736', `Yosy sí puede cambiar un teléfono ya cargado (${clienta('c1').telefono})`);
r = await llamar({ authorization: ADMIN }, { turnoId: 1, accion: 'clienta', cliente: { telefono: '', email: '' } });
ok(r.status === 200 && clienta('c1').telefono === '' && clienta('c1').email === null, 'Yosy sí puede vaciar teléfono y mail');
