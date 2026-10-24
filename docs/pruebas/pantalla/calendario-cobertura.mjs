import { chromium } from 'playwright-core';
const exe = process.env.CHROMIUM_EXE || process.env.USERPROFILE + '/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'; // CHROMIUM_EXE lo fija npm run pruebas:pantalla
const b = await chromium.launch({ executablePath: exe, headless: true });
const p = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message));
const escrituras = [], capturas = [];
await p.route('**/api/verificar-pin', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rol: 'admin', profesionalId: null, nombre: null }) }));
await p.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
await p.route('**/rest/v1/**', (r) => {
  const req = r.request();
  if (req.method() === 'GET') return r.continue();
  const tabla = new URL(req.url()).pathname.split('/').pop();
  escrituras.push(`${req.method()} ${tabla}`);
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  capturas.push({ m: req.method(), tabla, body });
  if (req.method() === 'POST' && tabla === 'turnos') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999999, fecha_creacion: new Date().toISOString(), ...body }) });
  if (req.method() === 'POST' && tabla === 'clientas') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(body) });
  return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
await p.goto('http://localhost:5197/');
await p.getByRole('button', { name: /Admin/ }).first().click();
await p.locator('input[type=password]').fill('9999');
await p.getByRole('button', { name: 'Entrar', exact: true }).click();
await p.waitForURL('**/admin/agenda');
await p.waitForTimeout(2000);

// Cobertura: por cada día con turnos reales, cuántos botones de turno dibuja el calendario vs. cuántos turnos activos hay en la base.
const U = process.env.VITE_SUPABASE_URL;
const res = [];
await p.getByRole('button', { name: 'Rango a elección' }).click();
// rango amplio: todos los turnos
const fechas = await p.evaluate(async () => { return null; });
await p.locator('input[type=date]').nth(0).fill('2026-01-01');
await p.locator('input[type=date]').nth(1).fill('2026-12-31');
await p.waitForTimeout(2500);
const dias = await p.locator('h3', { hasText: /turno/ }).count();
const botonesCalendario = await p.locator('button[title*=" a "][title*=" · "]').count();
const resumen = await p.locator('p', { hasText: /Mostrando/ }).first().innerText();
console.log('resumen:', resumen.replace(/\s+/g, ' '));
console.log('días con calendario:', dias, '| botones de turno dibujados en las grillas:', botonesCalendario);
const U2=process.env.VITE_SUPABASE_URL,K2=process.env.SUPABASE_SERVICE_ROLE_KEY,H2={apikey:K2,Authorization:'Bearer '+K2};
const dbT=await (await fetch(U2+'/rest/v1/turnos?select=id,clienta_id,profesional_id,fecha,hora_inicio,hora_fin,estado,expira_en&limit=3000',{headers:H2})).json();
const dbC=Object.fromEntries((await (await fetch(U2+'/rest/v1/clientas?select=id,nombre&limit=3000',{headers:H2})).json()).map(c=>[c.id,c.nombre]));
const activos=dbT.filter(t=>!String(t.estado).startsWith('cancelado')&&!(t.estado==='reservado'&&t.expira_en&&new Date(t.expira_en)<new Date()));
const esperado=new Set(activos.map(t=>t.fecha+'|'+t.profesional_id+'|'+String(t.hora_inicio).slice(0,5)+' a '+String(t.hora_fin).slice(0,5)+' · '+(dbC[t.clienta_id]||'Clienta General')));
const vistos=await p.evaluate(()=>{const out=[];let sec=-1;document.querySelectorAll('h3, button[title*=" a "]').forEach(el=>{if(el.tagName==='H3'&&/turno/.test(el.textContent))sec++;else if(el.tagName==='BUTTON')out.push(sec+'|'+el.getAttribute('title'));});return out;});
const unicosVistos=new Set(vistos);
console.log('turnos activos en la base:',activos.length,'| turnos distintos (fecha+prof+hora+clienta):',esperado.size,'| turnos distintos dibujados en el calendario:',unicosVistos.size);
console.log('errores JS:', errores.length ? errores.join(' | ') : 'ninguno');
console.log('escrituras frenadas:', escrituras.length);
await p.screenshot({ path: 'rango.png' });
await b.close();
