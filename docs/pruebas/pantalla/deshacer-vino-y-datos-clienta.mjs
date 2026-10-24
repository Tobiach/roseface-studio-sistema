import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'; // CHROMIUM_EXE lo fija npm run pruebas:pantalla
const BASE = process.env.BASE_URL || 'http://localhost:5192';
const U = process.env.VITE_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY, HH = { apikey: K, Authorization: 'Bearer ' + K };
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];
const get = async (q) => (await (await fetch(U + '/rest/v1/' + q, { headers: HH })).json());

const hoy = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const ayer = new Date(Date.now() - 27 * 3600_000).toISOString().slice(0, 10);
const [t645] = await get('turnos?select=*&id=eq.645');
const completados = await get('turnos?select=*&estado=eq.completado&order=fecha.desc&limit=1');
const real = completados[0];
const [t684] = await get('turnos?select=*&id=eq.684');
const clientaDe = async (id) => (await get(`clientas?select=*&id=eq.${id}`))[0];
const cli645 = await clientaDe(t645.clienta_id);
const cli684 = await clientaDe(t684.clienta_id);
console.log('turno completado real:', real.id, real.fecha, '| turno 645 clienta:', cli645.nombre, JSON.stringify(cli645.telefono), '| turno 684 clienta:', cli684.nombre, JSON.stringify(cli684.telefono));

const abiertos = [];
async function nuevaPagina({ rol = 'admin', pid = null, retocar, respuestas = {} } = {}) {
  for (const c of abiertos.splice(0)) await c.close(); // una sola pestaña viva a la vez: con varias, la 4ª carga se traba
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1300 } });
  abiertos.push(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.llamadas = [];
  await p.addInitScript(() => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(u); return { closed: false, close() {}, location: { set href(v) {} } }; }; });
  await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol, profesionalId: pid, nombre: null, token: 'tok' }) }));
  await p.route('**/api/editar-turno', (r) => {
    const cuerpo = JSON.parse(r.request().postData());
    p.llamadas.push({ auth: r.request().headers().authorization, cuerpo });
    const f = respuestas[cuerpo.accion] ?? { status: 200, body: { ok: true, turno: t645 } };
    r.fulfill({ status: f.status, contentType: 'application/json', body: JSON.stringify(f.body) });
  });
  await p.route('**/rest/v1/turnos*', async (r) => {
    if (r.request().method() !== 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (!retocar) return r.continue();
    const resp = await r.fetch();
    return r.fulfill({ response: resp, body: JSON.stringify(retocar(await resp.json())) });
  });
  await p.route(/\/rest\/v1\/(?!turnos)[a-z_]+/, (r) => (r.request().method() === 'GET' ? r.continue() : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })));
  return p;
}
async function entrar(p, rol) {
  await p.goto(BASE + '/');
  await p.getByRole('button', { name: rol === 'admin' ? /Admin/ : /^Profesional$/ }).first().click();
  await p.locator('input[type=password]').fill('9999');
  await p.getByRole('button', { name: 'Entrar', exact: true }).click();
  await p.waitForURL('**/admin/agenda');
  await p.waitForTimeout(2200);
}
async function abrir(p, fecha, filtroTexto) {
  await p.locator('input[aria-label="Ir a un día"]').fill(fecha);
  await p.waitForTimeout(900);
  const tarjeta = filtroTexto ? p.locator('div.cursor-pointer[class*="border-l-"]', { hasText: filtroTexto }).first() : p.locator('div.cursor-pointer[class*="border-l-"]').first();
  await tarjeta.click();
  return p.locator('div.fixed', { hasText: 'Gestión de Turno' });
}

// ---------- A) Yosy deshace un "Vino"
let p = await nuevaPagina({ respuestas: { reabrir: { status: 200, body: { ok: true, turno: { ...real, estado: 'reservado' } } } } });
await entrar(p, 'admin');
let modal = await abrir(p, real.fecha, 'Completado');
let txt = await modal.innerText();
ok(/Deshacer "Vino" \(volver a pendiente\)/.test(txt), 'Yosy: turno completado muestra "Deshacer Vino"');
ok(!/Recordatorio Enviado/.test(txt), '... y ya no ofrece "Recordatorio Enviado" en un turno completado');
await modal.getByRole('button', { name: /Deshacer "Vino"/ }).click();
txt = await modal.innerText();
ok(/¿Deshacer el "Vino"\?/.test(txt) && /liquidada/.test(txt), 'Pide confirmación y avisa de las comisiones / semana liquidada');
await modal.getByRole('button', { name: 'Sí, deshacer' }).click();
await p.waitForTimeout(1500);
console.log('   [llamadas A]', JSON.stringify(p.llamadas), '| avisos:', (await p.locator('body').innerText()).split('\n').filter((l) => /Listo|❌|🔑|volvé|volvió/.test(l)).join(' // '));
ok(p.llamadas[0]?.cuerpo.accion === 'reabrir' && /^[0-9]+$/.test(String(p.llamadas[0]?.cuerpo.turnoId)) && p.llamadas[0]?.auth === 'Bearer tok', 'Llama al endpoint autenticado con la acción "reabrir"');

