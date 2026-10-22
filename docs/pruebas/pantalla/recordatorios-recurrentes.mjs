import { chromium } from 'playwright-core';
const exe = process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const b = await chromium.launch({ executablePath: exe, headless: true });
const p = await (await b.newContext({ viewport: { width: 1400, height: 1100 } })).newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message));
const capturas = [];
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol: 'admin', profesionalId: null, nombre: null }) }));
await p.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
await p.route('**/rest/v1/**', (r) => {
  const req = r.request();
  if (req.method() === 'GET') return r.continue();
  const tabla = new URL(req.url()).pathname.split('/').pop();
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  capturas.push({ m: req.method(), tabla, body });
  if (req.method() === 'POST' && tabla === 'turnos') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999999, fecha_creacion: new Date().toISOString(), ...body }) });
  if (req.method() === 'POST' && tabla === 'clientas') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(body) });
  return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
const K=process.env.SUPABASE_SERVICE_ROLE_KEY,U=process.env.VITE_SUPABASE_URL,HH={apikey:K,Authorization:'Bearer '+K};
const pasado=(await (await fetch(U+'/rest/v1/turnos?select=id,clienta_id,servicio_id&estado=eq.completado&fecha=lt.'+new Date().toISOString().slice(0,10)+'&order=fecha.desc&limit=1',{headers:HH})).json())[0];
console.log('turno real de ancla:',JSON.stringify(pasado));
await p.route('**/rest/v1/clientas_recurrentes_estado*', (r) => { const req=r.request(); if(req.method()==='GET') return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{clienta_id:pasado.clienta_id,servicio_id:pasado.servicio_id,turno_id_ancla:pasado.id,contactada:false,contactada_en:null,nota:'Marcada a mano desde la Agenda',silenciada:false}])}); const body=req.postData()?JSON.parse(req.postData()):null; capturas.push({m:req.method(),tabla:'clientas_recurrentes_estado',body}); return r.fulfill({status:200,contentType:'application/json',body:'[]'}); });
const hoy = new Date(); const f = (d) => { const x = new Date(hoy); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
await p.goto('http://localhost:5197/');
await p.getByRole('button', { name: /Admin/ }).first().click();
await p.locator('input[type=password]').fill('9999');
await p.getByRole('button', { name: 'Entrar', exact: true }).click();
await p.waitForURL('**/admin/agenda');
await p.waitForTimeout(1800);

// --- Turno manual con "Clienta recurrente" tildado, a 2 días (entra en la ventana de 72h)
await p.getByRole('button', { name: 'Turno manual' }).click();
const modal = p.locator('div.fixed', { hasText: 'Turno Manual' });
await modal.getByPlaceholder('Nombre y apellido').fill('Clienta Recurrente Prueba');
await modal.locator('select').nth(0).selectOption({ label: 'Mili' });
await modal.locator('select').nth(1).selectOption({ index: 1 });
await modal.locator('input[type=date]').fill(f(2));
await modal.locator('input[type=time]').fill('15:00');
await modal.getByText('Clienta recurrente').click();
await modal.getByRole('button', { name: 'Crear turno' }).click();
await p.waitForTimeout(1500);
const rec = capturas.find((c) => c.tabla === 'clientas_recurrentes_estado');
ok(!!rec, 'Tildar "Clienta recurrente" en el turno manual escribe en clientas_recurrentes_estado');
console.log('     payload:', JSON.stringify(rec?.body));
ok(rec?.body?.nota?.startsWith('Marcada a mano') && String(rec?.body?.turno_id_ancla) === '999999', 'la nota lleva la marca y se ancla al turno recién creado');

// --- Cola de recordatorios + mensajes en el modal del turno
const cola = await p.locator('text=Yosy Recordatorios').first().locator('xpath=ancestor::div[contains(@class,"space-y-3")][1]').innerText();
ok(/Clienta Recurrente Prueba/.test(cola) && /72 horas antes · pedir seña/.test(cola), 'La cola muestra a la clienta con la ventana "72 horas antes · pedir seña"');
await p.locator('input[type=date]').count().then(async (n) => { if (!n) await p.getByRole('button', { name: 'Rango a elección' }).click(); });
await p.locator('input[type=date]').nth(0).fill(f(2)); await p.locator('input[type=date]').nth(1).fill(f(2));
await p.waitForTimeout(800);
await p.locator('button[title*="Clienta Recurrente Prueba"]').first().click();
await p.waitForTimeout(400);
const modalTexto = await p.locator('div.fixed', { hasText: 'Gestión de Turno' }).innerText();
ok(/72 horas antes · pedir seña/.test(modalTexto) && /48 horas antes · seña \(si no abonó\)/.test(modalTexto) && /24 horas antes · confirmar cita/.test(modalTexto), 'El modal muestra las 3 ventanas: 72h seña · 48h seña (si no abonó) · 24h confirmar cita');
ok(!/4 horas antes\s*$/m.test(modalTexto.replace(/24 horas antes[^\n]*/g, '')), 'No muestra la ventana de 4h para este turno');
const msjs = await p.locator('div.fixed p.italic').allInnerTexts();
msjs.forEach((m, i) => console.log(`     mensaje ${i + 1}: ${m}`));
ok(/72 hs/.test(msjs[0] || '') && /seña/.test(msjs[0] || ''), 'Mensaje 72h pide la seña (72 hs)');
ok(/En caso de que todavía no hayas abonado la seña/.test(msjs[1] || '') && /Si ya la abonaste/.test(msjs[1] || ''), 'Mensaje 48h menciona "en caso de que todavía no hayas abonado" y aclara si ya abonó');
ok(/confirmás/.test(msjs[2] || '') && !/seña/.test(msjs[2] || ''), 'Mensaje 24h confirma la cita y NO habla de seña');

// --- Clientas Recurrentes
await p.getByRole('button', { name: /Cerrar/ }).last().click().catch(() => {});
await p.getByRole('link', { name: /Clientas Recurrentes/ }).first().click();
await p.waitForTimeout(2500);
const rt = await p.locator('body').innerText();
ok(!/Atrasada/i.test(rt) && !/Faltan \d+ días/.test(rt), 'Clientas Recurrentes: ya no dice "Atrasada X días" ni "Faltan X días"');
ok(/Vino hace \d+ d[ií]as?|Vino hoy/.test(rt), 'Clientas Recurrentes: muestra "Vino hace X días"');
console.log('     ejemplo:', (rt.match(/Vino hace \d+ d[ií]as?|Vino hoy/g) || []).slice(0, 3).join(' | '));
console.log('     encabezados:', (rt.match(/(🔴|🟡)[^\n]*/g) || []).join(' | '));
// edición de nota: tiene que conservar la marca
const tarjetaManual = p.locator('div', { hasText: 'Agregada a mano' }).filter({ has: p.getByText('+ Agregar nota') }).last();
ok(await p.getByText('Agregada a mano').count() > 0, 'La clienta marcada a mano aparece en la lista (badge "Agregada a mano")');
await tarjetaManual.getByText('+ Agregar nota').click();
await tarjetaManual.locator('textarea').fill('la llamé, viene el jueves');
await tarjetaManual.getByRole('button', { name: 'Guardar', exact: true }).click();
await p.waitForTimeout(600);
const notaGuardada = capturas.filter((c)=>c.tabla==='clientas_recurrentes_estado').pop()?.body?.nota;
ok(notaGuardada === 'Marcada a mano desde la Agenda · la llamé, viene el jueves', 'Editar la nota conserva la marca (la clienta no desaparece de la lista): '+notaGuardada);
const rt2 = await p.locator('body').innerText();
ok(/📝 "la llamé, viene el jueves"/.test(rt2) && !/Marcada a mano desde la Agenda ·/.test(rt2), 'La nota se muestra sin la marca interna');
console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();
