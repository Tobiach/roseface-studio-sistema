// scripts/pruebas/entorno.mjs
//
// Piezas compartidas por los scripts de pruebas (setup, pantalla, leer-base, lógica).
// No forma parte de la app: nada de esto se empaqueta en el sitio.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RAIZ_REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Carpeta FIJA, fuera del repo, donde vive playwright-core. Así no se borra con una carpeta temporal
// ni se versiona. Se puede cambiar con ROSEFACE_PRUEBAS_DIR.
export const DIR_HERRAMIENTAS = process.env.ROSEFACE_PRUEBAS_DIR || join(homedir(), '.roseface-pruebas');

export const tienePlaywright = () => existsSync(join(DIR_HERRAMIENTAS, 'node_modules', 'playwright-core', 'package.json'));

// Busca el Chromium que ya descargó Playwright (la versión cambia: no se fija ningún número).
export function buscarChromium() {
  if (process.env.CHROMIUM_EXE && existsSync(process.env.CHROMIUM_EXE)) return process.env.CHROMIUM_EXE;
  const so = platform();
  const bases = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    so === 'win32' ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'ms-playwright') : null,
    so === 'darwin' ? join(homedir(), 'Library', 'Caches', 'ms-playwright') : null,
    so === 'linux' ? join(homedir(), '.cache', 'ms-playwright') : null,
  ].filter(Boolean);
  const subrutas = ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux64/chrome', 'chrome-linux/chrome'];
  for (const base of bases) {
    if (!existsSync(base)) continue;
    const versiones = readdirSync(base)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const v of versiones) for (const sub of subrutas) {
      const exe = join(base, v, ...sub.split('/'));
      if (existsSync(exe)) return exe;
    }
  }
  return null;
}

// La carpeta del repo principal (el primer worktree): ahí están el .env.local y el vínculo con Vercel (.vercel),
// que no se versionan, así que un worktree nuevo no los tiene. Los comandos de `vercel` se corren desde acá.
export function repoPrincipal() {
  try {
    const salida = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: RAIZ_REPO, encoding: 'utf8' });
    const primera = salida.split(/\r?\n/).find((l) => l.startsWith('worktree '));
    return primera ? primera.slice('worktree '.length).trim() : RAIZ_REPO;
  } catch {
    return RAIZ_REPO;
  }
}

// Lee .env.local (de este worktree o, si no está, del principal). Devuelve un objeto; NUNCA imprimir sus valores.
export function cargarEnvLocal() {
  const candidatos = [join(RAIZ_REPO, '.env.local'), join(repoPrincipal(), '.env.local')];
  const archivo = candidatos.find((c) => existsSync(c));
  const env = {};
  if (!archivo) return env;
  for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return env;
}

export const ok = (c, m) => {
  console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
  return !!c;
};
