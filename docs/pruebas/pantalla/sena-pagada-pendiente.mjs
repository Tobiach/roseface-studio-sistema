import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'; // CHROMIUM_EXE lo fija npm run pruebas:pantalla
const U = process.env.VITE_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY, HH = { apikey: K, Authorization: 'Bearer ' + K };
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];
const BASE = process.env.BASE_URL || 'http://localhost:5196';

async function nuevaPagina({ conToken = true } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1100 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.capturas = [];
  await p.addInitScript(() => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(u); return null; }; });
  if (!conToken) await p.addInitScript(() => { if (!localStorage.getItem('roseface_acceso')) localStorage.setItem('roseface_acceso', JSON.stringify({ rol: 'admin' })); });
  await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol: 'admin', profesionalId: null, nombre: null, token: 'tok-de-prueba' }) }));
  await p.route('**/api/marcar-sena-manual', (r) => {
    p.capturas.push({ api: 'marcar-sena-manual', auth: r.request().headers().authorization, body: r.request().postData() });
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await p.route('**/api/actualizar-estado-turno', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await p.route('**/rest/v1/**', (r) => {
    const req = r.request();
    if (req.method() === 'GET') return r.continue();
    const tabla = new URL(req.url()).pathname.split('/').pop();
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    p.capturas.push({ m: req.method(), tabla, body });
    if (req.method() === 'POST' && tabla === 'turnos') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999999, fecha_creacion: new Date().toISOString(), ...body }) });
    if (req.method() === 'POST' && tabla === 'clientas') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(body) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  return p;
}

async function entrarAdmin(p) {
  await p.goto(BASE + '/');
  const yaHaySesion = await p.evaluate(() => !!localStorage.getItem('roseface_acceso'));
  if (yaHaySesion) { await p.goto(BASE + '/admin/agenda'); }
  else {
    await p.getByRole('button', { name: /Admin/ }).first().click();
    await p.locator('input[type=password]').fill('9999');
    await p.getByRole('button', { name: 'Entrar', exact: true }).click();
    await p.waitForURL('**/admin/agenda');
  }
  await p.waitForTimeout(2000);
}

const t = await (await fetch(U + '/rest/v1/turnos?select=id,fecha,hora_inicio,estado,clienta_id,servicio_id&id=in.(666,499)', { headers: HH })).json();
const pend = t.find((x) => x.id === 666), paga = t.find((x) => x.id === 499);
console.log('turno pendiente real:', pend.fecha, pend.hora_inicio, pend.estado, '| turno con seña confirmada real:', paga.fecha, paga.hora_inicio, paga.estado);

// 1) Agenda: cartel de seña en tarjetas y modal, y marcar como pagada
let p = await nuevaPagina();
await entrarAdmin(p);
await p.getByRole('button', { name: 'Rango a elección' }).click();
await p.locator('input[type=date]').nth(0).fill(pend.fecha);
await p.locator('input[type=date]').nth(1).fill(pend.fecha);
await p.waitForTimeout(900);
const detalle = await p.locator('body').innerText();
ok(/Seña pendiente/.test(detalle) && /Seña pagada/.test(detalle), 'Las tarjetas muestran "Seña pendiente" y "Seña pagada" según corresponda');
await p.locator('div.cursor-pointer', { hasText: 'Seña pendiente' }).last().click();
const modal = p.locator('div.fixed', { hasText: 'Gestión de Turno' });
let mt = await modal.innerText();
ok(/Seña pendiente/.test(mt), 'El modal muestra el cartel "Seña pendiente"');
ok(/72 horas antes · pedir seña/.test(mt), '... y los recordatorios de seña (72h / 48h / 24h)');
await modal.getByRole('button', { name: /Marcar la seña como pagada/ }).click();
await p.waitForTimeout(900);
const llamada = p.capturas.find((c) => c.api === 'marcar-sena-manual');
ok(llamada?.auth === 'Bearer tok-de-prueba', 'Marcar como pagada llama al endpoint con el token de sesión');
mt = await p.locator('div.fixed', { hasText: 'Gestión de Turno' }).innerText();
ok(/Seña pagada/.test(mt) && !/pedir seña/.test(mt) && /4 horas antes/.test(mt), 'Tras marcarla: pasa a "Seña pagada" y los recordatorios vuelven a 48h/24h/4h');
ok(/Deshacer/.test(mt), '... y aparece la opción de deshacer');

