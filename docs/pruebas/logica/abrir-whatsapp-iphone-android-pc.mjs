// Prueba de abrirChatWhatsApp con un navegador simulado (ventana, documento y navigator falsos).
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function entorno(userAgent, { maxTouchPoints = 0 } = {}) {
  const oyentes = { document: {}, window: {} };
  const reg = (donde) => ({
    addEventListener: (t, f) => ((oyentes[donde][t] ??= []).push(f)),
    removeEventListener: (t, f) => (oyentes[donde][t] = (oyentes[donde][t] ?? []).filter((x) => x !== f)),
  });
  const navegaciones = [];
  const abiertas = [];
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent, maxTouchPoints }, configurable: true, writable: true });
  globalThis.document = { visibilityState: 'visible', ...reg('document') };
  globalThis.window = {
    ...reg('window'),
    location: { set href(v) { navegaciones.push(v); }, get href() { return navegaciones.at(-1) ?? ''; } },
    open: (u) => { abiertas.push(u); return { closed: false, location: { set href(v) { abiertas.push('pestaña→' + v); } } }; },
    setTimeout: (f, ms) => setTimeout(f, ms),
  };
  const disparar = (donde, tipo) => (oyentes[donde][tipo] ?? []).slice().forEach((f) => f());
  return { navegaciones, abiertas, disparar };
}

const { abrirChatWhatsApp, esDispositivoMovil } = await import('./wa2.mjs');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const IPAD_ESCRITORIO = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const MSJ = 'Hola hola Ana! 💗 abonás la seña https://www.mercadopago.com.ar/x?pref_id=1';

// --- iPhone
let e = entorno(IPHONE);
ok(esDispositivoMovil() === true, 'iPhone se detecta como celular');
abrirChatWhatsApp('1127696736', MSJ, null);
ok(e.abiertas.length === 0, 'iPhone: NO abre ninguna pestaña (window.open no se usa)');
ok(e.navegaciones.length === 1 && e.navegaciones[0].startsWith('whatsapp://send?phone=5491127696736&text='), `iPhone: abre la app directo (${e.navegaciones[0].slice(0, 52)}…)`);
ok(decodeURIComponent(e.navegaciones[0].split('&text=')[1]) === MSJ, 'iPhone: el mensaje (con link y emojis) llega completo');
await esperar(2300);
ok(e.navegaciones.length === 2 && e.navegaciones[1].startsWith('https://wa.me/5491127696736'), 'iPhone: si a los 2 s no pasó nada (app no instalada) cae a wa.me en la misma pestaña');

// iPhone: la app se abre (la página pasa a segundo plano) -> no insiste
e = entorno(IPHONE);
abrirChatWhatsApp('1127696736', MSJ, null);
globalThis.document.visibilityState = 'hidden'; e.disparar('document', 'visibilitychange');
globalThis.document.visibilityState = 'visible'; // vuelve a Safari más tarde
await esperar(2300);
ok(e.navegaciones.length === 1 && e.abiertas.length === 0, 'iPhone: si la app se abrió (la página se oculta), NO hace nada más al volver a Safari');

// iPhone: aviso del sistema ("¿abrir WhatsApp?") -> pierde el foco -> no insiste
e = entorno(IPHONE);
abrirChatWhatsApp('1127696736', MSJ, null);
e.disparar('window', 'blur');
await esperar(2300);
ok(e.navegaciones.length === 1, 'iPhone: si aparece un aviso del sistema (la página pierde el foco), no pisa lo que la persona decida');

// --- Android
e = entorno(ANDROID);
abrirChatWhatsApp('11 2769-6736', MSJ, null);
ok(e.abiertas.length === 0 && e.navegaciones[0].startsWith('whatsapp://send?phone=5491127696736'), 'Android: abre la app directo, sin pestañas, y normaliza el teléfono');

// --- iPad en modo escritorio (se hace pasar por Mac)
e = entorno(IPAD_ESCRITORIO, { maxTouchPoints: 5 });
ok(esDispositivoMovil() === true, 'iPad con Safari "de escritorio" también se trata como tablet');

// --- Computadora
e = entorno(WINDOWS);
ok(esDispositivoMovil() === false, 'Windows se detecta como computadora');
const pestaña = { closed: false, location: { set href(v) { e.abiertas.push('pestaña→' + v); } } };
abrirChatWhatsApp('1127696736', MSJ, pestaña);
ok(e.navegaciones.length === 0 && e.abiertas.length === 1 && e.abiertas[0].startsWith('pestaña→https://wa.me/5491127696736'), 'Computadora: usa la pestaña ya abierta en el click (una sola) y la lleva a WhatsApp Web');
e = entorno(WINDOWS);
abrirChatWhatsApp('1127696736', MSJ);
ok(e.abiertas.length === 1 && e.abiertas[0].startsWith('https://wa.me/5491127696736'), 'Computadora sin pestaña previa: abre una sola');
process.exit(0);
