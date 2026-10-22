import { chromium } from 'playwright-core';
const exe = process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = 'http://localhost:5191';
const U = process.env.VITE_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY, HH = { apikey: K, Authorization: 'Bearer ' + K };
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const LINK = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=TEST-123';

const turnos = await (await fetch(U + '/rest/v1/turnos?select=id,fecha,hora_inicio,estado,origen_reserva,aprobado_por_profesional,monto_sena,clienta_id&origen_reserva=eq.manual&estado=eq.reservado&aprobado_por_profesional=eq.false&monto_sena=gt.0&order=fecha.asc', { headers: HH })).json();
const conTel = [];
for (const t of turnos) {
  if (new Date(t.fecha + 'T' + String(t.hora_inicio).slice(0, 5) + ':00-03:00') <= Date.now()) continue;
  const c = (await (await fetch(U + `/rest/v1/clientas?select=telefono&id=eq.${t.clienta_id}`, { headers: HH })).json())[0];
  if (c && c.telefono.replace(/\D/g, '')) { conTel.push({ ...t, tel: c.telefono }); break; }
}
const pend = conTel[0];
console.log('turno pendiente futuro con teléfono:', pend ? `${pend.id} ${pend.fecha} tel ${pend.tel}` : 'ninguno');

async function probar(nombre, userAgent) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1300 }, userAgent, hasTouch: /iPhone/.test(userAgent) });
  const p = await ctx.newPage();
  const consola = [];
  p.on('console', (m) => consola.push(m.text()));
  await p.addInitScript(() => { window.__open = 0; const o = window.open.bind(window); window.open = (...a) => { window.__open++; window.__ultima = a[0]; return o(...a); }; });
  await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol: 'admin', profesionalId: null, nombre: null, token: 'tok' }) }));
  await p.route('**/api/mercadopago/crear-link-pago', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, initPoint: LINK }) }));
  await p.route('**://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>wa.me falso</html>' }));
  await p.route('**://web.whatsapp.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>whatsapp web falso</html>' }));
  await p.route(/\/rest\/v1\/[a-z_]+/, (r) => (r.request().method() === 'GET' ? r.continue() : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })));
  await p.goto(BASE + '/');
  await p.getByRole('button', { name: /Admin/ }).first().click();
  await p.locator('input[type=password]').fill('9999');
  await p.getByRole('button', { name: 'Entrar', exact: true }).click();
  await p.waitForURL('**/admin/agenda');
  await p.waitForTimeout(2200);
  await p.locator('input[aria-label="Ir a un día"]').fill(pend.fecha);
  await p.waitForTimeout(900);
  await p.locator('div.cursor-pointer[class*="border-l-"]', { hasText: 'Seña pendiente' }).first().click();
  const modal = p.locator('div.fixed', { hasText: 'Gestión de Turno' });
  await modal.getByRole('button', { name: /Activar y enviar por WhatsApp/ }).first().click();
  await p.waitForTimeout(3000);
  const urlFinal = p.url();
  const abiertas = await p.evaluate(() => window.__open);
  const paginas = ctx.pages().length;
  console.log(`   [${nombre}] url final de la pestaña original: ${urlFinal.slice(0, 40)} · window.open: ${abiertas} · pestañas del navegador: ${paginas} · consola: ${consola.filter((c) => /whatsapp/i.test(c)).map((c) => c.slice(0, 110)).join(' | ') || '—'}`);
  await ctx.close();
  return { abiertas, paginas, consola, urlFinal };
}

const m = await probar('iPhone', IPHONE);
ok(m.abiertas === 0 && m.paginas === 1, 'iPhone: al enviar el recordatorio NO se abre ninguna pestaña nueva');
ok(m.consola.some((c) => /whatsapp:\/\/send/.test(c)), 'iPhone: la página intentó abrir la app (esquema whatsapp://send)');
const d = await probar('Computadora', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
ok(d.paginas === 2, 'Computadora: se abre UNA sola pestaña (WhatsApp Web), sin pestañas de sobra');
await b.close();
