import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'; // CHROMIUM_EXE lo fija npm run pruebas:pantalla
const BASE = process.env.BASE_URL || 'http://localhost:5193';
const U = process.env.VITE_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY, HH = { apikey: K, Authorization: 'Bearer ' + K };
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];

const fila = async (id) => (await (await fetch(U + `/rest/v1/turnos?select=*&id=eq.${id}`, { headers: HH })).json())[0];
const turnoMili = await fila(645);   // Mili, 22/10 11:00, manual, seña confirmada
const cancelado = await fila(688);   // cancelado real
const servicios = await (await fetch(U + '/rest/v1/servicios?select=id,nombre,precio,duracion_minutos,profesionales_que_lo_realizan&limit=200', { headers: HH })).json();
const otroServicio = servicios.find((s) => s.id !== turnoMili.servicio_id && s.profesionales_que_lo_realizan.includes('prof-mili'));
console.log('turno de prueba:', turnoMili.id, turnoMili.fecha, String(turnoMili.hora_inicio).slice(0, 5), '| servicio nuevo:', otroServicio.nombre, otroServicio.precio);

async function nuevaPagina({ rol = 'admin', pid = null, conToken = true, respuestas = {} } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1300 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.llamadas = [];
  if (!conToken) await p.addInitScript((r) => { if (!localStorage.getItem('roseface_acceso')) localStorage.setItem('roseface_acceso', JSON.stringify({ rol: r })); }, rol);
  await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol, profesionalId: pid, nombre: null, token: 'tok' }) }));
  await p.route('**/api/editar-turno', (r) => {
    const cuerpo = JSON.parse(r.request().postData());
    p.llamadas.push({ auth: r.request().headers().authorization, cuerpo });
    const f = respuestas[cuerpo.accion] ?? ((c) => ({ status: 200, body: { ok: true, turno: { ...turnoMili } } }))(cuerpo);
    r.fulfill({ status: f.status, contentType: 'application/json', body: JSON.stringify(f.body) });
  });
  await p.route(/\/rest\/v1\/(?!servicios|profesionales|turnos|clientas|bloqueos_horario|recordatorios_config|clientas_recurrentes_estado)[a-z_]+/, (r) => r.fallback());
  await p.route('**/rest/v1/**', (r) => (r.request().method() === 'GET' ? r.continue() : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })));
  return p;
}
async function entrar(p, rol) {
  await p.goto(BASE + '/');
  const ya = await p.evaluate(() => !!localStorage.getItem('roseface_acceso'));
  if (ya) await p.goto(BASE + '/admin/agenda');
  else {
    await p.getByRole('button', { name: rol === 'admin' ? /Admin/ : /^Profesional$/ }).first().click();
    await p.locator('input[type=password]').fill('9999');
    await p.getByRole('button', { name: 'Entrar', exact: true }).click();
    await p.waitForURL('**/admin/agenda');
  }
  await p.waitForTimeout(2200);
}
async function abrir(p, fecha, nombreClienta) {
  await p.locator('input[aria-label="Ir a un día"]').fill(fecha);
  await p.waitForTimeout(900);
  await p.locator('div.cursor-pointer[class*="border-l-"]').first().click();
  return p.locator('div.fixed', { hasText: 'Gestión de Turno' });
}

// ---------- A) PROFESIONAL (Mili) edita su turno
let p = await nuevaPagina({ rol: 'profesional', pid: 'prof-mili' });
await entrar(p, 'profesional');
// el turno de Mili del 22/10 11:00 (manual, seña confirmada)
let modal = await abrir(p, turnoMili.fecha);
let txt = await modal.innerText();
ok(/Editar reserva \(servicio, día, hora…\)/.test(txt), 'Profesional: ve el botón "Editar reserva"');
await modal.getByRole('button', { name: /Editar reserva/ }).click();
const panel = p.locator('div.fixed', { hasText: 'Gestión de Turno' });
txt = await panel.innerText();
ok(!/Corregir total/.test(txt) && !/Corregir seña/.test(txt), 'Profesional: NO ve "Corregir total/seña" (solo Yosy)');
ok((await panel.locator('select').count()) === 1, 'Profesional: no puede cambiar la profesional (un solo selector: el servicio)');
ok(/Agenda de Mili ese día/.test(txt), 'Muestra la agenda del día de la profesional');
await panel.locator('select').first().selectOption(otroServicio.id);
txt = await panel.innerText();
ok(/Así queda/.test(txt) && txt.includes(otroServicio.nombre) && /Total:/.test(txt), 'Al cambiar el servicio muestra "Así queda" con el total nuevo');
console.log('     [vista previa]', txt.split('\n').filter((l) => /Servicio:|Total:|Seña:/.test(l)).map((l) => l.trim()).join(' // '));
await panel.getByPlaceholder(/pidió sumar cejas/).fill('la clienta cambió de idea');
await panel.getByRole('button', { name: 'Guardar cambios' }).click();
await p.waitForTimeout(900);
const lla = p.llamadas[0];
ok(lla?.auth === 'Bearer tok' && lla.cuerpo.accion === 'editar' && lla.cuerpo.servicioId === otroServicio.id && lla.cuerpo.nota === 'la clienta cambió de idea', 'Guarda llamando a /api/editar-turno con token y solo lo que cambió');
ok(lla && lla.cuerpo.montoTotal === undefined && lla.cuerpo.montoSena === undefined && lla.cuerpo.profesionalId === undefined, '... sin mandar montos (los calcula el servidor) ni profesional');

