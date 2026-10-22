import { chromium } from 'playwright-core';
const exe = process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5189';
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await b.newContext({ viewport: { width: 1300, height: 1400 } });
const p = await ctx.newPage();
const errores = [];
p.on('pageerror', (e) => errores.push(e.message));
await p.route(/\/rest\/v1\/[a-z_]+/, (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
const resultados = {};
for (const [id, nombre] of [['mili', 'Mili'], ['roma', 'Roma'], ['yosy', 'Yosy']]) {
  await p.goto(`${BASE}/profesionales/${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // esperar a que lleguen los servicios reales de la base (aparece "ClÃ¡sicas Lash" en algÃºn lugar del perfil)
  await p.waitForFunction(() => /Cl[aÃ¡]sicas Lash/i.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {});
  const txt = await p.locator('body').innerText();
  const tiene = /Volumen Tecnol[oÃ³]gico/i.test(txt);
  const lista = [...new Set(txt.match(/Natural Volumen|Medio Volumen|Mega Volumen|Lash Rose Face|Volumen Tecnol[oÃ³]gico YY|Cl[aÃ¡]sicas Lash|H[iÃ­]bridas Lash|Efecto H[uÃº]medo|Volumen Brasilero \dD W|Lash Lifting/gi) || [])];
  resultados[id] = { tiene, lista, largo: txt.length };
  console.log(`${nombre}: ${tiene ? 'LISTA' : 'NO lista'} Volumen TecnolÃ³gico | pestaÃ±as visibles: ${lista.join(', ') || 'â€”'} (texto ${txt.length} car.)`);
}
ok(resultados['yosy'].lista.length > 0, 'La pÃ¡gina sÃ­ muestra servicios (control: Yosy tiene pestaÃ±as)');
ok(resultados['mili'].tiene, 'Mili figura en Volumen TecnolÃ³gico en su perfil pÃºblico');
ok(!resultados['mili'].lista.some((s) => /Natural Volumen|Medio Volumen|Mega Volumen|Lash Rose Face/i.test(s)), 'Mili NO figura en los otros 4');
ok(resultados['roma'].tiene && resultados['yosy'].tiene, 'Roma y Yosy siguen con Volumen TecnolÃ³gico');
console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();

