// Cada profesional se muestra con sus 5 estrellas llenas (calificación 5.0) y no solo con una (pedido de Tobias, 30/10/2026).
// Recorre los 6 perfiles, la página del equipo y el paso "Profesionales disponibles" de la reserva, en un celular de 360 px.
// Datos reales de lectura; toda escritura del navegador se aborta.
import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5189';
const SALIDA = process.env.SALIDA;
let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };

const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];
async function pagina(ancho = 360, alto = 1400) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-AR' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  await p.route(/\/rest\/v1\/[a-z_]+/, (r) => (r.request().method() === 'GET' ? r.continue() : r.abort().catch(() => {})));
  return { p, ctx };
}
const ir = (p, ruta) => p.goto(BASE + ruta, { waitUntil: 'domcontentloaded', timeout: 180000 });
const SEL = '[role="img"][aria-label$="de 5 estrellas"]';
// Cuántas estrellas hay en un grupo y cuántas están llenas
const contar = (loc) => loc.evaluate((el) => ({ total: el.querySelectorAll('svg').length, llenas: el.querySelectorAll('svg[data-llena="si"]').length, nota: el.getAttribute('aria-label') }));
const desborde = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// 1) Los 6 perfiles
for (const [slug, nombre] of [['yosy', 'Yosy'], ['mili', 'Mili'], ['roma', 'Roma'], ['cris', 'Cris'], ['ari', 'Ari'], ['vero', 'Vero']]) {
  const { p, ctx } = await pagina();
  await ir(p, `/profesionales/${slug}`);
  await p.getByRole('heading', { name: new RegExp(`Servicios que realiza ${nombre}`) }).waitFor({ timeout: 60000 });
  const grupos = p.locator(SEL);
  ok((await grupos.count()) === 1, `${nombre}: el perfil tiene un solo grupo de estrellas`);
  const e = await contar(grupos.first());
  ok(e.total === 5 && e.llenas === 5, `${nombre}: se ven 5 estrellas y las 5 están llenas (${e.llenas}/${e.total}) — "${e.nota}"`);
  const chip = (await p.locator('div.rounded-full', { hasText: /opiniones/ }).first().innerText()).replace(/\s+/g, ' ');
  ok(/^5\.0 \(\d+ opiniones\)$/.test(chip), `${nombre}: el número y la cantidad de opiniones siguen igual ("${chip}")`);
  ok((await desborde(p)) <= 0, `${nombre}: sin scroll horizontal en 360 px`);
  if (SALIDA && slug === 'mili') await p.screenshot({ path: `${SALIDA}/estrellas_perfil.png`, clip: { x: 0, y: 150, width: 360, height: 420 } });
  await ctx.close();
}

// 2) Página del equipo: cada foto con sus 5 estrellas, dentro de la foto y sin tapar el nombre
{
  const { p, ctx } = await pagina();
  await ir(p, '/profesionales');
  await p.getByRole('heading', { name: /Conocé al equipo/ }).waitFor({ timeout: 60000 });
  await p.waitForTimeout(3000);
  const tarjetas = p.locator('a:has(h2.font-display)');
  const n = await tarjetas.count();
  ok(n >= 6, `Equipo: ${n} profesionales en la grilla`);
  for (let i = 0; i < n; i++) {
    const t = tarjetas.nth(i);
    const nombre = (await t.locator('h2').innerText()).trim();
    const e = await contar(t.locator(SEL));
    ok(e.total === 5 && e.llenas === 5, `Equipo — ${nombre}: 5 estrellas llenas (${e.llenas}/${e.total})`);
    const foto = await t.locator('img').boundingBox();
    const ins = await t.locator(SEL).boundingBox();
    ok(ins.x >= foto.x - 0.5 && ins.x + ins.width <= foto.x + foto.width + 0.5 && ins.y >= foto.y - 0.5 && ins.y + ins.height <= foto.y + foto.height + 0.5, `Equipo — ${nombre}: las estrellas entran dentro de la foto (${Math.round(ins.width)}×${Math.round(ins.height)} px en una foto de ${Math.round(foto.width)} px)`);
  }
  ok((await desborde(p)) <= 0, 'Equipo: sin scroll horizontal en 360 px');
  if (SALIDA) { await tarjetas.first().scrollIntoViewIfNeeded(); await p.screenshot({ path: `${SALIDA}/estrellas_equipo.png`, clip: { x: 0, y: 150, width: 360, height: 560 } }); }
  await ctx.close();
}

// 3) Reserva, paso "Profesionales disponibles"
{
  const { p, ctx } = await pagina();
  await ir(p, '/reserva?servicioId=serv-pestanas-clasica');
  await p.getByRole('button', { name: /^\d\d:\d\d hs$/ }).first().waitFor({ timeout: 90000 });
  await p.waitForTimeout(9000); // que se estabilicen los horarios reales
  await p.getByRole('button', { name: /^\d\d:\d\d hs$/ }).first().click();
  await p.getByRole('button', { name: /Ver profesionales disponibles/ }).click();
  await p.getByText(/Profesionales disponibles el/).waitFor({ timeout: 60000 });
  await p.waitForTimeout(1500);
  const grupos = p.locator(SEL);
  const n = await grupos.count();
  ok(n >= 1, `Reserva: ${n} profesional(es) para elegir`);
  for (let i = 0; i < n; i++) {
    const e = await contar(grupos.nth(i));
    ok(e.total === 5 && e.llenas === 5, `Reserva: la tarjeta ${i + 1} muestra 5 estrellas llenas (${e.llenas}/${e.total})`);
  }
  ok((await desborde(p)) <= 0, 'Reserva: sin scroll horizontal en 360 px');
  if (SALIDA) { await grupos.first().scrollIntoViewIfNeeded(); await p.screenshot({ path: `${SALIDA}/estrellas_reserva.png`, clip: { x: 0, y: 180, width: 360, height: 360 } }); }
  await ctx.close();
}

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo OK');
await b.close();
process.exitCode = fallas ? 1 : 0;
