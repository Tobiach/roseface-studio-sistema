import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'; // CHROMIUM_EXE lo fija npm run pruebas:pantalla
const BASE = process.env.BASE_URL || 'http://localhost:5189';
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });
const errores = [];

async function nuevaPagina({ rol = 'admin', pid = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1300 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.escrituras = [];
  await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol, profesionalId: pid, nombre: null, token: 'tok' }) }));
  await p.route('**/api/editar-turno', (r) => {
    p.escrituras.push({ api: 'editar-turno', body: JSON.parse(r.request().postData()) });
    r.fulfill({ status: 400, contentType: 'application/json', body: '{"ok":false,"error":"prueba: sin escribir"}' });
  });
  await p.route(/\/rest\/v1\/[a-z_]+/, (r) => {
    const req = r.request();
    if (req.method() === 'GET') return r.continue();
    const tabla = new URL(req.url()).pathname.split('/').pop();
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    p.escrituras.push({ m: req.method(), tabla, body });
    if (req.method() === 'POST' && tabla === 'turnos') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999999 + p.escrituras.length, fecha_creacion: new Date().toISOString(), ...body }) });
    if (req.method() === 'POST' && tabla === 'clientas') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(body) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  return { p, ctx };
}
async function entrar(p, rol) {
  await p.goto(BASE + '/');
  await p.getByRole('button', { name: rol === 'admin' ? /Admin/ : /^Profesional$/ }).first().click();
  await p.locator('input[type=password]').fill('9999');
  await p.getByRole('button', { name: 'Entrar', exact: true }).click();
  await p.waitForURL('**/admin/agenda');
  await p.waitForTimeout(2500);
}
async function formulario(p, { prof, fecha, hora, nombre = 'Clienta Fuera De Horario' }) {
  await p.getByRole('button', { name: 'Turno manual' }).click();
  const f = p.locator('div.fixed', { hasText: 'Turno Manual' });
  await f.getByPlaceholder('Nombre y apellido').fill(nombre);
  if (prof) await f.locator('select').nth(0).selectOption({ label: prof });
  await f.locator('select').nth(1).selectOption({ index: 1 });
  await f.locator('input[type=date]').fill(fecha);
  await f.locator('input[type=time]').fill(hora);
  return f;
}

// ---------- A) Yosy agenda a Mili un LUNES (día que no trabaja)
let { p, ctx } = await nuevaPagina();
await entrar(p, 'admin');
let f = await formulario(p, { prof: 'Mili', fecha: '2026-12-21', hora: '10:00' });
let txt = await f.innerText();
ok(/Mili no trabaja los lunes\. Se carga igual: solo lo ve el equipo/.test(txt), 'Yosy + día libre de la profesional: avisa "no trabaja los lunes — se carga igual, solo lo ve el equipo"');
ok(!(await f.getByRole('button', { name: 'Crear turno' }).isDisabled()), '... y NO bloquea el botón Crear turno');
await f.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(1500);
let creado = p.escrituras.find((e) => e.tabla === 'turnos' && e.m === 'POST');
ok(creado?.body?.fecha === '2026-12-21' && creado?.body?.hora_inicio === '10:00' && creado?.body?.profesional_id === 'prof-mili' && creado?.body?.estado === 'reservado', 'Se crea el turno el lunes a las 10:00 con Mili (estado reservado, lo único que acepta la base)');

// El turno queda visible en el calendario, marcado como fuera de horario (solo equipo)
await p.locator('input[aria-label="Ir a un día"]').fill('2026-12-21');
await p.waitForTimeout(1200);
txt = await p.locator('body').innerText();
ok(/Fuera de horario \(solo equipo\)/.test(txt), 'El calendario tiene la referencia "⏱ Fuera de horario (solo equipo)"');
const marcado = p.locator('button[title*="fuera del horario habitual"]');
ok((await marcado.count()) > 0, 'El turno aparece en el calendario de ese lunes (aunque Mili no trabaje) con la marca de fuera de horario');
ok(/⏱ Fuera de horario/.test(txt), 'La tarjeta del turno dice "⏱ Fuera de horario"');
await ctx.close();