// ---------- B) Profesional: solo el de HOY
const comoCompletado = (fecha) => (data) => data.map((t) => (t.id === 645 ? { ...t, estado: 'completado', fecha, hora_inicio: '11:00:00', hora_fin: '12:30:00' } : t));
p = await nuevaPagina({ rol: 'profesional', pid: 'prof-mili', retocar: comoCompletado(hoy) });
await entrar(p, 'profesional');
modal = await abrir(p, hoy, 'Completado');
txt = await modal.innerText();
ok(/Deshacer "Vino" \(volver a pendiente\)/.test(txt) && /si lo marcaste por error lo podés deshacer/.test(txt), 'Profesional: puede deshacer el "Vino" de un turno de HOY');
p = await nuevaPagina({ rol: 'profesional', pid: 'prof-mili', retocar: comoCompletado(ayer) });
await entrar(p, 'profesional');
modal = await abrir(p, ayer, 'Completado');
txt = await modal.innerText();
ok(!/Deshacer "Vino"/.test(txt) && /solo Yosy puede editarlo/.test(txt), 'Profesional: en un turno de OTRO día no aparece (solo Yosy)');

// ---------- C) Editar datos de la clienta
p = await nuevaPagina({ respuestas: { clienta: { status: 200, body: { ok: true, clienta: { ...cli645, telefono: '11 2769 6736' }, resumen: ['teléfono actualizado'], advertencias: [] } } } });
await entrar(p, 'admin');
modal = await abrir(p, t645.fecha);
txt = await modal.innerText();
ok(txt.includes(cli645.nombre) && /Editar datos/.test(txt), `El detalle del turno muestra la clienta (${cli645.nombre}) y "Editar datos"`);
await modal.getByRole('button', { name: 'Editar datos' }).click();
const campoTel = modal.locator('input[type=tel]');
await campoTel.fill('123');
txt = await modal.innerText();
ok(/entre 8 y 15 números/.test(txt) && (await modal.getByRole('button', { name: 'Guardar datos' }).isDisabled()), 'Teléfono inválido: avisa y bloquea el guardado');
await campoTel.fill('11 2769 6736');
txt = await modal.innerText();
ok(/\+5491127696736/.test(txt), 'Muestra a qué número de WhatsApp se le va a escribir (+5491127696736)');
await modal.getByRole('button', { name: 'Guardar datos' }).click();
await p.waitForTimeout(900);
const ll = p.llamadas[0];
ok(ll?.cuerpo.accion === 'clienta' && JSON.stringify(ll.cuerpo.cliente) === JSON.stringify({ telefono: '11 2769 6736' }) && ll.auth === 'Bearer tok', 'Guarda por el endpoint autenticado mandando solo el dato que cambió');
txt = await modal.innerText();
ok(/Clienta:[^\n]*11 2769 6736/.test(txt) && !/Datos de la clienta/.test(txt), 'Después de guardar, el detalle ya muestra el teléfono nuevo');

// ---------- D) Clienta sin teléfono: no abre WhatsApp vacío
p = await nuevaPagina();
await entrar(p, 'admin');
modal = await abrir(p, t684.fecha, cli684.nombre);
txt = await modal.innerText();
ok(!cli684.telefono ? /sin teléfono/.test(txt) : true, 'Clienta sin teléfono: el detalle lo marca en amarillo ("sin teléfono")');
await modal.getByRole('button', { name: /Activar y enviar por WhatsApp/ }).first().click();
await p.waitForTimeout(900);
const abiertas = await p.evaluate(() => window.__abiertas);
ok(!cli684.telefono ? abiertas.length === 0 && /no tiene teléfono cargado/.test(await p.locator('body').innerText()) : true, 'Recordatorio a una clienta sin teléfono: avisa que falta y NO abre un WhatsApp vacío');

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();
