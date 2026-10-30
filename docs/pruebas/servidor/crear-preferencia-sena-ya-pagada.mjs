// "Agregar otro turno" sin pedir la seña de nuevo (30/10/2026): solo si el
// turno "ancla" que manda el navegador es verificable server-side — mismo
// día, nombre y teléfono coinciden con la clienta de esa reserva, y esa
// reserva ya tiene la seña confirmada (no 'reservado' ni 'cancelado').
process.env.VITE_SUPABASE_URL = 'http://fake';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';
const { db } = await import('./fake-supabase.mjs');
const { default: crearPreferencia } = await import('./crear-preferencia.mjs');

let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };
const llamar = (body) => new Promise((resolve) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(o) { resolve({ status: this.statusCode, body: o }); return this; } };
  crearPreferencia({ method: 'POST', headers: {}, body, socket: {} }, res);
});

// Próximo jueves, bien lejos de "ahora" (no hardcodear: el test puede correr cualquier día real).
function proximoDia(diaBuscado) {
  const hoy = new Date(Date.now() - 3 * 3600_000);
  let dias = (diaBuscado - hoy.getDay() + 7) % 7;
  if (dias < 2) dias += 7;
  return new Date(hoy.getTime() + dias * 86400_000).toISOString().slice(0, 10);
}
const proximoJueves = proximoDia(4);
const unaSemanaDespues = new Date(new Date(proximoJueves + 'T12:00:00').getTime() + 7 * 86400_000).toISOString().slice(0, 10);

function reset() {
  db.servicios = [
    { id: 's-clasica', nombre: 'Clásicas', categoria: 'Pestañas', precio: 41500, duracion_minutos: 90, profesionales_que_lo_realizan: ['prof-mili'], requiere_sena: true },
    { id: 's-unas', nombre: 'Uñas', categoria: 'Uñas', precio: 30000, duracion_minutos: 60, profesionales_que_lo_realizan: ['prof-ari'], requiere_sena: true },
  ];
  db.profesionales = [
    { id: 'prof-mili', nombre: 'Mili', modelo_comision: { tipo: 'porcentaje', porcentajeProfesional: 55 }, alias_cbu: null, horario_disponible: { jueves: { desde: '09:00', hasta: '19:00' } } },
    { id: 'prof-ari', nombre: 'Ari', modelo_comision: { tipo: 'alquiler_fijo', montoSemanal: 52500 }, alias_cbu: 'ari.alias.mp', horario_disponible: { jueves: { desde: '09:00', hasta: '19:00' } } },
  ];
  db.clientas = [{ id: 'c1', nombre: 'Ana Pérez', telefono: '1127696736', email: null }];
  db.turnos = [
    // 1: de Ana, YA con la seña confirmada, jueves -> ancla válida
    { id: 1, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: proximoJueves, hora_inicio: '10:00', hora_fin: '11:30', estado: 'sena_confirmada', monto_total: 41500, monto_sena: 30000, origen_reserva: 'web', circuito_pago: 'mercado_pago' },
    // 2: de Ana, TODAVÍA reservado (sin pagar) -> no sirve como ancla
    { id: 2, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: proximoJueves, hora_inicio: '12:00', hora_fin: '13:30', estado: 'reservado', monto_total: 41500, monto_sena: 30000, origen_reserva: 'web', circuito_pago: 'mercado_pago' },
    // 3: de Ana, cancelado -> no sirve
    { id: 3, clienta_id: 'c1', profesional_id: 'prof-mili', servicio_id: 's-clasica', fecha: proximoJueves, hora_inicio: '14:00', hora_fin: '15:30', estado: 'cancelado', monto_total: 41500, monto_sena: 30000, origen_reserva: 'web', circuito_pago: 'mercado_pago' },
  ];
}
const turno = (id) => db.turnos.find((t) => String(t.id) === String(id));
let r;

// ---------- 1) Ancla válida -> no pide seña, turno queda confirmado directo
reset();
r = await llamar({ servicioId: 's-unas', profesionalId: 'prof-ari', fecha: proximoJueves, hora: '16:00', horaFin: '17:00', clienta: { nombre: 'Ana Pérez', telefono: '1127696736' }, turnoAnclaId: '1' });
ok(r.status === 200 && r.body.circuito === 'confirmado_sin_sena', `ancla válida -> 200, circuito "confirmado_sin_sena" (${r.status}, ${r.body.circuito})`);
ok(r.body.montoSena === '0', `la seña en la respuesta es $0 (${r.body.montoSena})`);
const t1 = turno(r.body.turnoId);
ok(!!t1 && t1.estado === 'sena_confirmada' && t1.monto_sena === 0, `el turno en la base queda sena_confirmada con monto_sena 0 (${t1?.estado}, ${t1?.monto_sena})`);
ok(t1.monto_total === 30000, `el total del servicio nuevo no se toca (${t1.monto_total})`);
ok(/sin se.a: ya pag/i.test(t1.notas_internas), `queda anotado por qué no se cobró seña (${t1.notas_internas})`);

