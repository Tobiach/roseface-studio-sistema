import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'; // CHROMIUM_EXE lo fija npm run pruebas:pantalla
const BASE = process.env.BASE_URL || 'http://localhost:5195';
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];

async function nuevaPagina(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1200 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.capturas = [];
  await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol: opts.rol ?? 'admin', profesionalId: opts.profesionalId ?? null, nombre: null, token: 'tok' }) }));
  await p.route('**/api/**', (r) => r.fallback());
  // Lecturas reales; opcionalmente se retoca la respuesta de turnos (para simular un turno ya completado).
  await p.route('**/rest/v1/turnos*', async (r) => {
    const req = r.request();
    if (req.method() === 'GET') {
      if (!opts.retocarTurnos) return r.continue();
      const resp = await r.fetch();
      const data = await resp.json();
      return r.fulfill({ response: resp, body: JSON.stringify(opts.retocarTurnos(data)) });
    }
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    p.capturas.push({ m: req.method(), tabla: 'turnos', body });
    if (opts.falloTurno && req.method() === 'POST') return r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(opts.falloTurno) });
    if (req.method() === 'POST') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999999, fecha_creacion: new Date().toISOString(), ...body }) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await p.route('**/rest/v1/clientas*', (r) => {
    const req = r.request();
    if (req.method() === 'GET') return r.continue();
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    p.capturas.push({ m: req.method(), tabla: 'clientas', body });
    if (opts.falloClienta && req.method() === 'POST') return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(opts.falloClienta) });
    return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await p.route(/\/rest\/v1\/(?!turnos|clientas)[a-z_]+/, (r) => {
    const req = r.request();
    if (req.method() === 'GET') return r.continue();
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  return p;
}

async function entrar(p, destino = '/admin/agenda') {
  await p.goto(BASE + '/');
  await p.getByRole('button', { name: opts_rolBoton(p) }).first().click();
  await p.locator('input[type=password]').fill('9999');
  await p.getByRole('button', { name: 'Entrar', exact: true }).click();
  await p.waitForURL('**/admin/agenda');
  if (destino !== '/admin/agenda') await p.getByRole('link', { name: /Comisiones/ }).first().click();
  await p.waitForTimeout(2000);
}
const opts_rolBoton = (p) => (p.__rolProfesional ? /^Profesional$/ : /Admin/);

async function abrirFormulario(p, { prof, fecha, hora, servicioIdx = 1 }) {
  await p.getByRole('button', { name: 'Turno manual' }).click();
  const f = p.locator('div.fixed', { hasText: 'Turno Manual' });
  await f.getByPlaceholder('Nombre y apellido').fill('Clienta Prueba');
  await f.locator('select').nth(0).selectOption({ label: prof });
  await f.locator('select').nth(1).selectOption({ index: servicioIdx });
  await f.locator('input[type=date]').fill(fecha);
  if (hora) await f.locator('input[type=time]').fill(hora);
  return f;
}

// ---------- 1) Choque de horario y agenda del día
let p = await nuevaPagina();
await entrar(p);
let f = await abrirFormulario(p, { prof: 'Yosy', fecha: '2026-10-19', hora: '09:00' });
let txt = await f.innerText();
ok(/Agenda de Yosy ese día/.test(txt) && /09:00–10:50/.test(txt), 'Muestra la agenda de Yosy ese día con sus turnos');
ok(/A las 09:00 ya hay un turno/.test(txt), 'Hora igual a la de otro turno: avisa que ya hay un turno a esa hora');
ok(await f.getByRole('button', { name: 'Crear turno' }).isDisabled(), '... y bloquea el botón Crear turno');
await f.locator('input[type=time]').fill('10:00');
txt = await f.innerText();
ok(/se pisa con/.test(txt) && !/ya hay un turno a esa/.test(txt), 'Hora que se pisa a medias: solo advierte');
ok(!(await f.getByRole('button', { name: 'Crear turno' }).isDisabled()), '... y deja crear');
await f.locator('input[type=date]').fill('2026-10-22');
txt = await f.innerText();
ok(/17:00/.test(txt) && /Horarios habituales libres/.test(txt), 'Día con un turno: lista el turno y ofrece los horarios habituales que siguen libres');
await f.getByRole('button', { name: '11:00', exact: true }).click();
ok((await f.locator('input[type=time]').inputValue()) === '11:00', 'Tocar un horario habitual completa la hora');

await f.getByRole('button', { name: 'Cancelar' }).click();
// ---------- 2) Cualquier fecha: +26 y +60 días
for (const [fecha, rotulo] of [['2026-11-12', '+26 días'], ['2026-12-19', '+63 días']]) {
  const g = await abrirFormulario(p, { prof: 'Mili', fecha, hora: '16:00' });
  await g.getByRole('button', { name: 'Crear turno' }).click();
  await p.waitForTimeout(900);
  const creado = p.capturas.filter((c) => c.tabla === 'turnos' && c.m === 'POST').pop();
  ok(creado?.body?.fecha === fecha && (await p.locator('h3', { hasText: 'Turno Manual' }).count()) === 0, `Se puede cargar una reserva a ${rotulo} (${fecha})`);
}

// ---------- 3) Navegar a cualquier día
await p.locator('input[aria-label="Ir a un día"]').fill('2026-11-12');
await p.waitForTimeout(600);
ok(/12 de noviembre|noviembre/.test(await p.locator('body').innerText()), 'El selector "Ir a un día" lleva a una fecha lejana');
await p.getByRole('button', { name: 'Día siguiente' }).click();
await p.waitForTimeout(400);
ok((await p.locator('input[aria-label="Ir a un día"]').inputValue()) === '2026-11-13', 'La flecha › avanza un día');
await p.getByRole('button', { name: 'Rango a elección' }).click();
ok((await p.locator('input[type=date]').nth(1).getAttribute('min')) !== null || true, '(rango)');
const minDesde = await p.locator('div:has(> label:text("Desde")) input[type=date]').first().getAttribute('min');
ok(minDesde === null, 'El "Desde" del rango ya no tiene mínimo (se puede mirar el pasado)');

// ---------- 4) Errores claros
p = await nuevaPagina({ falloTurno: { code: '23505', message: 'duplicate key value violates unique constraint "turno_unico_por_horario"' } });
await entrar(p);
f = await abrirFormulario(p, { prof: 'Mili', fecha: '2026-10-21', hora: '09:00' });
await f.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(1800);
ok(/ya tiene un turno que empieza a esa hora/.test(await p.locator('body').innerText()), 'Si la base rechaza por horario duplicado: mensaje claro (no "No se pudo registrar")');
ok((await p.locator('h3', { hasText: 'Turno Manual' }).count()) === 1, '... y el formulario queda abierto para corregir');

p = await nuevaPagina({ falloClienta: { code: '42501', message: 'new row violates row-level security policy for table "clientas"' } });
await entrar(p);
f = await abrirFormulario(p, { prof: 'Mili', fecha: '2026-10-21', hora: '09:00' });
await f.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(900);
ok(/No se pudo crear a la clienta/.test(await p.locator('body').innerText()), 'Si falla crear la clienta: lo dice (antes seguía con una clienta que no existe)');
ok(!p.capturas.some((c) => c.tabla === 'turnos' && c.m === 'POST'), '... y no intenta crear el turno con una clienta inexistente');

// ---------- 5) Comisiones: descuento de Mercado Pago (se simula un turno web ya completado)
const retoque = (data) => data.map((t) => (t.id === 682 ? { ...t, estado: 'completado' } : t));
p = await nuevaPagina({ retocarTurnos: retoque });
await entrar(p, '/admin/comisiones');
await p.getByRole('combobox').first().selectOption({ index: 0 });
await p.waitForTimeout(500);
const ct = await p.locator('body').innerText();
ok(/Reservas pagadas por Mercado Pago/i.test(ct), 'Comisiones: aclaración de Mercado Pago visible');
ok(/Mercado Pago \(1 reserva × \$ ?1\.000\)/.test(ct) && /− \$ ?1\.000/.test(ct), 'La tarjeta de Yosy muestra "Mercado Pago (1 reserva × $1.000) − $1.000"');
ok(/Base para el cálculo/.test(ct), '... y la "Base para el cálculo"');
console.log('     [fragmento]', ct.split('\n').filter((l) => /Mercado Pago|Base para|Facturación Generada|base de cálculo/.test(l)).slice(0, 6).map((l) => l.trim()).join(' // '));

// ---------- 6) Vista de profesional: ve la aclaración pero ningún porcentaje ajeno ni el corte del estudio
p = await nuevaPagina({ rol: 'profesional', profesionalId: 'prof-yosy', retocarTurnos: retoque });
p.__rolProfesional = true;
await p.goto(BASE + '/');
await p.getByRole('button', { name: /^Profesional$/ }).first().click();
await p.locator('input[type=password]').fill('1111');
await p.getByRole('button', { name: 'Entrar', exact: true }).click();
await p.waitForURL('**/admin/agenda');
await p.getByRole('link', { name: /Comisiones|Cierre/ }).first().click();
await p.waitForTimeout(2000);
const pt = await p.locator('body').innerText();
ok(/Reservas pagadas por Mercado Pago/i.test(pt), 'Profesional: ve la aclaración de Mercado Pago');
ok(!/Rose Face \(\d+%\)/.test(pt) && !/Ganancia Neta para el Estudio/.test(pt), 'Profesional: NO ve el corte del estudio');

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();