// ---------- B) Avisos según la hora (sábado de Mili: 09:00 a 18:30, bloques 9/11/14/16)
({ p, ctx } = await nuevaPagina());
await entrar(p, 'admin');
f = await formulario(p, { prof: 'Mili', fecha: '2026-12-19', hora: '19:00' });
txt = await f.innerText();
ok(/Fuera del horario de Mili \(sábados: 09:00 a 18:30\)/.test(txt), 'Hora fuera de la jornada: avisa el horario real de la profesional');
await f.locator('input[type=time]').fill('11:30');
txt = await f.innerText();
ok(/No es uno de los horarios que ven las clientas en la web \(09:00, 11:00, 14:00, 16:00\)/.test(txt) && !/Fuera del horario de Mili/.test(txt), 'Hora suelta dentro de la jornada: avisa cuáles son los bloques que ven las clientas');
await f.locator('input[type=time]').fill('11:00');
txt = await f.innerText();
ok(!/Se carga igual/.test(txt), 'Hora que es un bloque habitual: sin aviso');
await ctx.close();

// ---------- C) Una profesional (Mili) agenda en su propia agenda a cualquier hora
({ p, ctx } = await nuevaPagina({ rol: 'profesional', pid: 'prof-mili' }));
await entrar(p, 'profesional');
await p.getByRole('button', { name: 'Turno manual' }).click();
f = p.locator('div.fixed', { hasText: 'Turno Manual' });
ok(await f.locator('select').nth(0).isDisabled(), 'Profesional: el formulario ya viene con SU agenda (no mezcla con la de otras)');
await f.getByPlaceholder('Nombre y apellido').fill('Clienta Tarde');
await f.locator('select').nth(1).selectOption({ index: 1 });
await f.locator('input[type=date]').fill('2026-12-19');
await f.locator('input[type=time]').fill('22:30');
txt = await f.innerText();
ok(/Fuera del horario de Mili/.test(txt) && !(await f.getByRole('button', { name: 'Crear turno' }).isDisabled()), 'Profesional: puede cargar un turno a las 22:30 (avisa que es fuera de horario, no lo impide)');
await f.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(1500);
creado = p.escrituras.find((e) => e.tabla === 'turnos' && e.m === 'POST');
ok(creado?.body?.hora_inicio === '22:30' && creado?.body?.profesional_id === 'prof-mili', 'El turno de las 22:30 queda en la agenda de Mili');
await ctx.close();

// ---------- D) Editar un turno existente a un horario fuera de lo habitual
({ p, ctx } = await nuevaPagina());
await entrar(p, 'admin');
await p.locator('input[aria-label="Ir a un día"]').fill('2026-10-22');
await p.waitForTimeout(900);
await p.locator('div.cursor-pointer[class*="border-l-"]').first().click();
const modal = p.locator('div.fixed', { hasText: 'Gestión de Turno' });
await modal.getByRole('button', { name: /Editar reserva/ }).click();
await modal.locator('input[type=time]').first().fill('23:00');
txt = await modal.innerText();
ok(/Fuera del horario|no trabaja los|No es uno de los horarios/.test(txt), 'Editar reserva: al mover a otra hora muestra el mismo aviso informativo');
ok(!(await modal.getByRole('button', { name: 'Guardar cambios' }).isDisabled()) || /ya hay un turno/.test(txt), 'Editar reserva: el horario fuera de lo habitual no impide guardar (solo un turno que empiece a la misma hora)');
await ctx.close();

// ---------- E) La web de las clientas sigue igual (smoke)
({ p, ctx } = await nuevaPagina());
await p.goto(BASE + '/reserva');
await p.waitForTimeout(2500);
txt = await p.locator('body').innerText();
ok(/Reserva de Turno Online|Elegí tu Servicio/.test(txt) && !/fuera de horario|solo equipo/i.test(txt), 'La reserva online de las clientas carga igual y no muestra nada del equipo');
await ctx.close();

console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();
