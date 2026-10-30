// src/lib/instagram.ts
// Saca el código de un reel/post público de Instagram de cualquier link que alguien pueda pegar
// (instagram.com/reel/CODIGO/?parámetros, /reels/, /p/, /tv/, con o sin www/m). Devuelve null si no es el
// link de un reel o post (por ejemplo el perfil de una cuenta) — así el componente que lo usa no muestra nada
// en vez de romper con una URL rara.
const CODIGO = /^[A-Za-z0-9_-]{5,}$/;

export function extraerCodigoInstagram(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^(www|m)\./, '');
    if (host !== 'instagram.com') return null;
    const partes = u.pathname.split('/').filter(Boolean);
    // /reel/CODIGO, /reels/CODIGO, /p/CODIGO, /tv/CODIGO (y /usuario/reel/CODIGO, que Instagram también genera)
    const i = partes.findIndex((p) => ['reel', 'reels', 'p', 'tv'].includes(p));
    const codigo = i >= 0 ? partes[i + 1] : undefined;
    return codigo && CODIGO.test(codigo) ? codigo : null;
  } catch {
    return null;
  }
}

export const esLinkDeInstagram = (url: string): boolean => extraerCodigoInstagram(url) !== null;
