// scripts/pruebas/verificar-deploy.mjs  ->  npm run verificar:deploy
//
// Verificación de SOLO LECTURA de lo que está en producción. No necesita claves ni PIN y no guarda nada:
//   1) la página principal responde y no queda cacheada de más;
//   2) el bundle (assets/index-*.js) trae los textos nuevos y NO trae los viejos (scripts/pruebas/deploy-esperado.json);
//   3) los endpoints sensibles rechazan los pedidos sin permiso (401/405) con cuerpos vacíos: no se crea ni cambia nada;
//   4) (opcional, --vercel) muestra los últimos deploys de producción con el CLI de Vercel.
// Uso:  npm run verificar:deploy [-- --vercel] [-- --url https://otra-url] [-- --tiene "texto"] [-- --no-tiene "texto"]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAIZ_REPO, repoPrincipal, ok } from './entorno.mjs';

const config = JSON.parse(readFileSync(join(RAIZ_REPO, 'scripts', 'pruebas', 'deploy-esperado.json'), 'utf8'));
const args = process.argv.slice(2);
const valores = (flag) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]] : []));
const url = (valores('--url')[0] ?? config.url).replace(/\/$/, '');
const debeTener = [...config.bundleDebeTener, ...valores('--tiene')];
const noDebeTener = [...config.bundleNoDebeTener, ...valores('--no-tiene')];

let fallas = 0;
const verificar = (c, m) => {
  if (!ok(c, m)) fallas++;
};

// 1) Página principal y bundle
const indice = await fetch(url + '/', { headers: { 'Cache-Control': 'no-cache' } });
const html = await indice.text();
const cache = indice.headers.get('cache-control') ?? '';
verificar(indice.status === 200, `La página principal responde 200 (${indice.status})`);
verificar(/must-revalidate|max-age=0|no-cache/.test(cache), `index.html no queda cacheado en los celulares (cache-control: ${cache || 'vacío'})`);
const ruta = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
verificar(!!ruta, `Bundle actual: ${ruta ?? 'no encontrado'}`);

// 2) Contenido del bundle
if (ruta) {
  const js = await (await fetch(`${url}/${ruta}`)).text();
  for (const t of debeTener) verificar(js.includes(t), `El bundle TRAE: "${t}"`);
  for (const t of noDebeTener) verificar(!js.includes(t), `El bundle NO trae: "${t}"`);
}

// 3) Endpoints que deben rechazar lo que no tiene permiso
for (const e of config.endpointsQueDebenRechazar) {
  const r = await fetch(url + e.ruta, {
    method: e.metodo,
    headers: { 'Content-Type': 'application/json' },
    body: e.metodo === 'POST' ? '{}' : undefined,
  });
  verificar(r.status === e.sinPermiso, `${e.metodo} ${e.ruta} (${e.nota}) -> ${r.status} (esperado ${e.sinPermiso})`);
}

// 4) Deploys recientes (necesita el CLI de Vercel ya autenticado)
if (args.includes('--vercel')) {
  console.log('\nÚltimos deploys de producción (vercel ls):');
  // Se corre desde la carpeta principal: es la que está vinculada al proyecto de Vercel.
  const r = spawnSync('npx vercel ls --prod', { cwd: repoPrincipal(), encoding: 'utf8', shell: true });
  const texto = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '');
  const filas = texto.split(/\r?\n/).filter((l) => /\b(Ready|Building|Error|Queued|Canceled)\b|^\s*Age\b/.test(l));
  console.log(filas.length ? filas.slice(0, 4).map((l) => l.replace(/\s{2,}/g, '  ').trim()).join('\n') : '(no se pudo leer la lista: ¿vercel sin sesión?)');
}

console.log(`\n${fallas ? `${fallas} FALLA(S)` : 'Todo OK'} en ${url}`);
process.exitCode = fallas ? 1 : 0;
