// scripts/pruebas/setup.mjs  ->  npm run setup:pruebas
//
// Deja listo el entorno de las pruebas de PANTALLA: instala playwright-core en una carpeta fija FUERA del repo
// (~/.roseface-pruebas) y comprueba que haya un Chromium. No toca la base ni Vercel.
//   npm run setup:pruebas                      -> instala/verifica
//   npm run setup:pruebas -- --instalar-chromium  -> además baja Chromium (~150 MB) si no hay uno
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DIR_HERRAMIENTAS, buscarChromium, tienePlaywright, ok } from './entorno.mjs';

const correr = (cmd, args) => spawnSync([cmd, ...args].join(' '), { cwd: DIR_HERRAMIENTAS, stdio: 'inherit', shell: true });

mkdirSync(DIR_HERRAMIENTAS, { recursive: true });
const pkg = join(DIR_HERRAMIENTAS, 'package.json');
if (!existsSync(pkg)) writeFileSync(pkg, JSON.stringify({ name: 'roseface-pruebas', private: true, type: 'module' }, null, 2));

if (!tienePlaywright()) {
  console.log(`Instalando playwright-core en ${DIR_HERRAMIENTAS} …`);
  const r = correr('npm', ['i', 'playwright-core', '--no-audit', '--no-fund', '--silent']);
  if (r.status !== 0) console.log('No se pudo instalar playwright-core (¿sin conexión?).');
}

let exe = buscarChromium();
if (!exe && process.argv.includes('--instalar-chromium') && tienePlaywright()) {
  console.log('Bajando Chromium …');
  correr('node', [join('node_modules', 'playwright-core', 'cli.js'), 'install', 'chromium']);
  exe = buscarChromium();
}

let version = '—';
try {
  version = JSON.parse(readFileSync(join(DIR_HERRAMIENTAS, 'node_modules', 'playwright-core', 'package.json'), 'utf8')).version;
} catch {
  /* sin instalar */
}
console.log('');
const a = ok(tienePlaywright(), `playwright-core ${version} en ${DIR_HERRAMIENTAS}`);
const b = ok(!!exe, exe ? `Chromium: ${exe}` : 'Chromium no encontrado: correr  npm run setup:pruebas -- --instalar-chromium');
process.exit(a && b ? 0 : 1);
