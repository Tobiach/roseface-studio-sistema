import { chromium } from 'playwright-core';

const exe = process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = 'http://localhost:5199';
const out = [];
const ok = (cond, msg) => out.push(`${cond ? 'OK  ' : 'FALLA'} ${msg}`);

const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));

// El endpoint de PIN no existe en vite dev: se simula la respuesta del servidor.
let rolSimulado = { ok: true, rol: 'profesional', profesionalId: 'prof-mili', nombre: 'Mili' };
await page.route('**/api/verificar-pin', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rolSimulado) })
);

// --- Home
await page.goto(BASE + '/');
const body = await page.locator('body').innerText();
ok(body.includes('ROSE FACE STUDIO · CABALLITO') || /rose face studio · caballito/i.test(body), 'Home: "Rose Face Studio · Caballito"');
ok(!/cabello/i.test(body), 'Home: ya no dice "Cabello"');
ok(/Pestañas · Uñas · Bienestar/.test(body), 'Home: "Pestañas · Uñas · Bienestar"');
ok(/Conocé a Rose Face Studio/i.test(body), 'Home: "Conocé a Rose Face Studio"');
ok(!/Conocé a Yosy/i.test(body), 'Home: ya no dice "Conocé a Yosy"');
ok(/Estamos en Caballito/.test(body), 'Home: "Estamos en Caballito" se mantiene');
ok(!/Anye/.test(body), 'Home: Anye no aparece');

// --- Equipo + perfil directo de Anye
await page.goto(BASE + '/profesionales');
ok(!/Anye/.test(await page.locator('body').innerText()), 'Equipo: Anye no aparece');
await page.goto(BASE + '/profesionales/anye');
await page.waitForTimeout(400);
ok(!/Anye/.test(await page.locator('body').innerText()), 'Perfil directo /profesionales/anye: no muestra a Anye');

// --- PIN profesional -> panel directo
await page.goto(BASE + '/');
await page.getByRole('button', { name: /^Profesional$/ }).first().click();
await page.locator('input[type=password]').fill('1234');
await page.getByRole('button', { name: 'Entrar', exact: true }).click();
await page.waitForURL('**/admin/agenda', { timeout: 5000 }).catch(() => {});
ok(page.url().endsWith('/admin/agenda'), `PIN profesional redirige al panel (url: ${page.url()})`);
ok(!(await page.locator('input[type=password]').count()), 'PIN profesional: el modal se cerró');

// --- PIN admin desde el botón "Admin" -> panel directo
await page.evaluate(() => localStorage.clear());
rolSimulado = { ok: true, rol: 'admin', profesionalId: null, nombre: null };
await page.goto(BASE + '/');
await page.getByRole('button', { name: /Admin/ }).first().click();
await page.locator('input[type=password]').fill('9999');
await page.getByRole('button', { name: 'Entrar', exact: true }).click();
await page.waitForURL('**/admin/agenda', { timeout: 5000 }).catch(() => {});
ok(page.url().endsWith('/admin/agenda'), `PIN admin redirige al panel (url: ${page.url()})`);

// --- PIN incorrecto no redirige
await page.evaluate(() => localStorage.clear());
rolSimulado = { ok: false };
await page.goto(BASE + '/');
await page.getByRole('button', { name: /Admin/ }).first().click();
await page.locator('input[type=password]').fill('0000');
await page.getByRole('button', { name: 'Entrar', exact: true }).click();
await page.waitForTimeout(600);
ok(new URL(page.url()).pathname === '/' && /PIN incorrecto/.test(await page.locator('body').innerText()), 'PIN incorrecto: se queda en la home con error');

// --- Panel de servicios extra (admin, datos mock)
await page.evaluate(() => localStorage.clear());
rolSimulado = { ok: true, rol: 'admin', profesionalId: null, nombre: null };
await page.goto(BASE + '/');
await page.getByRole('button', { name: /Admin/ }).first().click();
await page.locator('input[type=password]').fill('9999');
await page.getByRole('button', { name: 'Entrar', exact: true }).click();
await page.waitForURL('**/admin/agenda');
// ampliar el rango para que haya turnos mock a la vista
await page.getByRole('button', { name: 'Rango a elección' }).click();
await page.locator('input[type=date]').nth(0).fill('2026-08-12');
await page.locator('input[type=date]').nth(1).fill('2026-08-13');
await page.waitForTimeout(500);
const tarjeta = page.locator('div[class*="border-l-"][class*="cursor-pointer"]').first();
const cant = await tarjeta.count();
ok(cant > 0, 'Agenda: hay al menos una tarjeta de turno para abrir');
if (cant > 0) {
  await tarjeta.click();
  const btn = page.getByRole('button', { name: /Vino — confirmar servicios|Editar servicios realizados/ });
  ok(await btn.count() > 0, 'Modal de turno: botón "Vino — confirmar servicios"');
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(200);
    const t0 = await page.locator('body').innerText();
    ok(/¿Qué servicios se hizo\?|Servicios realizados/.test(t0), 'Se abre el panel de servicios realizados');
    const totalAntes = t0.match(/Total del turno\s*\n?\s*\$\s?([\d.]+)/);
    // agregar un extra a mano
    await page.getByPlaceholder('Nombre del servicio').fill('Retiro común');
    await page.getByPlaceholder('Precio').fill('3000');
    await page.getByRole('button', { name: /Agregar al turno/ }).click();
    const t1 = await page.locator('body').innerText();
    const totalDespues = t1.match(/Total del turno\s*\n?\s*\$\s?([\d.]+)/);
    ok(/Retiro común/.test(t1) && /\(extra\)/.test(t1), 'El extra queda listado como (extra)');
    const n = (m) => (m ? Number(m[1].replace(/\./g, '')) : NaN);
    ok(n(totalDespues) - n(totalAntes) === 3000, `Total sube exactamente $3.000 (${n(totalAntes)} -> ${n(totalDespues)})`);
    // confirmar
    await page.getByRole('button', { name: /Confirmar que vino/ }).click();
    await page.waitForTimeout(500);
    const t2 = await page.locator('body').innerText();
    ok(/Turno completado y servicios registrados/.test(t2), 'Confirmar: toast de turno completado con servicios');
    // reabrir el mismo turno y chequear el desglose
    const tarjetaDeNuevo = page.locator('div[class*="cursor-pointer"]', { hasText: /Completado|completado/ }).first();
    if (await tarjetaDeNuevo.count()) {
      await tarjetaDeNuevo.click();
      const t3 = await page.locator('body').innerText();
      ok(/Extras:\s*Retiro común/.test(t3), 'Reabrir turno completado: muestra "Extras: Retiro común"');
    }
  }
}

ok(errores.length === 0, `Sin errores de JS en consola (${errores.join(' | ') || 'ninguno'})`);
console.log(out.join('\n'));
await browser.close();