// ---------- B) cancelar con motivo
p = await nuevaPagina({ rol: 'profesional', pid: 'prof-mili', respuestas: { cancelar: { status: 200, body: { ok: true, turno: { ...turnoMili, estado: 'cancelado' } } } } });
await entrar(p, 'profesional');
modal = await abrir(p, turnoMili.fecha);
await modal.getByRole('button', { name: /Cancelar turno \(seña no reembolsable\)/ }).click();
ok(/¿Cancelar este turno\?/.test(await modal.innerText()), 'Cancelar pide confirmación (no cancela de un toque)');
await modal.getByPlaceholder(/Motivo \(opcional\)/).fill('avisó que no puede venir');
await modal.getByRole('button', { name: 'Sí, cancelar turno' }).click();
await p.waitForTimeout(900);
ok(p.llamadas[0]?.cuerpo.accion === 'cancelar' && p.llamadas[0]?.cuerpo.motivo === 'avisó que no puede venir', 'Cancela con motivo por el endpoint autenticado');

// ---------- C) turno cancelado: solo reactivar
p = await nuevaPagina({ respuestas: { reactivar: { status: 200, body: { ok: true, turno: { ...cancelado, estado: 'reservado' } } } } });
await entrar(p, 'admin');
await p.locator('input[aria-label="Ir a un día"]').fill(cancelado.fecha);
await p.waitForTimeout(900);
await p.locator('div.cursor-pointer[class*="border-l-"]', { hasText: 'Cancelado' }).first().click();
modal = p.locator('div.fixed', { hasText: 'Gestión de Turno' });
txt = await modal.innerText();
ok(/Reactivar turno/.test(txt) && !/Vino — confirmar servicios/.test(txt) && !/Editar reserva/.test(txt), 'Turno cancelado: ofrece solo "Reactivar turno"');
await modal.getByRole('button', { name: /Reactivar turno/ }).click();
await p.waitForTimeout(900);
ok(p.llamadas[0]?.cuerpo.accion === 'reactivar', 'Reactivar llama al endpoint');

// ---------- D) ADMIN: ve los campos extra y el bloqueo por choque
p = await nuevaPagina();
await entrar(p, 'admin');
modal = await abrir(p, turnoMili.fecha);
await modal.getByRole('button', { name: /Editar reserva/ }).click();
txt = await modal.innerText();
ok(/Corregir total/.test(txt) && /Corregir seña/.test(txt) && (await modal.locator('select').count()) === 2, 'Yosy: ve la profesional y "Corregir total/seña"');
// elegir otra profesional y verificar que el servicio se valida
const otraProf = await modal.locator('select').first().locator('option').allInnerTexts();
console.log('     profesionales en la lista de Yosy:', otraProf.join(', '));
ok(!otraProf.includes('Anye'), 'Anye no aparece en la lista de profesionales');

// ---------- E) sesión sin token: pide PIN y no llama
p = await nuevaPagina({ conToken: false, rol: 'admin' });
await entrar(p, 'admin');
modal = await abrir(p, turnoMili.fecha);
await modal.getByRole('button', { name: /Editar reserva/ }).click();
await modal.locator('select').nth(1).selectOption(otroServicio.id).catch(() => {});
await modal.getByRole('button', { name: 'Guardar cambios' }).click();
await p.waitForTimeout(900);
ok((await p.locator('input[type=password]').count()) > 0 && p.llamadas.length === 0, 'Sin token de sesión: pide el PIN y no llama al servidor');

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();
