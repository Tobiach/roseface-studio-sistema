// Desbloquear un horario tocándolo en el calendario de la Agenda (pedido del 29/10, publicado el 30/10; no se había probado en pantalla).
// Usa los bloqueos REALES de la base y aborta/intercepta todo borrado: NO elimina nada.
// Corre como Yosy (admin) y como Mili (profesional): las dos tienen que poder ver el cuadrito gris, confirmar y mandar el borrado de ESE bloqueo.
import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5189';
const U = process.env.VITE_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SALIDA = process.env.SALIDA;
let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };

// Un bloqueo real y futuro de Mili (se lee de la base; si no hay, la prueba lo dice y no inventa nada)
const filas = await (await fetch(`${U}/rest/v1/bloqueos_horario?select=id,profesional_id,fecha,hora_inicio,hora_fin,dia_completo&profesional_id=eq.prof-mili&order=fecha`, { headers: { apikey: K, Authorization: `Bearer ${K}` } })).json();
const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const bloqueo = filas.find((f) => f.fecha >= hoy);
if (!bloqueo) { console.log('No hay ningún bloqueo futuro de Mili en la base: no se puede probar con datos reales.'); process.exit(2); }
const mismosDelDia = filas.filter((f) => f.fecha === bloqueo.fecha);
console.log(`Bloqueos de Mili el ${bloqueo.fecha}: ${mismosDelDia.map((f) => `#${f.id} ${String(f.hora_inicio).slice(0, 5)}-${String(f.hora_fin).slice(0, 5)}`).join(', ')}`);

const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];

async function probar(titulo, acceso, ancho) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: 1500 }, locale: 'es-AR' });
  await ctx.addInitScript((a) => localStorage.setItem('roseface_acceso', JSON.stringify(a)), acceso);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  const borrados = [];
  await p.route(/\/rest\/v1\/[a-z_]+/, async (r) => {
    try {
      const req = r.request();
      if (req.method() === 'GET') return await r.continue();
      if (req.method() === 'DELETE') { borrados.push(new URL(req.url()).pathname.split('/').pop() + new URL(req.url()).search); return await r.fulfill({ status: 204, body: '' }); }
      return await r.abort(); // cualquier otra escritura (p. ej. la limpieza automática de holds de la app)
    } catch { /* la página se cerró */ }
  });
  await p.goto(BASE + '/admin/agenda', { waitUntil: 'domcontentloaded', timeout: 180000 });
  const dia = p.locator('input[aria-label="Ir a un día"]');
  await dia.waitFor({ timeout: 90000 });
  await p.waitForTimeout(6000); // que lleguen los datos reales
  await dia.fill(bloqueo.fecha);
  await p.waitForTimeout(2500);

  const celdas = p.locator('button[title$="tocar para desbloquear"]');
  const n = await celdas.count();
  ok(n >= 1, `${titulo}: el ${bloqueo.fecha} se ven ${n} cuadrito(s) gris(es) de horario bloqueado, y son botones`);
  if (n < 1) { await ctx.close(); return; }
  if (SALIDA) await p.screenshot({ path: `${SALIDA}/desbloqueo_${titulo.replace(/\W+/g, '_')}_1.png`, fullPage: false });

  // 1) Tocar y cancelar: no se borra nada
  await celdas.first().scrollIntoViewIfNeeded();
  await celdas.first().click();
  const cartel = p.getByRole('heading', { name: /¿Desbloquear este horario\?/ });
  await cartel.waitFor({ timeout: 15000 }).catch(() => {});
  ok(await cartel.count() === 1, `${titulo}: al tocar el cuadrito aparece "¿Desbloquear este horario?"`);
  const textoCartel = (await p.locator('div.fixed', { has: cartel }).innerText().catch(() => '')).replace(/\s+/g, ' ');
  ok(/Mili/.test(textoCartel) && /\d\d:\d\d a \d\d:\d\d hs|Todo el día/.test(textoCartel), `${titulo}: el cartel dice de quién es y qué horario (${textoCartel.slice(0, 120)})`);
  if (SALIDA) await p.screenshot({ path: `${SALIDA}/desbloqueo_${titulo.replace(/\W+/g, '_')}_2.png`, fullPage: false });
  const cancelar = p.locator('div.fixed', { has: cartel }).getByRole('button', { name: /Cancelar|No|Volver|Dejarlo/i }).first();
  await cancelar.click();
  await p.waitForTimeout(800);
  ok((await cartel.count()) === 0 && borrados.length === 0, `${titulo}: cancelar cierra el cartel y NO manda ningún borrado`);

  // 2) Tocar y confirmar: se manda el borrado de ESE bloqueo (interceptado: no se borra de verdad)
  await celdas.first().click();
  await cartel.waitFor({ timeout: 15000 });
  await p.getByRole('button', { name: /Sí, desbloquear/ }).click();
  await p.waitForTimeout(2000);
  ok(borrados.length === 1 && /^bloqueos_horario\?id=eq\.\d+$/.test(borrados[0]), `${titulo}: confirmar manda UN solo borrado de un bloqueo (${borrados.join(', ') || 'ninguno'})`);
  ok(mismosDelDia.some((f) => borrados[0] === `bloqueos_horario?id=eq.${f.id}`), `${titulo}: es el borrado de un bloqueo real de Mili de ese día`);
  ok((await cartel.count()) === 0, `${titulo}: el cartel se cierra solo`);
  await ctx.close();
}

await probar('Yosy (admin)', { rol: 'admin', token: 'tok' }, 1400);
await probar('Mili (profesional)', { rol: 'profesional', profesionalId: 'prof-mili', token: 'tok' }, 1400);

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo OK');
await b.close();
process.exitCode = fallas ? 1 : 0;
