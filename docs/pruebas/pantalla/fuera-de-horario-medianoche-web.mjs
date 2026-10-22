import { chromium } from 'playwright-core';
const exe = process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5189';
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];
async function nuevaPagina() {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1300 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.escrituras = [];
  await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol: 'admin', profesionalId: null, nombre: null, token: 'tok' }) }));
  await p.route('**/api/editar-turno', (r) => { p.escrituras.push({ api: 'editar-turno', body: JSON.parse(r.request().postData()) }); r.fulfill({ status: 400, contentType: 'application/json', body: '{"ok":false,"error":"prueba"}' }); });
  await p.route(/\/rest\/v1\/[a-z_]+/, (r) => {
    const req = r.request();
    if (req.method() === 'GET') return r.continue();
    const tabla = new URL(req.url()).pathname.split('/').pop();
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    p.escrituras.push({ m: req.method(), tabla, body });
    if (req.method() === 'POST' && tabla === 'turnos') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999999, fecha_creacion: new Date().toISOString(), ...body }) });
    if (req.method() === 'POST' && tabla === 'clientas') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(body) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  return { p, ctx };
}
async function entrarAdmin(p) {
  await p.goto(BASE + '/');
  await p.getByRole('button', { name: /Admin/ }).first().click();
  await p.locator('input[type=password]').fill('9999');
  await p.getByRole('button', { name: 'Entrar', exact: true }).click();
  await p.waitForURL('**/admin/agenda');
  await p.waitForTimeout(2500);
}

// 1) Turno manual a las 23:00: el fin se recorta a 23:59 (no da la vuelta)
let { p, ctx } = await nuevaPagina();
await entrarAdmin(p);
await p.getByRole('button', { name: 'Turno manual' }).click();
const f = p.locator('div.fixed', { hasText: 'Turno Manual' });
await f.getByPlaceholder('Nombre y apellido').fill('Clienta Noche');
await f.locator('select').nth(0).selectOption({ label: 'Mili' });
await f.locator('select').nth(1).selectOption({ index: 1 });
await f.locator('input[type=date]').fill('2026-12-22');
await f.locator('input[type=time]').fill('23:00');
await f.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(1500);
const creado = p.escrituras.find((e) => e.tabla === 'turnos' && e.m === 'POST');
ok(creado?.body?.hora_inicio === '23:00' && creado?.body?.hora_fin === '23:59', `Turno de las 23:00: hora de fin 23:59, no queda "a las 00:30" (${creado?.body?.hora_inicio}-${creado?.body?.hora_fin})`);
await ctx.close();

// 2) Editar reserva a las 23:00: se puede guardar
({ p, ctx } = await nuevaPagina());
await entrarAdmin(p);
await p.locator('input[aria-label="Ir a un día"]').fill('2026-10-22');
await p.waitForTimeout(900);
await p.locator('div.cursor-pointer[class*="border-l-"]').first().click();
const modal = p.locator('div.fixed', { hasText: 'Gestión de Turno' });
await modal.getByRole('button', { name: /Editar reserva/ }).click();
await modal.locator('input[type=time]').first().fill('23:00');
const txt = await modal.innerText();
ok(!/La hora de fin tiene que ser posterior/.test(txt) && !(await modal.getByRole('button', { name: 'Guardar cambios' }).isDisabled()), 'Editar reserva a las 23:00: la hora de fin no da la vuelta y se puede guardar');
await modal.getByRole('button', { name: 'Guardar cambios' }).click();
await p.waitForTimeout(900);
const llamada = p.escrituras.find((e) => e.api === 'editar-turno');
ok(llamada?.body.accion === 'editar' && llamada.body.horaInicio === '23:00' && llamada.body.horaFin === undefined, 'Manda al servidor solo el nuevo horario de inicio (el servidor recalcula el fin)');
await ctx.close();

// 3) La reserva online de las clientas
({ p, ctx } = await nuevaPagina());
await p.goto(BASE + '/reserva');
await p.waitForTimeout(2500);
const pub = await p.locator('body').innerText();
ok(/reserva de turno online/i.test(pub) && !/fuera de horario|solo equipo/i.test(pub), 'La reserva online de las clientas carga igual y no muestra nada interno del equipo');
await ctx.close();
console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();
