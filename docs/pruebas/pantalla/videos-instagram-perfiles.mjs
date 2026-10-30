// Perfil de cada profesional con su reel de Instagram (30/10/2026).
// Lee los datos REALES, pero a la respuesta de /rest/v1/profesionales le inyecta los 5 links de Instagram (NO escribe nada en la base):
// sirve para probar el código ANTES de cargar los links en la base. Toda escritura del navegador se aborta.
import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5189';
const SALIDA = process.env.SALIDA; // carpeta para las capturas (opcional)
const INYECTAR = process.env.INYECTAR !== '0'; // INYECTAR=0 -> probar contra lo que ya está en la base (después de cargarlo)
let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };

const reels = {
  'prof-sharon': { slug: 'roma', nombre: 'Roma', codigo: 'DfDi89TR6Md', url: 'https://www.instagram.com/reel/DfDi89TR6Md/?psln=cmtlNzJ2NTlmem40' },
  'prof-mili': { slug: 'mili', nombre: 'Mili', codigo: 'DfDjgatxHLq', url: 'https://www.instagram.com/reel/DfDjgatxHLq/?rpxt=NWtzYmYybzNzZ21w' },
  'prof-yosy': { slug: 'yosy', nombre: 'Yosy', codigo: 'DdsKYi-ppp7', url: 'https://www.instagram.com/reel/DdsKYi-ppp7/?vrfl=MTA1OHkya2oyY2xkZw==' },
  'prof-sofia': { slug: 'cris', nombre: 'Cris', codigo: 'DextWMdxdrH', url: 'https://www.instagram.com/reel/DextWMdxdrH/?exln=MTM2ZjJocWQ4aGl4bw==' },
  'prof-alexandra': { slug: 'ari', nombre: 'Ari', codigo: 'Defyk8txbMo', url: 'https://www.instagram.com/reel/Defyk8txbMo/?dlrf=MWRmc3RzNnRxMHFrcQ==' },
};

const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];
async function pagina(ancho, alto = 900) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-AR' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.escrituras = [];
  await p.route(/\/rest\/v1\/[a-z_]+/, async (r) => {
    try {
      const req = r.request();
      if (req.method() !== 'GET') { p.escrituras.push(req.method()); return await r.abort(); }
      if (INYECTAR && /\/rest\/v1\/profesionales/.test(req.url())) {
        const resp = await r.fetch();
        const filas = await resp.json();
        for (const f of filas) if (reels[f.id]) f.video_url = reels[f.id].url;
        return await r.fulfill({ response: resp, body: JSON.stringify(filas) });
      }
      return await r.continue();
    } catch {
      /* la página se cerró mientras este pedido seguía en camino: no es una falla de la prueba */
    }
  });
  return { p, ctx };
}

// 1) Cada perfil, en un celular chico (360 px): reel correcto, reproductor cargado, tamaño exacto, sin desborde
for (const [id, r] of Object.entries(reels)) {
  const { p, ctx } = await pagina(360);
  await p.goto(`${BASE}/profesionales/${r.slug}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const titulo = p.getByRole('heading', { name: `Conocé a ${r.nombre}` });
  await titulo.waitFor({ timeout: 60000 }).catch(() => {});
  ok(await titulo.count() > 0, `${r.nombre}: el perfil muestra "Conocé a ${r.nombre}"`);
  const iframe = p.locator('iframe[src*="instagram.com/reel/"]');
  ok((await iframe.count()) === 1, `${r.nombre}: hay un solo reproductor de Instagram`);
  if ((await iframe.count()) !== 1) { await ctx.close(); continue; }
  ok((await iframe.getAttribute('src')) === `https://www.instagram.com/reel/${r.codigo}/embed/`, `${r.nombre}: apunta al reel ${r.codigo} (sin parámetros de seguimiento)`);
  await iframe.scrollIntoViewIfNeeded();
  const frame = await (await iframe.elementHandle()).contentFrame();
  const hayVideo = await frame.waitForSelector('video', { timeout: 45000 }).then(() => true).catch(() => false);
  ok(hayVideo, `${r.nombre}: el reproductor de Instagram cargó el video dentro de la página`);
  const caja = await iframe.boundingBox();
  const esperado = 1.25 * caja.width + 218;
  ok(Math.abs(caja.height - esperado) <= 2, `${r.nombre}: la caja mide ${Math.round(caja.width)}×${Math.round(caja.height)} px (esperado alto ${Math.round(esperado)})`);
  const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(desborde <= 0, `${r.nombre}: no hay scroll horizontal en un celular de 360 px (sobra ${desborde} px)`);
  const dentro = await frame.evaluate(() => { const v = document.querySelector('video')?.getBoundingClientRect(); const bm = Math.max(...[...document.querySelectorAll('body *')].map((e) => e.getBoundingClientRect().bottom)); return { video: !!v, contenidoHasta: Math.round(bm), alto: window.innerHeight }; });
  ok(dentro.contenidoHasta <= dentro.alto + 2, `${r.nombre}: no queda cortado ni sobra espacio dentro de la caja (contenido hasta ${dentro.contenidoHasta} de ${dentro.alto} px)`);
  if (SALIDA && id === 'prof-mili') await p.screenshot({ path: `${SALIDA}/perfil_mili_360.png`, fullPage: false, clip: { x: 0, y: Math.max(0, caja.y - 80), width: 360, height: Math.min(900, caja.height + 120) } });
  ok(p.escrituras.every((w) => w === 'PATCH'), `${r.nombre}: la página no intentó escribir nada en la base (solo la limpieza automática de holds de la app: ${[...new Set(p.escrituras)].join(',') || 'ninguna'})`);
  await ctx.close();
}

// 2) En PC (1280 px) el reproductor no se estira
{
  const { p, ctx } = await pagina(1280, 1000);
  await p.goto(`${BASE}/profesionales/mili`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.locator('iframe[src*="instagram.com/reel/"]').waitFor({ timeout: 60000 });
  const caja = await p.locator('iframe[src*="instagram.com/reel/"]').boundingBox();
  ok(caja.width <= 381 && caja.width >= 300, `PC: el reproductor queda angosto y centrado (${Math.round(caja.width)} px de ancho)`);
  if (SALIDA) { await p.locator('iframe[src*="instagram.com/reel/"]').scrollIntoViewIfNeeded(); await p.waitForTimeout(5000); await p.screenshot({ path: `${SALIDA}/perfil_mili_pc.png` }); }
  await ctx.close();
}

// 3) Control: quien tiene un video de YouTube lo sigue viendo igual
{
  const { p, ctx } = await pagina(390);
  await p.goto(`${BASE}/profesionales/vero`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.getByRole('heading', { name: /Conocé a Vero/ }).waitFor({ timeout: 60000 }).catch(() => {});
  ok((await p.locator('button[aria-label^="Reproducir"]').count()) === 1 && (await p.locator('iframe[src*="instagram.com"]').count()) === 0, 'Vero (video de YouTube): se sigue viendo con el reproductor de YouTube, sin Instagram');
  await ctx.close();
}

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo OK');
await b.close();
process.exitCode = fallas ? 1 : 0;
