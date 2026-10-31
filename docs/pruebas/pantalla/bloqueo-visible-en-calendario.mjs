// Cuando Yosy (o una profesional) bloquea un horario, el bloqueo tiene que VERSE en el calendario estilo Google de la Agenda
// (pedido de Tobias, 31/10/2026: "no figura actualmente si lo bloqueás").
// Usa el formulario real "Bloquear horario" con datos REALES de lectura. El alta del bloqueo (POST) se intercepta y se contesta con una
// fila falsa que la prueba también agrega a las lecturas siguientes: NO se guarda nada en la base.
// Escenarios (todos con Mili): A) mismo día y dentro de su horario · B) otro día distinto al que se está mirando · C) un día que ella no
// trabaja · D) antes de su horario de apertura · E) con el filtro puesto en otra profesional · F) vista de rango en una semana sin turnos ·
// G) bloquear dos veces lo mismo no crea un duplicado.
import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5189';
const U = process.env.VITE_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SALIDA = process.env.SALIDA;
let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallas++; };
const H = { apikey: K, Authorization: `Bearer ${K}` };
const leer = async (q) => (await fetch(`${U}/rest/v1/${q}`, { headers: H })).json();

// ---- Fechas a usar, calculadas con los datos reales de Mili (no se inventa nada)
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const sumar = (iso, n) => new Date(new Date(iso + 'T12:00:00Z').getTime() + n * 86400e3).toISOString().slice(0, 10);
const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const [mili] = await leer('profesionales?select=id,horario_disponible&id=eq.prof-mili');
// Días con algo de Mili (turnos o bloqueos REALES): la prueba elige días libres de ambos para que sus conteos sean limpios.
const turnosMili = new Set([
  ...(await leer('turnos?select=fecha&profesional_id=eq.prof-mili&estado=neq.cancelado&limit=3000')).map((t) => t.fecha),
  ...(await leer('bloqueos_horario?select=fecha&profesional_id=eq.prof-mili&limit=3000')).map((b) => b.fecha),
]);
const trabaja = (iso) => !!mili.horario_disponible[DIAS[new Date(iso + 'T12:00:00Z').getUTCDay()]];
const jornada = (iso) => mili.horario_disponible[DIAS[new Date(iso + 'T12:00:00Z').getUTCDay()]];
let diaTrabaja = sumar(hoy, 2); while (!trabaja(diaTrabaja) || turnosMili.has(diaTrabaja)) diaTrabaja = sumar(diaTrabaja, 1);
let diaLibre = sumar(hoy, 2); while (trabaja(diaLibre) || turnosMili.has(diaLibre)) diaLibre = sumar(diaLibre, 1);
const lejano = sumar(diaTrabaja, 140); // misma semana del año siguiente: sin turnos de nadie
console.log(`Hoy ${hoy} | Mili trabaja el ${diaTrabaja} (${jornada(diaTrabaja).desde}-${jornada(diaTrabaja).hasta}) | no trabaja el ${diaLibre} | rango lejano ${lejano}`);

const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];

async function nuevaAgenda() {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1700 }, locale: 'es-AR' });
  await ctx.addInitScript(() => localStorage.setItem('roseface_acceso', JSON.stringify({ rol: 'admin', token: 'tok' })));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  const falsos = []; let seq = 90000;
  await p.route(/\/rest\/v1\/[a-z_]+/, async (r) => {
    try {
      const req = r.request();
      const tabla = new URL(req.url()).pathname.split('/').pop();
      if (tabla === 'bloqueos_horario' && req.method() === 'POST') {
        const fila = { id: ++seq, creado_en: new Date().toISOString(), ...JSON.parse(req.postData()) };
        falsos.push(fila);
        return await r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(fila) });
      }
      if (tabla === 'bloqueos_horario' && req.method() === 'GET') {
        const resp = await r.fetch();
        return await r.fulfill({ response: resp, body: JSON.stringify([...(await resp.json()), ...falsos]) });
      }
      if (req.method() === 'GET') return await r.continue();
      return await r.abort();
    } catch { /* la página se cerró */ }
  });
  await p.goto(BASE + '/admin/agenda', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.locator('input[aria-label="Ir a un día"]').waitFor({ timeout: 90000 });
  await p.waitForTimeout(6000); // que lleguen los datos reales
  return { p, ctx, falsos };
}
const irADia = async (p, dia) => { await p.locator('input[aria-label="Ir a un día"]').fill(dia); await p.waitForTimeout(1800); };
const celdas = (p) => p.locator('button[title$="tocar para desbloquear"]');
async function bloquear(p, { profesional = 'Mili', fecha, diaCompleto = false, desde = '10:00', hasta = '11:00' }) {
  await p.getByRole('button', { name: 'Bloquear horario' }).click();
  const modal = p.locator('div.fixed', { has: p.getByRole('heading', { name: 'Bloquear Horario' }) });
  await modal.locator('select').selectOption({ label: profesional });
  if (fecha) await modal.locator('input[type=date]').fill(fecha);
  const check = modal.locator('input[type=checkbox]');
  if ((await check.isChecked()) !== diaCompleto) await check.setChecked(diaCompleto);
  if (!diaCompleto) { await modal.locator('input[type=time]').nth(0).fill(desde); await modal.locator('input[type=time]').nth(1).fill(hasta); }
  await modal.getByRole('button', { name: 'Bloquear', exact: true }).click();
  await p.waitForTimeout(2200);
}
const diaMostrado = (p) => p.locator('input[aria-label="Ir a un día"]').inputValue();
const texto = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');

