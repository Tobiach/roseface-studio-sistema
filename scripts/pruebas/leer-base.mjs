// scripts/pruebas/leer-base.mjs  ->  npm run leer:base -- <tabla> ["consulta PostgREST"] [--contar] [--sin-mascara]
//
// Lector de SOLO LECTURA de la base real. Solo hace pedidos GET (el código no tiene ningún camino de escritura) y,
// salvo --sin-mascara, enmascara teléfonos, mails, claves, PIN, CBU/alias y ids de pago.
// Hasta que exista un rol de base de solo lectura (Sprint 2) usa la service key de .env.local: por eso lo importante es
// que ESTE script no pueda escribir. Para investigar usar siempre esto en vez de armar scripts con fetch propios.
//   npm run leer:base -- turnos "select=id,estado,fecha&estado=eq.completado&order=id.desc&limit=5"
//   npm run leer:base -- turnos "estado=eq.cancelado" --contar
import { cargarEnvLocal } from './entorno.mjs';

const TABLAS_PERMITIDAS = /^[a-z_]+$/;
const SENSIBLES = /tel|phone|mail|pin|codigo|clave|key|token|secret|cbu|alias|password/i;

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const contar = process.argv.includes('--contar');
const sinMascara = process.argv.includes('--sin-mascara');
const [tabla, consulta = ''] = args;

if (!tabla || !TABLAS_PERMITIDAS.test(tabla)) {
  console.log('Uso: npm run leer:base -- <tabla> ["consulta PostgREST"] [--contar] [--sin-mascara]');
  process.exit(1);
}
const env = cargarEnvLocal();
const url = env.VITE_SUPABASE_URL;
const clave = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !clave) {
  console.log('Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
  process.exit(1);
}

const enmascarar = (k, v) => {
  if (v == null || sinMascara) return v;
  if (SENSIBLES.test(k)) return typeof v === 'string' ? `${v.slice(0, 2)}…(${v.length})` : '…';
  if (k === 'id_transaccion_mp' && typeof v === 'string') return v.startsWith('MP-SEED') ? 'MP-SEED…' : `${v.slice(0, 3)}…(${v.length})`;
  return v;
};

const query = new URLSearchParams(consulta);
if (contar) query.set('select', query.get('select') ?? 'id');
else if (!query.has('limit')) query.set('limit', '50');

const respuesta = await fetch(`${url}/rest/v1/${tabla}?${query}`, {
  method: 'GET', // fijo: este script no escribe
  headers: { apikey: clave, Authorization: `Bearer ${clave}`, ...(contar ? { Prefer: 'count=exact', Range: '0-0' } : {}) },
});
if (!respuesta.ok && respuesta.status !== 206) {
  console.log(`Error ${respuesta.status} al leer ${tabla}: ${(await respuesta.text()).slice(0, 200)}`);
  process.exitCode = 1; // sin process.exit(): en Node 24 + Windows cortar justo después de un fetch tira un "Assertion failed"
} else if (contar) {
  console.log(`${tabla}: ${(respuesta.headers.get('content-range') ?? '').split('/')[1] ?? '?'} filas`);
} else {
  const filas = await respuesta.json();
  console.log(JSON.stringify(filas.map((f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, enmascarar(k, v)]))), null, 1));
  console.log(`(${filas.length} filas${filas.length === Number(query.get('limit')) ? ' — puede haber más: subir limit' : ''})`);
}