// ---------- 2) Ancla todavía "reservado" (sin pagar) -> NO se le cree, pide seña como siempre
reset();
delete process.env.MP_ACCESS_TOKEN;
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: proximoJueves, hora: '16:00', horaFin: '17:30', clienta: { nombre: 'Ana Pérez', telefono: '1127696736' }, turnoAnclaId: '2' });
ok(r.status === 500 && /MP_ACCESS_TOKEN/.test(r.body.error), `ancla sin pagar -> no se le cree, sigue pidiendo MP como cualquier reserva nueva (${r.status}, ${r.body.error})`);

// ---------- 3) Ancla cancelada -> tampoco sirve
reset();
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: proximoJueves, hora: '16:00', horaFin: '17:30', clienta: { nombre: 'Ana Pérez', telefono: '1127696736' }, turnoAnclaId: '3' });
ok(r.status === 500 && /MP_ACCESS_TOKEN/.test(r.body.error), `ancla cancelada -> no sirve, pide seña (${r.status})`);

// ---------- 4) Ancla válida pero OTRO día -> no sirve (no es "la misma visita")
reset();
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: unaSemanaDespues, hora: '16:00', horaFin: '17:30', clienta: { nombre: 'Ana Pérez', telefono: '1127696736' }, turnoAnclaId: '1' });
ok(r.status === 500 && /MP_ACCESS_TOKEN/.test(r.body.error), `mismo nombre/teléfono pero OTRO día -> no vale, pide seña (${r.status})`);

// ---------- 5) Ancla válida pero el NOMBRE no coincide -> no sirve
reset();
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: proximoJueves, hora: '16:00', horaFin: '17:30', clienta: { nombre: 'Otra Persona', telefono: '1127696736' }, turnoAnclaId: '1' });
ok(r.status === 500 && /MP_ACCESS_TOKEN/.test(r.body.error), `nombre distinto -> no vale, pide seña (${r.status})`);

// ---------- 6) Ancla válida pero el TELÉFONO no coincide -> no sirve
reset();
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: proximoJueves, hora: '16:00', horaFin: '17:30', clienta: { nombre: 'Ana Pérez', telefono: '1159998888' }, turnoAnclaId: '1' });
ok(r.status === 500 && /MP_ACCESS_TOKEN/.test(r.body.error), `teléfono distinto -> no vale, pide seña (${r.status})`);

// ---------- 7) Id de ancla inventado/inexistente -> no rompe nada, sigue el camino normal
reset();
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: proximoJueves, hora: '16:00', horaFin: '17:30', clienta: { nombre: 'Ana Pérez', telefono: '1127696736' }, turnoAnclaId: '999999' });
ok(r.status === 500 && /MP_ACCESS_TOKEN/.test(r.body.error), `turnoAnclaId que no existe -> no rompe, pide seña como siempre (${r.status})`);

// ---------- 8) Funciona igual si el 2º servicio es del circuito transferencia (Ari) -> ya cubierto en el test 1 (prof-ari)
// ---------- 9) Encadenar: el 2º turno (ya confirmado sin seña) sirve de ancla para un 3º
reset();
r = await llamar({ servicioId: 's-unas', profesionalId: 'prof-ari', fecha: proximoJueves, hora: '16:00', horaFin: '17:00', clienta: { nombre: 'Ana Pérez', telefono: '1127696736' }, turnoAnclaId: '1' });
const segundoTurnoId = r.body.turnoId;
r = await llamar({ servicioId: 's-clasica', profesionalId: 'prof-mili', fecha: proximoJueves, hora: '18:00', horaFin: '19:30', clienta: { nombre: 'Ana Pérez', telefono: '1127696736' }, turnoAnclaId: segundoTurnoId });
ok(r.status === 200 && r.body.circuito === 'confirmado_sin_sena', `un 3er turno encadenado al 2º (que ya quedó confirmado sin seña) también funciona (${r.status}, ${r.body.circuito})`);

console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
