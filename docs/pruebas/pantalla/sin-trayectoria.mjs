// La web ya no menciona los años de trayectoria/experiencia de las profesionales (pedido de Tobias, 30/10/2026).
// Recorre el inicio, la página del equipo, los 6 perfiles y el paso "profesionales disponibles" de la reserva.
// Datos reales de lectura; toda escritura del navegador se aborta.
import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5189';
const SALIDA = process.env.SALIDA;
let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };
// "N años de trayectoria", "años de experiencia", "trayectoria", "N años en el rubro"…
const MENCION = /trayectoria|a[ñn]os de experiencia|\d+\s*a[ñn]os\s+(de|en|como)\b|experiencia de \d+/i;

const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];
async function pagina(ancho = 390, alto = 1400) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-AR' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  await p.route(/\/rest\/v1\/[a-z_]+/, (r) => (r.request().method() === 'GET' ? r.continue() : r.abort().catch(() => {})));
  return { p, ctx };
}
const ir = (p, ruta) => p.goto(BASE + ruta, { waitUntil: 'domcontentloaded', timeout: 180000 });
const texto = (p) => p.locator('body').innerText();

// 1) Inicio
{
  const { p, ctx } = await pagina();
  await ir(p, '/');
  await p.waitForTimeout(4000);
  ok(!MENCION.test(await texto(p)), 'Inicio: no menciona trayectoria ni años de experiencia');
  await ctx.close();
}

// 2) Página del equipo
{
  const { p, ctx } = await pagina();
  await ir(p, '/profesionales');
  await p.getByRole('heading', { name: /Conocé al equipo/ }).waitFor({ timeout: 60000 });
  const t = await texto(p);
  ok(!MENCION.test(t), 'Equipo: no menciona trayectoria ni años de experiencia');
  ok(/formación certificada en su especialidad/i.test(t), 'Equipo: la frase de presentación quedó "formación certificada en su especialidad"');
  await ctx.close();
}

// 3) Los 6 perfiles
for (const [slug, nombre] of [['yosy', 'Yosy'], ['mili', 'Mili'], ['roma', 'Roma'], ['cris', 'Cris'], ['ari', 'Ari'], ['vero', 'Vero']]) {
  const { p, ctx } = await pagina();
  await ir(p, `/profesionales/${slug}`);
  await p.getByRole('heading', { name: new RegExp(`Servicios que realiza ${nombre}`) }).waitFor({ timeout: 60000 });
  const t = await texto(p);
  ok(!MENCION.test(t), `${nombre}: el perfil no menciona trayectoria ni años de experiencia`);
  ok(/opiniones/.test(t) && new RegExp(`Reservar turno con ${nombre}`).test(t), `${nombre}: el perfil conserva la calificación y el botón de reservar`);
  const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(desborde <= 0, `${nombre}: sin scroll horizontal en el celular`);
  if (SALIDA && slug === 'mili') await p.screenshot({ path: `${SALIDA}/perfil_sin_trayectoria.png`, clip: { x: 0, y: 60, width: 390, height: 640 } });
  await ctx.close();
}

// 4) Reserva: paso "Profesionales disponibles"
{
  const { p, ctx } = await pagina();
  await ir(p, '/reserva?servicioId=serv-pestanas-clasica');
  const hora = p.getByRole('button', { name: /^\d\d:\d\d hs$/ }).first();
  await hora.waitFor({ timeout: 90000 });
  // La app arranca con horarios de ejemplo y los reemplaza al llegar los datos reales: esperar a que se estabilicen,
  // si no se toca un horario que desaparece ("Ese horario ya no está disponible").
  await p.waitForTimeout(9000);
  await p.getByRole('button', { name: /^\d\d:\d\d hs$/ }).first().click();
  await p.getByRole('button', { name: /Ver profesionales disponibles/ }).click();
  await p.getByText(/Profesionales disponibles el/).waitFor({ timeout: 60000 });
  await p.waitForTimeout(1500);
  const t = await texto(p);
  const tarjetas = await p.locator('h3.font-display').allInnerTexts();
  ok(tarjetas.length >= 1, `Reserva: se ven ${tarjetas.length} profesional(es) para elegir (${tarjetas.join(', ')})`);
  ok(!MENCION.test(t), 'Reserva: las tarjetas de profesionales no mencionan trayectoria ni años de experiencia');
  if (SALIDA) await p.screenshot({ path: `${SALIDA}/reserva_sin_trayectoria.png`, fullPage: false });
  await ctx.close();
}

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo OK');
await b.close();
process.exitCode = fallas ? 1 : 0;
