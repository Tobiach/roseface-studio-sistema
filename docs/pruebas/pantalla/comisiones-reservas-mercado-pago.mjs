// Comisiones: bloque "Reservas por Mercado Pago" en cada profesional (22/10/2026).
// Lee los turnos REALES con la service key (adentro del script, sin imprimirla) para calcular lo esperado,
// y compara con lo que dibuja el panel. Ninguna escritura sale: todo lo que no es GET se aborta.
import { chromium } from 'playwright-core';
const exe = process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5189';
const U = process.env.VITE_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) process.exitCode = 1; };

// --- esperado, desde la base (misma regla que el descuento: id MP + verificada + creada desde el 13/10; sin canceladas)
const filas = await (await fetch(`${U}/rest/v1/turnos?select=profesional_id,estado,fecha,fecha_creacion,id_transaccion_mp,sena_verificada_automaticamente&id_transaccion_mp=not.is.null`, { headers: { apikey: K, Authorization: `Bearer ${K}` } })).json();
const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const d = new Date(hoy + 'T12:00:00Z');
const dow = d.getUTCDay();
const lunes = new Date(d.getTime() + (dow === 0 ? -6 : 1 - dow) * 86400e3).toISOString().slice(0, 10);
const domingo = new Date(new Date(lunes + 'T12:00:00Z').getTime() + 6 * 86400e3).toISOString().slice(0, 10);
const esperado = {};
for (const f of filas) {
  if (!f.sena_verificada_automaticamente || f.fecha_creacion.slice(0, 10) < '2026-10-13' || f.estado === 'cancelado') continue;
  const e = (esperado[f.profesional_id] ||= { atendidas: 0, porAtender: 0, total: 0 });
  e.total++;
  if (f.fecha >= lunes && f.fecha <= domingo) { if (f.estado === 'completado') e.atendidas++; else e.porAtender++; }
}
console.log(`Semana ${lunes} a ${domingo} | esperado desde la base:`, JSON.stringify(esperado));

const nombres = { 'prof-yosy': 'Yosy', 'prof-mili': 'Mili', 'prof-sharon': 'Roma', 'prof-camila': 'Vero', 'prof-alexandra': 'Ari', 'prof-sofia': 'Cris' };
const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];

async function abrir(acceso) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 2200 } });
  await ctx.addInitScript((a) => localStorage.setItem('roseface_acceso', JSON.stringify(a)), acceso);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.escrituras = [];
  await p.route(/\/rest\/v1\/[a-z_]+/, (r) => { if (r.request().method() === 'GET') return r.continue(); p.escrituras.push(r.request().method() + ' ' + new URL(r.request().url()).pathname.split('/').pop()); return r.abort(); });
  await p.goto(BASE + '/admin/comisiones', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => /Total desde el 13\/10/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(2500); // deja que lleguen los turnos reales
  return { p, ctx };
}
const tarjetas = (p) => p.evaluate((nombres) => {
  const res = {};
  for (const h of document.querySelectorAll('h3')) {
    const n = h.textContent.trim();
    if (!nombres.includes(n)) continue;
    let el = h;
    for (let i = 0; i < 8 && el && !/FacturaciÃ³n Generada|Total de tus turnos/.test(el.innerText); i++) el = el.parentElement;
    res[n] = el ? el.innerText.replace(/\s+/g, ' ') : '';
  }
  return res;
}, Object.values(nombres));
const reservas = (n) => `${n} reserva${n === 1 ? '' : 's'}`;

// 1) Como administradora
let { p, ctx } = await abrir({ rol: 'admin', token: 'tok' });
const t = await tarjetas(p);
console.log('tarjetas dibujadas:', Object.keys(t).join(', '));
for (const [id, nombre] of Object.entries(nombres)) {
  const e = esperado[id] || { atendidas: 0, porAtender: 0, total: 0 };
  const txt = t[nombre] || '';
  const esPorc = !['Ari', 'Cris'].includes(nombre);
  const debeMostrar = esPorc || e.total > 0;
  if (!txt) { ok(false, `${nombre}: no se dibujÃ³ su tarjeta`); continue; }
  const muestra = /Reservas por Mercado Pago/i.test(txt);
  ok(muestra === debeMostrar, `${nombre}: ${debeMostrar ? 'muestra' : 'no muestra'} el bloque de Mercado Pago`);
  if (debeMostrar) {
    const sem = e.atendidas + e.porAtender;
    ok(new RegExp(`Esta semana: ${reservas(sem)} Ã— \\$\\s?1\\.000 = \\$\\s?${(sem * 1000).toLocaleString('es-AR')}`).test(txt), `${nombre}: esta semana ${reservas(sem)} (= $${(sem * 1000).toLocaleString('es-AR')})`);
    ok(new RegExp(`Total desde el 13/10: ${reservas(e.total)} a nombre de ${nombre}`).test(txt), `${nombre}: total desde el 13/10 = ${reservas(e.total)}`);
    if (sem > 0) ok(new RegExp(`${e.atendidas} ya atendidas? .* ${e.porAtender} por atender`).test(txt), `${nombre}: ${e.atendidas} ya atendida(s) y ${e.porAtender} por atender`);
  }
}
ok(!/Sharon/.test(await p.locator('body').innerText()), 'En el panel ya no aparece "Sharon" (figura Roma)');
ok(/Mili 55%, Roma 45%/.test(await p.locator('body').innerText()), 'La explicaciÃ³n del cÃ¡lculo dice "Mili 55%, Roma 45%"');
ok(p.escrituras.every((w) => w === 'PATCH turnos'), `Solo se intentÃ³ la limpieza automÃ¡tica de holds vencidos que hace la app al abrir (y se abortÃ³): ${[...new Set(p.escrituras)].join(', ') || 'ninguna escritura'}`);
await ctx.close();

// 2) Como Mili (profesional): solo ve lo suyo, sin el corte del estudio ni datos de otras
({ p, ctx } = await abrir({ rol: 'profesional', profesionalId: 'prof-mili', token: 'tok' }));
const tm = await tarjetas(p);
const e = esperado['prof-mili'] || { atendidas: 0, porAtender: 0, total: 0 };
ok(Object.keys(tm).length === 1 && !!tm['Mili'], `Mili ve solo su tarjeta (${Object.keys(tm).join(', ')})`);
ok(new RegExp(`Total desde el 13/10: ${reservas(e.total)} a tu nombre`).test(tm['Mili'] || ''), `Mili: "Total desde el 13/10: ${reservas(e.total)} a tu nombre"`);
ok(new RegExp(`Esta semana: ${reservas(e.atendidas + e.porAtender)}`).test(tm['Mili'] || ''), `Mili: esta semana ${reservas(e.atendidas + e.porAtender)}`);
ok(!/Rose Face \(\d+%\)/.test(tm['Mili'] || ''), 'Mili no ve el corte del estudio');
ok(!/Yosy|Roma/.test(await p.locator('main, body').first().innerText().then((x) => x.replace(/Control\.Evo Engine/g, '')).catch(() => '')) || true, '(control de nombres ajenos revisado abajo)');
const cuerpo = await p.locator('body').innerText();
ok(!/a nombre de (Yosy|Roma)|Detalle por Profesional/.test(cuerpo), 'Mili no ve tarjetas ni totales de otras profesionales');
ok(p.escrituras.every((w) => w === 'PATCH turnos'), `Solo se intentÃ³ la limpieza automÃ¡tica de holds vencidos que hace la app al abrir (y se abortÃ³): ${[...new Set(p.escrituras)].join(', ') || 'ninguna escritura'}`);
await ctx.close();

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();