// 2) Formulario de turno manual con "¿Ya abonó la seña?"
await p.getByRole('button', { name: 'Cerrar' }).last().click();
await p.getByRole('button', { name: 'Turno manual' }).click();
const form = p.locator('div.fixed', { hasText: 'Turno Manual' });
ok(/¿Ya abonó la seña\?/.test(await form.innerText()), 'El turno manual tiene el bloque "¿Ya abonó la seña?"');
await form.getByPlaceholder('Nombre y apellido').fill('Prueba Seña Abonada');
await form.locator('select').nth(0).selectOption({ label: 'Mili' });
await form.locator('select').nth(1).selectOption({ index: 1 });
await form.locator('input[type=time]').fill('16:00');
await form.getByRole('button', { name: /Sí, ya abonó/ }).click();
await form.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(1500);
const t1 = p.capturas.filter((c) => c.tabla === 'turnos' && c.m === 'POST').pop();
const s1 = p.capturas.filter((c) => c.api === 'marcar-sena-manual').pop();
ok(t1?.body?.estado === 'reservado' && t1?.body?.origen_reserva === 'manual', 'Crea el turno como reservado/manual (lo que permite la base)');
ok(!!s1?.body && JSON.parse(s1.body).abonada === true && String(JSON.parse(s1.body).turnoId) === '999999', '... y registra la seña como pagada por el endpoint autenticado');

// 3) Sesión vieja (sin token): pide el PIN antes de crear nada
const p2 = await nuevaPagina({ conToken: false });
await entrarAdmin(p2);
await p2.getByRole('button', { name: 'Turno manual' }).click();
const form2 = p2.locator('div.fixed', { hasText: 'Turno Manual' });
await form2.getByPlaceholder('Nombre y apellido').fill('Prueba Sin Token');
await form2.locator('select').nth(0).selectOption({ label: 'Mili' });
await form2.locator('select').nth(1).selectOption({ index: 1 });
await form2.locator('input[type=time]').fill('17:00');
await form2.getByRole('button', { name: /Sí, ya abonó/ }).click();
await form2.getByRole('button', { name: 'Crear turno' }).click();
await p2.waitForTimeout(1000);
ok((await p2.locator('input[type=password]').count()) > 0, 'Sin token de sesión: abre el pedido de PIN');
ok(!p2.capturas.some((c) => c.tabla === 'turnos' && c.m === 'POST'), '... y NO crea el turno hasta tener sesión válida');

// 4) Clientas Recurrentes con turno próximo
const p3 = await nuevaPagina();
await p3.route('**/rest/v1/clientas_recurrentes_estado*', (r) => {
  const rq = r.request();
  if (rq.method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ clienta_id: pend.clienta_id, servicio_id: pend.servicio_id, turno_id_ancla: pend.id, contactada: false, contactada_en: null, nota: 'Marcada a mano desde la Agenda', silenciada: false }]) });
  return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
await entrarAdmin(p3);
await p3.getByRole('link', { name: /Clientas Recurrentes/ }).first().click();
await p3.waitForTimeout(2500);
const rt = await p3.locator('body').innerText();
console.log('   [tarjeta]', rt.split('\n').filter((l) => /Turno:|Toca mandar|Próximo mensaje|Seña|Enviar|Vino|Nada para/.test(l)).map((l) => l.trim()).join(' // '));
console.log('   [ahora en el navegador]', await p3.evaluate(() => new Date().toString()));
ok(/Turno: [^\n]*hs/.test(rt), 'La tarjeta de la clienta muestra su turno agendado');
ok(/Seña pendiente/.test(rt), '... con el cartel de seña');
ok(/Toca mandar: 72 horas antes · pedir seña/.test(rt), '... y qué mensaje toca mandar ahora');
await p3.getByRole('button', { name: /Enviar: 72 horas antes · pedir seña/ }).click();
await p3.waitForTimeout(600);
const abiertas = await p3.evaluate(() => window.__abiertas);
const rec = p3.capturas.find((c) => c.tabla === 'recordatorios_config');
ok(abiertas.length === 1 && /wa\.me/.test(abiertas[0]), 'El botón abre WhatsApp de la clienta');
ok(decodeURIComponent(abiertas[0] || '').includes('abones la seña'), '... con el mensaje de pedir la seña');
ok(rec?.body?.plantilla === '72h' && rec?.body?.activado === true, '... y deja registrado el recordatorio 72h como enviado');
console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();