// A) mismo día, dentro del horario
{
  const { p, ctx, falsos } = await nuevaAgenda();
  await irADia(p, diaTrabaja);
  await bloquear(p, { fecha: diaTrabaja, desde: '10:00', hasta: '11:00' });
  ok(falsos.length === 1, 'A) se mandó un solo alta de bloqueo (interceptado, no se guarda)');
  ok((await celdas(p).count()) >= 2, `A) mismo día y dentro del horario: se ven ${await celdas(p).count()} cuadritos grises (10:00 y 10:30)`);
  if (SALIDA) await p.screenshot({ path: `${SALIDA}/bloqueo_A.png` });
  await ctx.close();
}

// B) se bloquea OTRO día distinto al que se está mirando: la pantalla tiene que ir a ese día
{
  const { p, ctx } = await nuevaAgenda(); // arranca mirando "Hoy"
  await bloquear(p, { fecha: diaTrabaja, desde: '10:00', hasta: '11:00' });
  const dia = await diaMostrado(p);
  ok(dia === diaTrabaja, `B) después de bloquear, la Agenda muestra el día bloqueado (${diaTrabaja}) y no se queda en otro (${dia})`);
  // Solo se cuenta si es el día correcto: el día de hoy puede tener bloqueos reales de otras profesionales.
  const nB = dia === diaTrabaja ? await celdas(p).count() : 0;
  ok(nB >= 2, `B) y el bloqueo se ve en el calendario de ese día (${nB} cuadritos)`);
  await ctx.close();
}

// C) un día que Mili no trabaja: tiene que aparecer su columna con el bloqueo
{
  const { p, ctx } = await nuevaAgenda();
  await bloquear(p, { fecha: diaLibre, diaCompleto: true });
  const dia = await diaMostrado(p);
  ok(dia === diaLibre, `C) la Agenda va al día bloqueado (${diaLibre}) y no se queda en ${dia}`);
  const t = await texto(p);
  ok(!/Ninguna profesional trabaja este día/.test(t), 'C) no dice "Ninguna profesional trabaja este día" teniendo un bloqueo cargado');
  const nC = dia === diaLibre ? await celdas(p).count() : 0;
  ok(dia === diaLibre && (await p.locator('div.grid img[alt="Mili"]').count()) >= 1 && nC >= 1, `C) aparece la columna de Mili con el bloqueo de ese día (${nC} cuadritos)`);
  if (SALIDA) await p.screenshot({ path: `${SALIDA}/bloqueo_C.png` });
  await ctx.close();
}

// D) antes de que abra (07:00 a 08:00): tiene que dibujarse igual
{
  const { p, ctx } = await nuevaAgenda();
  await irADia(p, diaTrabaja);
  await bloquear(p, { fecha: diaTrabaja, desde: '07:00', hasta: '08:00' });
  ok((await celdas(p).count()) >= 2, `D) bloqueo de 07:00 a 08:00 (antes de su horario ${jornada(diaTrabaja).desde}): se ve (${await celdas(p).count()} cuadritos)`);
  await ctx.close();
}

// E) mirando solo a otra profesional (filtro puesto en Yosy) y bloqueando a Mili
{
  const { p, ctx } = await nuevaAgenda();
  await irADia(p, diaTrabaja);
  await p.locator('select', { hasText: 'Todas las Profesionales' }).selectOption({ label: 'Yosy' });
  await p.waitForTimeout(1200);
  await bloquear(p, { profesional: 'Mili', fecha: diaTrabaja, desde: '10:00', hasta: '11:00' });
  ok((await celdas(p).count()) >= 2, `E) con el filtro en Yosy, al bloquear a Mili el bloqueo igual se ve (${await celdas(p).count()} cuadritos)`);
  await ctx.close();
}

// F) vista de rango en una semana sin ningún turno
{
  const { p, ctx } = await nuevaAgenda();
  await p.getByRole('button', { name: 'Rango a elección' }).click();
  await p.locator('label:has-text("Desde") + input[type=date]').fill(lejano);
  await p.locator('label:has-text("Hasta") + input[type=date]').fill(sumar(lejano, 3));
  await p.waitForTimeout(1500);
  await bloquear(p, { fecha: lejano, desde: '10:00', hasta: '11:00' });
  const t = await texto(p);
  ok(!/Sin turnos en el período/.test(t), 'F) en la vista de rango, un día con bloqueo pero sin turnos igual aparece (no dice "Sin turnos en el período")');
  ok((await celdas(p).count()) >= 2, `F) y su calendario muestra el bloqueo (${await celdas(p).count()} cuadritos)`);
  if (SALIDA) await p.screenshot({ path: `${SALIDA}/bloqueo_F.png` });
  await ctx.close();
}

// G) bloquear dos veces lo mismo: la segunda no crea un duplicado (antes, como "no se veía", se apretaba de nuevo y quedaban repetidos)
{
  const { p, ctx, falsos } = await nuevaAgenda();
  await irADia(p, diaTrabaja);
  await bloquear(p, { fecha: diaTrabaja, desde: '10:00', hasta: '12:00' });
  await bloquear(p, { fecha: diaTrabaja, desde: '10:00', hasta: '12:00' });
  await bloquear(p, { fecha: diaTrabaja, desde: '10:30', hasta: '11:30' }); // más chico y adentro del anterior
  ok(falsos.length === 1, `G) bloquear dos veces lo mismo (y algo adentro) manda UN solo alta, no duplicados (altas: ${falsos.length})`);
  ok((await celdas(p).count()) >= 4, `G) y el bloqueo original sigue viéndose (${await celdas(p).count()} cuadritos)`);
  await ctx.close();
}

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo OK');
await b.close();
process.exitCode = fallas ? 1 : 0;
