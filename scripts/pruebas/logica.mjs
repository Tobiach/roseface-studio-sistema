// scripts/pruebas/logica.mjs  ->  npm run test:logica
//
// Corre TODAS las pruebas de lógica y de servidor de docs/pruebas/ (sin navegador, sin red, sin base real):
//   - docs/pruebas/servidor/*   -> api/editar-turno.ts compilado contra una base FALSA en memoria
//   - docs/pruebas/logica/*     -> src/lib/{disponibilidad,whatsapp,comisionesEngine}.ts
// Varias pruebas terminan con process.exit(0) aunque tengan fallas (solo las imprimen), así que el resultado se
// decide leyendo las líneas "OK   " / "FALLA" de cada una. Sale con código 1 si hay cualquier falla.
import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAIZ_REPO } from './entorno.mjs';

const PRUEBAS = join(RAIZ_REPO, 'docs', 'pruebas');
const tmp = mkdtempSync(join(tmpdir(), 'roseface-logica-'));

try {
  // 1) Compilar lo que las pruebas importan como ./algo.mjs
  copyFileSync(join(PRUEBAS, 'servidor', 'fake-supabase.mjs'), join(tmp, 'fake-supabase.mjs'));
  const comun = { bundle: true, platform: 'node', format: 'esm', logLevel: 'error' };
  await build({
    ...comun,
    entryPoints: [join(RAIZ_REPO, 'api', 'editar-turno.ts')],
    outfile: join(tmp, 'editar-turno.mjs'),
    alias: { '@supabase/supabase-js': join(tmp, 'fake-supabase.mjs') },
  });
  // Cada prueba importa lo que compila acá como ./nombre.mjs. Si una librería todavía no existe en esta rama
  // (por ejemplo instagram.ts antes de juntar las ramas), se saltea en vez de romper todo.
  for (const [fuente, salida] of [
    ['src/lib/disponibilidad.ts', 'disp.mjs'],
    ['src/lib/whatsapp.ts', 'wa2.mjs'],
    ['src/lib/comisionesEngine.ts', 'eng.mjs'],
    ['src/lib/instagram.ts', 'ig.mjs'],
  ]) {
    if (!existsSync(join(RAIZ_REPO, fuente))) continue;
    await build({ ...comun, entryPoints: [join(RAIZ_REPO, fuente)], outfile: join(tmp, salida) });
  }

  // 2) Correr cada prueba
  const scripts = [];
  for (const dir of ['servidor', 'logica']) {
    for (const f of readdirSync(join(PRUEBAS, dir)).filter((x) => x.endsWith('.mjs') && x !== 'fake-supabase.mjs')) {
      mkdirSync(join(tmp, dir), { recursive: true });
      copyFileSync(join(PRUEBAS, dir, f), join(tmp, f));
      scripts.push({ dir, f });
    }
  }

  let casos = 0;
  let fallas = 0;
  for (const { dir, f } of scripts) {
    const r = spawnSync(process.execPath, [join(tmp, f)], {
      cwd: tmp,
      encoding: 'utf8',
      timeout: 120_000,
      // La lógica de fechas del sistema es la de Argentina: se fija para que el resultado no dependa de la máquina.
      env: { ...process.env, TZ: 'America/Argentina/Buenos_Aires' },
    });
    const lineas = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.split(/\r?\n/);
    const buenas = lineas.filter((l) => /^OK\s/.test(l)).length;
    const malas = lineas.filter((l) => /^FALLA/.test(l));
    const colgada = r.error?.code === 'ETIMEDOUT';
    const roto = r.status !== 0 && malas.length === 0; // terminó con error sin imprimir FALLA (excepción, import roto…)
    const sinCasos = buenas === 0 && malas.length === 0;
    casos += buenas + malas.length;
    const mal = malas.length > 0 || colgada || roto || sinCasos;
    if (mal) fallas += Math.max(1, malas.length);
    console.log(`${mal ? 'FALLA' : 'OK   '} ${dir}/${f}: ${buenas} bien, ${malas.length} con falla${colgada ? ' (se colgó)' : ''}${roto ? ' (terminó con error)' : ''}${sinCasos ? ' (no corrió ningún caso)' : ''}`);
    if (mal) {
      for (const l of malas.slice(0, 10)) console.log(`        ${l}`);
      if (roto || sinCasos) console.log(lineas.filter(Boolean).slice(-8).map((l) => `        ${l}`).join('\n'));
    }
  }
  console.log(`\n${scripts.length} archivos, ${casos} casos, ${fallas} falla(s)`);
  process.exitCode = fallas ? 1 : 0;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
