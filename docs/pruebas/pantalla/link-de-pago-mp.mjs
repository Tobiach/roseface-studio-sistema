import { chromium } from 'playwright-core';
const exe = process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = 'http://localhost:5194';
const U = process.env.VITE_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY, HH = { apikey: K, Authorization: 'Bearer ' + K };
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];
const LINK = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=TEST-123';

async function nuevaPagina({ conToken = true, respuestaLink } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1200 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.capturas = [];
  await p.addInitScript(() => {
    window.__abiertas = []; window.__final = []; window.__cerradas = 0;
    window.open = (u) => {
      window.__abiertas.push(u);
      const w = { closed: false, close() { this.closed = true; window.__cerradas++; }, location: { set href(v) { window.__final.push(v); } } };
      return w;
    };
  });
  if (!conToken) await p.addInitScript(() => { if (!localStorage.getItem('roseface_acceso')) localStorage.setItem('roseface_acceso', JSON.stringify({ rol: 'admin' })); });
  await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol: 'admin', profesionalId: null, nombre: null, token: 'tok' }) }));
  await p.route('**/api/mercadopago/crear-link-pago', (r) => {
    p.capturas.push({ api: 'crear-link-pago', auth: r.request().headers().authorization, body: r.request().postData() });
    const resp = respuestaLink ?? { status: 200, body: { ok: true, initPoint: LINK } };
    r.fulfill({ status: resp.status, contentType: 'application/json', body: JSON.stringify(resp.body) });
  });
  await p.route('**/rest/v1/recordatorios_config*', (r) => {
    const req = r.request();
    if (req.method() === 'GET') return r.continue();
    p.capturas.push({ tabla: 'recordatorios_config', body: JSON.parse(req.postData() || 'null') });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await p.route(/\/rest\/v1\/(?!recordatorios_config)[a-z_]+/, (r) => (r.request().method() === 'GET' ? r.continue() : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })));
  return p;
}
async function entrar(p) {
  await p.goto(BASE + '/');
  const ya = await p.evaluate(() => !!localStorage.getItem('roseface_acceso'));
  if (ya) await p.goto(BASE + '/admin/agenda');
  else {
    await p.getByRole('button', { name: /Admin/ }).first().click();
    await p.locator('input[type=password]').fill('9999');
    await p.getByRole('button', { name: 'Entrar', exact: true }).click();
    await p.waitForURL('**/admin/agenda');
  }
  await p.waitForTimeout(2000);
}
// turno manual pendiente, futuro, de Yosy
const turnos = await (await fetch(U + '/rest/v1/turnos?select=id,fecha,hora_inicio,estado,origen_reserva,aprobado_por_profesional,monto_sena,profesional_id,clienta_id,servicio_id&origen_reserva=eq.manual&estado=eq.reservado&aprobado_por_profesional=eq.false&monto_sena=gt.0&order=fecha.asc', { headers: HH })).json();
const pend = turnos.find((t) => new Date(t.fecha + 'T' + String(t.hora_inicio).slice(0, 5) + ':00-03:00') > Date.now());
console.log('turno pendiente real:', pend.id, pend.fecha, String(pend.hora_inicio).slice(0, 5), pend.profesional_id);

async function abrirModal(p) {
  await p.getByRole('button', { name: 'Rango a elección' }).click();
  await p.locator('input[type=date]').nth(0).fill(pend.fecha);
  await p.locator('input[type=date]').nth(1).fill(pend.fecha);
  await p.waitForTimeout(900);
  await p.locator('div.cursor-pointer', { hasText: 'Seña pendiente' }).first().click();
  return p.locator('div.fixed', { hasText: 'Gestión de Turno' });
}

