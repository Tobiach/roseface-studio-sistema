import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'; // CHROMIUM_EXE lo fija npm run pruebas:pantalla
const BASE = process.env.BASE_URL || 'http://localhost:5190';
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const b = await chromium.launch({ executablePath: exe, headless: true });

async function nuevaPagina({ sinToken = false, fallarTurnos = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1300 } });
  const p = await ctx.newPage();
  p.escrituras = [];
  p.lecturasTurnos = 0;
  if (sinToken) await p.addInitScript(() => { if (!localStorage.getItem('roseface_acceso')) localStorage.setItem('roseface_acceso', JSON.stringify({ rol: 'admin' })); });
  await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol: 'admin', profesionalId: null, nombre: null, token: 'tok' }) }));
  await p.route('**/api/editar-turno', (r) => {
    const body = JSON.parse(r.request().postData());
    p.escrituras.push({ api: 'editar-turno', auth: r.request().headers().authorization, body });
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, clienta: { id: 'x', nombre: 'Giuliana', telefono: body.cliente?.telefono ?? '', email: null, fecha_registro: '2026-10-20', es_vip: false, puntos_acumulados: 0 }, advertencias: [] }) });
  });
  await p.route('**/rest/v1/turnos*', (r) => {
    const req = r.request();
    if (req.method() === 'GET') {
      p.lecturasTurnos++;
      if (fallarTurnos && p.lecturasTurnos > 1) return r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' });
      return r.continue();
    }
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    p.escrituras.push({ m: req.method(), tabla: 'turnos', body });
    if (req.method() === 'POST') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999999, fecha_creacion: new Date().toISOString(), ...body }) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await p.route(/\/rest\/v1\/(?!turnos)[a-z_]+/, (r) => {
    const req = r.request();
    if (req.method() === 'GET') return r.continue();
    const tabla = new URL(req.url()).pathname.split('/').pop();
    p.escrituras.push({ m: req.method(), tabla });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  return { p, ctx };
}
async function entrar(p) {
  await p.goto(BASE + '/');
  const ya = await p.evaluate(() => !!localStorage.getItem('roseface_acceso'));
  if (ya) await p.goto(BASE + '/admin/agenda');
  else {
    await p.getByRole('button', { name: /Admin/ }).first().click();
    await p.locator('input[type=password]').fill('9999');
    await p.getByRole('button', { name: 'Entrar', exact: true }).click();
    await p.waitForURL('**/admin/agenda');
  }
  await p.waitForTimeout(2500);
}
async function formulario(p, nombre, telefono) {
  await p.getByRole('button', { name: 'Turno manual' }).click();
  const f = p.locator('div.fixed', { hasText: 'Turno Manual' });
  await f.getByPlaceholder('Nombre y apellido').fill(nombre);
  await f.getByPlaceholder('Opcional').fill(telefono);
  await f.locator('select').nth(0).selectOption({ label: 'Yosy' });
  await f.locator('select').nth(1).selectOption({ index: 1 });
  await f.locator('input[type=date]').fill('2026-12-21');
  await f.locator('input[type=time]').fill('10:20');
  return f;
}

// 1) Clienta importada sin teléfono ("Giuliana"): el teléfono escrito ahora SE GUARDA
let { p, ctx } = await nuevaPagina();
await entrar(p);
let f = await formulario(p, 'Giuliana', '11 5555 1234');
let txt = await f.innerText();
ok(/Ya está cargada en el sistema, sin teléfono: el que escribas se guarda en su ficha/.test(txt), 'Avisa en el formulario que la clienta ya existe y que el teléfono se va a guardar en su ficha');
await f.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(1800);
const turnoCreado = p.escrituras.find((e) => e.tabla === 'turnos' && e.m === 'POST');
const ficha = p.escrituras.find((e) => e.api === 'editar-turno');
ok(!!turnoCreado && turnoCreado.body.clienta_id !== undefined, 'Se creó el turno');
ok(ficha?.body.accion === 'clienta' && ficha.body.cliente?.telefono === '11 5555 1234' && ficha.auth === 'Bearer tok' && ficha.body.turnoId === '999999', 'El teléfono se guarda en la ficha de la clienta existente (por el endpoint con PIN)');
await ctx.close();

// 2) Teléfono con letras: no deja crear
({ p, ctx } = await nuevaPagina());
await entrar(p);
f = await formulario(p, 'Clienta Nueva Prueba', 'ramirez');
txt = await f.innerText();
ok(/entre 8 y 15 números/.test(txt) && (await f.getByRole('button', { name: 'Crear turno' }).isDisabled()), 'Teléfono con letras ("ramirez"): avisa y bloquea el botón');
await f.getByPlaceholder('Opcional').fill('');
ok(!(await f.getByRole('button', { name: 'Crear turno' }).isDisabled()), 'Sin teléfono se puede crear igual (es opcional)');
await ctx.close();

// 3) Clienta existente CON otro teléfono: no se pisa solo
({ p, ctx } = await nuevaPagina());
await entrar(p);
f = await formulario(p, 'Melanie Domene', '11 9999 8888'); // tiene 1153690865
txt = await f.innerText();
ok(/Ya está cargada con el teléfono 1153690865\. Se usa ese/.test(txt), 'Si la clienta ya tiene OTRO teléfono avisa que se usa el que ya tenía');
await f.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(1500);
ok(!p.escrituras.some((e) => e.api === 'editar-turno'), '... y no le pisa el teléfono sola');
await ctx.close();

// 4) Sesión sin token y hay que guardar teléfono: pide PIN antes de crear
({ p, ctx } = await nuevaPagina({ sinToken: true }));
await entrar(p);
f = await formulario(p, 'Giuliana', '11 5555 1234');
await f.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(1200);
ok((await p.locator('input[type=password]').count()) > 0 && !p.escrituras.some((e) => e.tabla === 'turnos' && e.m === 'POST'), 'Sin sesión con PIN reciente: pide el PIN y NO crea el turno a medias');
await ctx.close();

// 5) Indicador de datos y botón Actualizar
({ p, ctx } = await nuevaPagina());
await entrar(p);
txt = await p.locator('body').innerText();
ok(/Datos de la base actualizados hace \d+ s · \d+ turnos cargados/.test(txt), 'La Agenda muestra "Datos de la base actualizados hace X s · N turnos cargados"');
const antes = p.lecturasTurnos;
await p.getByRole('button', { name: /Actualizar ahora/ }).click();
await p.waitForTimeout(1500);
ok(p.lecturasTurnos === antes + 1, 'El botón "Actualizar ahora" vuelve a leer los turnos de la base en ese momento');
await ctx.close();

// 6) Si la base falla al refrescar: aviso rojo
({ p, ctx } = await nuevaPagina({ fallarTurnos: true }));
await entrar(p);
await p.getByRole('button', { name: /Actualizar ahora/ }).click();
await p.waitForTimeout(1500);
txt = await p.locator('body').innerText();
ok(/No se pudo actualizar con la base/.test(txt), 'Si la base no responde al actualizar: avisa en rojo que lo que se ve puede estar desactualizado');
await ctx.close();
await b.close();
