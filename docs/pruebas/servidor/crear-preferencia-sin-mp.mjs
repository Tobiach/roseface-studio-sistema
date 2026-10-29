// Circuito "no tengo Mercado Pago" (29/10/2026): una clienta de Mili/Roma
// transfiere a la cuenta de Rose Face del día en vez de pagar por MP.
// circuitoPago del turno tiene que seguir siendo "mercado_pago" (define la
// comisión) aunque el pago haya sido por transferencia.
process.env.VITE_SUPABASE_URL = 'http://fake';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';
const { db } = await import('./fake-supabase.mjs');
const { default: crearPreferencia } = await import('./crear-preferencia.mjs');

let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };

// Próximo jueves y sábado, bien lejos de "ahora" (no hardcodear una fecha
// fija: el test puede correr cualquier día real) — getDay(): 0=domingo..6=sábado.
function proximoDia(diaBuscado) {
  const hoy = new Date(Date.now() - 3 * 3600_000); // Argentina, mismo criterio que el endpoint
  let dias = (diaBuscado - hoy.getDay() + 7) % 7;
  if (dias < 2) dias += 7; // que quede claramente en el futuro, no "hoy a una hora que ya pasó"
  const fecha = new Date(hoy.getTime() + dias * 86400_000);
  return fecha.toISOString().slice(0, 10);
}
const proximoJueves = proximoDia(4);
const proximoSabado = proximoDia(6);
const llamar = (body) => new Promise((resolve) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(o) { resolve({ status: this.statusCode, body: o }); return this; } };
  crearPreferencia({ method: 'POST', headers: {}, body, socket: {} }, res);
});

function reset() {
  db.servicios = [
    { id: 's-clasica', nombre: 'Clásicas', categoria: 'Pestañas', precio: 41500, duracion_minutos: 90, profesionales_que_lo_realizan: ['prof-mili'], requiere_sena: true },
  ];
  db.profesionales = [
    {
      id: 'prof-mili',
      nombre: 'Mili',
      modelo_comision: { tipo: 'porcentaje', porcentajeProfesional: 55 },
      alias_cbu: null,
      // jueves 29/10/2026 — sin horarios fijos, cualquier hora entre 09 y 19.
      horario_disponible: { jueves: { desde: '09:00', hasta: '19:00' } },
    },
  ];
  db.turnos = [];
  db.clientas = [];
}
const turno = (id) => db.turnos.find((t) => String(t.id) === String(id));
let r;

// ---------- 1) Sin medioPago: circuito normal de Mercado Pago (sin MP_ACCESS_TOKEN -> 500, como siempre)
reset();
delete process.env.MP_ACCESS_TOKEN;
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: proximoJueves, hora: '14:00', horaFin: '15:30', clienta: { nombre: 'Ana Pérez', telefono: '1127696736' } });
ok(r.status === 500 && /MP_ACCESS_TOKEN/.test(r.body.error), `sin medioPago y sin token de MP -> 500 pidiendo MP_ACCESS_TOKEN, no rompió nada (${r.status}, ${r.body.error})`);
ok((db.turnos ?? []).length === 0, '... y no se creó ningún turno (no llegó a pasar la validación del token de MP)');

// ---------- 2) Con medioPago=transferencia_estudio: NO hace falta MP_ACCESS_TOKEN
reset();
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: proximoJueves, hora: '14:00', horaFin: '15:30', clienta: { nombre: 'Ana Pérez', telefono: '1127696736' }, medioPago: 'transferencia_estudio' });
ok(r.status === 200 && r.body.circuito === 'transferencia', `con medioPago=transferencia_estudio -> 200, circuito "transferencia" en la respuesta (${r.status}, ${r.body.circuito})`);
ok(r.body.circuitoPago === 'mercado_pago', `pero circuitoPago real del turno sigue "mercado_pago" (define la comisión) (${r.body.circuitoPago})`);
ok(r.body.banco === 'Banco Lemon' && r.body.aliasCbu === 'alemonaca.LEMON' && r.body.cbu === '0000168300000020305972', `jueves -> cuenta de Lemon, la correcta para ese día (${r.body.banco}, ${r.body.aliasCbu})`);
ok(r.body.titular === 'Alejandro José Hernández Monaca', `titular real de la cuenta de Lemon (${r.body.titular})`);

const t = turno(r.body.turnoId);
ok(!!t && t.circuito_pago === 'mercado_pago', `el turno insertado en la base también tiene circuito_pago "mercado_pago" (${t?.circuito_pago})`);
ok(t.estado === 'reservado' && t.monto_total === 41500 && t.monto_sena === 30000, `turno creado reservado con el monto correcto (estado ${t.estado}, total ${t.monto_total}, seña ${t.monto_sena})`);
const minutosHold = Math.round((new Date(t.expira_en).getTime() - Date.now()) / 60000);
ok(minutosHold >= 58 && minutosHold <= 61, `el hold es el largo (60 min, como transferencia), no el corto de MP (13 min) — da ${minutosHold} min`);

// ---------- 3) Otro día de la semana -> otra cuenta (sábado -> Santander)
reset();
db.profesionales[0].horario_disponible.sabado = { desde: '09:00', hasta: '14:00' };
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: proximoSabado, hora: '10:00', horaFin: '11:30', clienta: { nombre: 'Bea Gómez' }, medioPago: 'transferencia_estudio' });
ok(r.status === 200 && r.body.banco === 'Banco Santander' && r.body.cbu === '0720480188000002712640', `sábado -> cuenta de Santander (${r.status}, ${r.body.banco})`);

// ---------- 4) El circuito de transferencia (alquiler fijo) sigue igual, sin tocar — regresión
reset();
db.profesionales.push({
  id: 'prof-ari',
  nombre: 'Ari',
  modelo_comision: { tipo: 'alquiler_fijo', montoSemanal: 52500 },
  alias_cbu: 'ari.alias.mp',
  horario_disponible: { jueves: { desde: '09:00', hasta: '19:00' } },
});
db.servicios.push({ id: 's-unas', nombre: 'Uñas', categoria: 'Uñas', precio: 30000, duracion_minutos: 60, profesionales_que_lo_realizan: ['prof-ari'], requiere_sena: true });
r = await llamar({ servicioId: 's-unas', profesionalId: 'prof-ari', fecha: proximoJueves, hora: '15:00', horaFin: '16:00', clienta: { nombre: 'Cami Ruiz' } });
ok(r.status === 200 && r.body.circuito === 'transferencia' && r.body.circuitoPago === 'transferencia' && r.body.aliasCbu === 'ari.alias.mp', `Ari (alquiler fijo) sigue igual: su propio alias, circuitoPago "transferencia" (${r.status}, ${r.body.aliasCbu}, ${r.body.circuitoPago})`);

console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