// A) 72h con token -> pide link y lo suma al mensaje
let p = await nuevaPagina();
await entrar(p);
let modal = await abrirModal(p);
const t = await modal.innerText();
ok(/Al enviarlo se agrega un link de pago/i.test(t), 'La tarjeta de 72h/48h avisa que se agrega un link de pago');
await modal.getByRole('button', { name: /Activar y enviar por WhatsApp/ }).first().click();
await p.waitForTimeout(1200);
const llamada = p.capturas.find((c) => c.api === 'crear-link-pago');
ok(llamada?.auth === 'Bearer tok' && JSON.parse(llamada.body).turnoId === String(pend.id), 'Al enviar el de 72h pide el link con el token de sesión y el id del turno (no manda montos)');
const abiertas = await p.evaluate(() => window.__abiertas), finales = await p.evaluate(() => window.__final);
ok(abiertas[0] === '' && finales.length === 1, 'Abre la pestaña de WhatsApp en el click y después le carga la URL (no la bloquea el navegador)');
const msj = decodeURIComponent(finales[0] || '');
ok(msj.includes(LINK) && /Podés pagarla directo con Mercado Pago/.test(msj) && /72 hs/.test(msj), 'El mensaje de 72h lleva el link de pago de Mercado Pago');
console.log('     mensaje:', msj.replace(/^https:\/\/wa\.me\/\d+\?text=/, ''));
const rec = p.capturas.find((c) => c.tabla === 'recordatorios_config');
ok(rec?.body?.plantilla === '72h' && rec?.body?.activado === true, 'y deja registrado el recordatorio 72h como enviado');

// A2) el de 48h también lleva link; el de 24h NO
await p.evaluate(() => { window.__final.length = 0; });
p.capturas.length = 0;
await modal.getByRole('button', { name: /Activar y enviar por WhatsApp/ }).first().click(); // 48h (el de 72h ya quedó activado)
await p.waitForTimeout(900);
const f48 = decodeURIComponent((await p.evaluate(() => window.__final))[0] || '');
ok(/En caso de que todavía no hayas abonado/.test(f48) && f48.includes(LINK) && /Si ya la abonaste/.test(f48), 'El mensaje de 48h también lleva el link, y conserva "si ya la abonaste, ignorá"');
await p.evaluate(() => { window.__final.length = 0; });
p.capturas.length = 0;
await modal.getByRole('button', { name: /Activar y enviar por WhatsApp/ }).first().click(); // 24h
await p.waitForTimeout(900);
const f24 = decodeURIComponent((await p.evaluate(() => window.__final))[0] || '');
ok(/confirmás/.test(f24) && !f24.includes('mercadopago') && !p.capturas.some((c) => c.api === 'crear-link-pago'), 'El de 24h (confirmar cita) NO lleva link ni llama a Mercado Pago');

// B) turno que no aplica (ej. profesional por transferencia): se manda sin link y avisa
p = await nuevaPagina({ respuestaLink: { status: 400, body: { ok: false, motivo: 'no_aplica', error: 'Ari cobra por transferencia a su cuenta, no por Mercado Pago' } } });
await entrar(p);
modal = await abrirModal(p);
await modal.getByRole('button', { name: /Activar y enviar por WhatsApp/ }).first().click();
await p.waitForTimeout(1200);
const fB = decodeURIComponent((await p.evaluate(() => window.__final))[0] || '');
ok(fB.length > 0 && !fB.includes('mercadopago') && /abones la seña/.test(fB), 'Si no corresponde link (ej. transferencia): manda el mensaje igual, sin link');
ok(/se manda el mensaje sin link de pago/.test(await p.locator('body').innerText()), '... y avisa por qué');

// C) error de Mercado Pago: igual se manda el recordatorio sin link
p = await nuevaPagina({ respuestaLink: { status: 500, body: { ok: false, error: 'No se pudo crear el link de pago' } } });
await entrar(p);
modal = await abrirModal(p);
await modal.getByRole('button', { name: /Activar y enviar por WhatsApp/ }).first().click();
await p.waitForTimeout(1200);
const fC = decodeURIComponent((await p.evaluate(() => window.__final))[0] || '');
ok(fC.length > 0 && !fC.includes('mercadopago'), 'Si Mercado Pago falla: el recordatorio sale igual, sin link, y no se pierde');

// D) sesión vieja (sin token): pide PIN y NO manda nada
p = await nuevaPagina({ conToken: false });
await entrar(p);
modal = await abrirModal(p);
await modal.getByRole('button', { name: /Activar y enviar por WhatsApp/ }).first().click();
await p.waitForTimeout(1200);
ok((await p.locator('input[type=password]').count()) > 0, 'Sin token de sesión: pide el PIN');
ok((await p.evaluate(() => window.__final.length)) === 0 && (await p.evaluate(() => window.__cerradas)) === 1, '... no manda el WhatsApp y cierra la pestaña en blanco que abrió');
ok(!p.capturas.some((c) => c.tabla === 'recordatorios_config'), '... y no marca el recordatorio como enviado');

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();
