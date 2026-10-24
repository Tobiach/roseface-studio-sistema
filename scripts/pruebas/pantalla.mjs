// scripts/pruebas/pantalla.mjs  ->  npm run pruebas:pantalla -- <nombre> [--puerto N]
//
// Corre UNA prueba de pantalla de docs/pruebas/pantalla/ con Chromium real:
//   1) levanta la app (vite) en un puerto libre, leyendo datos REALES con las claves de .env.local;
//   2) corre la prueba (que intercepta y aborta toda escritura a la base) desde ~/.roseface-pruebas, donde vive
//      playwright-core;
//   3) apaga el servidor y sale con código 1 si alguna línea dice FALLA.
// Ver la lista:  npm run pruebas:pantalla -- --lista      Preparar el entorno:  npm run setup:pruebas
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { DIR_HERRAMIENTAS, RAIZ_REPO, buscarChromium, cargarEnvLocal, tienePlaywright } from './entorno.mjs';

const DIR_PANTALLA = join(RAIZ_REPO, 'docs', 'pruebas', 'pantalla');
const disponibles = readdirSync(DIR_PANTALLA).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''));
const args = process.argv.slice(2);

if (args.includes('--lista') || args.length === 0) {
  console.log('Pruebas de pantalla disponibles:\n  ' + disponibles.join('\n  '));
  process.exit(args.length === 0 ? 1 : 0);
}

const nombre = args.find((a) => !a.startsWith('--'))?.replace(/\.mjs$/, '');
if (!nombre || !disponibles.includes(nombre)) {
  console.log(`No existe la prueba "${nombre}". Probá con --lista.`);
  process.exit(1);
}
const exe = buscarChromium();
if (!tienePlaywright() || !exe) {
  console.log('Falta playwright-core o Chromium: correr primero  npm run setup:pruebas');
  process.exit(1);
}

const env = cargarEnvLocal();
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.log('No encuentro .env.local con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (ni acá ni en el repo principal).');
  process.exit(1);
}

const puertoLibre = () =>
  new Promise((resolver) => {
    const s = createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => resolver(port));
    });
  });
const idx = args.indexOf('--puerto');
const puerto = idx >= 0 ? Number(args[idx + 1]) : await puertoLibre();
const base = `http://localhost:${puerto}`;

const esWin = process.platform === 'win32';
const servidor = spawn(`npx vite --port ${puerto} --strictPort`, {
  cwd: RAIZ_REPO,
  shell: true,
  detached: !esWin,
  stdio: 'ignore',
  // Vite toma las variables VITE_* también del entorno del proceso: así no hace falta copiar .env.local al worktree.
  env: { ...process.env, ...Object.fromEntries(Object.entries(env).filter(([k]) => k.startsWith('VITE_'))) },
});
const apagar = () => {
  try {
    if (esWin) spawnSync('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-servidor.pid);
  } catch {
    /* ya estaba apagado */
  }
};
process.on('exit', apagar);
process.on('SIGINT', () => process.exit(130));

let listo = false;
for (let i = 0; i < 120 && !listo; i++) {
  try {
    listo = (await fetch(base)).ok;
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
if (!listo) {
  console.log('La app no levantó en 120 s.');
  apagar();
  process.exit(1);
}
// Precalentamiento: la primera carga de Vite en una carpeta nueva optimiza las dependencias y puede tardar minutos.
// Pedir el punto de entrada hace esa espera ACÁ (con tiempo de sobra) y no dentro de la prueba, que tiene timeouts cortos.
console.log('Precalentando la app (la primera vez en una carpeta nueva puede tardar unos minutos) …');
try {
  await fetch(`${base}/src/main.tsx`, { signal: AbortSignal.timeout(420_000) });
} catch {
  console.log('(el precalentamiento tardó más de 7 minutos: sigo igual)');
}

const copia = join(DIR_HERRAMIENTAS, `${nombre}.mjs`);
copyFileSync(join(DIR_PANTALLA, `${nombre}.mjs`), copia);
console.log(`Corriendo ${nombre} contra ${base} …\n`);

const hijo = spawn(process.execPath, [copia], {
  cwd: DIR_HERRAMIENTAS,
  // Las claves de .env.local quedan dentro del proceso hijo (las pruebas las usan para calcular lo esperado); no se imprimen.
  env: { ...process.env, ...env, BASE_URL: base, CHROMIUM_EXE: exe, TZ: 'America/Argentina/Buenos_Aires' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let salida = '';
const volcar = (d) => {
  salida += d;
  process.stdout.write(d);
};
hijo.stdout.on('data', volcar);
hijo.stderr.on('data', volcar);
// 'exit' y no 'close': Chromium puede dejar abierto el canal de salida heredado y 'close' nunca llegaría.
const codigo = await new Promise((r) => hijo.on('exit', (c) => r(c ?? 1)));
await new Promise((r) => setTimeout(r, 500)); // deja volcar las últimas líneas
hijo.stdout.destroy();
hijo.stderr.destroy();
apagar(); // explícito: sin esto el servidor mantiene vivo el proceso y el corredor nunca termina
const fallas = salida.split(/\r?\n/).filter((l) => /^FALLA/.test(l)).length;
const casos = salida.split(/\r?\n/).filter((l) => /^OK\s/.test(l)).length + fallas;
const explotó = codigo !== 0 && fallas === 0;
console.log(
  `\n${fallas ? `${fallas} FALLA(S) de ${casos} casos` : explotó ? 'La prueba TERMINÓ CON ERROR (no llegó a correr todos los casos)' : `Sin fallas (${casos} casos)`} (código de salida de la prueba: ${codigo})`
);
process.exitCode = fallas || codigo || casos === 0 ? 1 : 0;
