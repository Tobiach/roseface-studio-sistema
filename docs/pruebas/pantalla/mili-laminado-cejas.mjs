// Mili hace laminado de cejas (el documento de Yosy del 22/9 lo decía y se había omitido; corregido el 30/10/2026).
// Perfil público de cada profesional y paso 1 de la reserva acotada a Mili. Datos reales de lectura; no escribe nada.
import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5189';
let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };

const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];
async function pagina() {
  const ctx = await b.newContext({ viewport: { width: 390, height: 1600 }, locale: 'es-AR' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  await p.route(/\/rest\/v1\/[a-z_]+/, (r) => (r.request().method() === 'GET' ? r.continue() : r.abort().catch(() => {})));
  return { p, ctx };
}
// La app arranca con el catálogo de respaldo del código y lo reemplaza cuando llega la respuesta REAL de la base:
// hay que esperar esa respuesta; si no, se lee el catálogo viejo y la prueba da una falla falsa.
const esperarServicios = (p) => p.waitForResponse((r) => /\/rest\/v1\/servicios/.test(r.url()) && r.ok(), { timeout: 120000 });

async function serviciosDelPerfil(p, slug, nombre) {
  const respuesta = esperarServicios(p);
  await p.goto(`${BASE}/profesionales/${slug}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await respuesta;
  await p.getByRole('heading', { name: new RegExp(`Servicios que realiza ${nombre}`) }).waitFor({ timeout: 90000 });
  await p.waitForTimeout(2500);
  return (await p.locator('body').innerText()).replace(/\s+/g, ' ');
}

// 1) Perfil de Mili
{
  const { p, ctx } = await pagina();
  const t = await serviciosDelPerfil(p, 'mili', 'Mili');
  for (const s of ['Laminado de Cejas', 'Laminado + Perfilado', 'Perfilado de Cejas', 'Sombreado de Cejas', 'Perfilado + Sombreado', 'Depilación de Bozo']) ok(t.includes(s), `Mili hace "${s}"`);
  for (const s of ['Clásicas Lash', 'Lash Lifting', 'Volumen Tecnológico YY']) ok(t.includes(s), `Mili sigue con "${s}"`);
  for (const s of ['Natural Volumen', 'Medio Volumen', 'Mega Volumen', 'Lash Rose Face']) ok(!t.includes(s), `Mili NO figura en "${s}" (sin confirmar con Yosy: no se tocó)`);
  await ctx.close();
}

// 2) Quienes ya hacían laminado lo siguen haciendo
for (const [slug, nombre] of [['yosy', 'Yosy'], ['roma', 'Roma']]) {
  const { p, ctx } = await pagina();
  const t = await serviciosDelPerfil(p, slug, nombre);
  ok(t.includes('Laminado de Cejas') && t.includes('Laminado + Perfilado'), `${nombre} sigue haciendo los dos laminados`);
  await ctx.close();
}

// 3) Reserva acotada a Mili: entre sus servicios de Cejas aparece el laminado
{
  const { p, ctx } = await pagina();
  const respuesta = esperarServicios(p);
  await p.goto(`${BASE}/reserva?profesionalId=prof-mili`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await respuesta;
  await p.waitForTimeout(3000);
  await p.getByText('Cejas', { exact: true }).first().click({ timeout: 60000 });
  await p.waitForTimeout(1500);
  const t = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  ok(t.includes('Laminado de Cejas') && t.includes('Laminado + Perfilado'), 'Reserva con Mili: en Cejas se puede elegir Laminado de Cejas y Laminado + Perfilado');
  await ctx.close();
}

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo OK');
await b.close();
process.exitCode = fallas ? 1 : 0;
