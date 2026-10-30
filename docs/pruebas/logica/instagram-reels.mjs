// Reconocimiento de links de Instagram para el video de presentación de cada profesional (src/lib/instagram.ts).
// Se compila src/lib/instagram.ts como ./ig.mjs (ver docs/pruebas/README.md).
const { extraerCodigoInstagram, esLinkDeInstagram } = await import('./ig.mjs');
const ok = (c, m) => console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`);

// Los 4 links reales que pasó Tobias el 30/10/2026 (con los parámetros de seguimiento que trae el botón "compartir")
const reales = {
  Roma: ['https://www.instagram.com/reel/DfDi89TR6Md/?psln=cmtlNzJ2NTlmem40', 'DfDi89TR6Md'],
  Mili: ['https://www.instagram.com/reel/DfDjgatxHLq/?rpxt=NWtzYmYybzNzZ21w', 'DfDjgatxHLq'],
  Yosy: ['https://www.instagram.com/reel/DdsKYi-ppp7/?vrfl=MTA1OHkya2oyY2xkZw==', 'DdsKYi-ppp7'],
  Cris: ['https://www.instagram.com/reel/DextWMdxdrH/?exln=MTM2ZjJocWQ4aGl4bw==', 'DextWMdxdrH'],
};
for (const [quien, [url, codigo]] of Object.entries(reales)) {
  ok(extraerCodigoInstagram(url) === codigo, `${quien}: saca el código ${codigo} del link con parámetros`);
}

// Otras formas que Instagram genera
const formas = [
  ['https://instagram.com/reel/ABCDEfghij/', 'ABCDEfghij', 'sin www y con barra final'],
  ['https://m.instagram.com/reel/ABCDEfghij/', 'ABCDEfghij', 'versión móvil'],
  ['https://www.instagram.com/reels/ABCDEfghij/', 'ABCDEfghij', '/reels/'],
  ['https://www.instagram.com/p/ABCDEfghij/?img_index=1', 'ABCDEfghij', 'post (/p/)'],
  ['https://www.instagram.com/rosefacestudio/reel/ABCDEfghij/', 'ABCDEfghij', 'con el usuario en el medio'],
  ['  https://www.instagram.com/reel/ABCDEfghij  ', 'ABCDEfghij', 'con espacios alrededor'],
];
for (const [url, codigo, que] of formas) ok(extraerCodigoInstagram(url) === codigo, `reconoce: ${que}`);

// Cosas que NO deben pasar (el componente no muestra nada en vez de romper o abrir otro sitio)
const rechazar = [
  ['https://www.instagram.com/rosefacestudio/', 'el perfil de la cuenta (no es un video)'],
  ['https://www.instagram.com/', 'la portada de Instagram'],
  ['https://youtube.com/shorts/Tm6UVS1oVYo?feature=share', 'un Short de YouTube'],
  ['https://evil.com/instagram.com/reel/ABCDEfghij', 'otro sitio que menciona instagram.com en la ruta'],
  ['https://instagram.com.evil.com/reel/ABCDEfghij', 'un dominio que empieza igual (instagram.com.evil.com)'],
  ['https://www.instagram.com/reel/<script>alert(1)</script>/', 'un código con caracteres peligrosos'],
  ['https://www.instagram.com/reel/', 'reel sin código'],
  ['https://www.instagram.com/reel/abc/', 'código demasiado corto'],
  ['no es un link', 'texto que no es un link'],
  ['', 'vacío'],
];
for (const [url, que] of rechazar) ok(extraerCodigoInstagram(url) === null && esLinkDeInstagram(url) === false, `rechaza: ${que}`);
process.exit(0);
