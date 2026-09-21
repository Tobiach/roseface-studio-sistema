// src/lib/youtube.ts
// Saca el ID de video de cualquier formato de link de YouTube que alguien
// pueda pegar (watch?v=, youtu.be/, /embed/, /shorts/). Devuelve null si no
// es un link de YouTube reconocible — así el componente que lo usa puede
// no mostrar nada en vez de romper con una URL rara.
export function extraerIdYoutube(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      return id || null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const match = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
      if (match) return match[2];
    }
    return null;
  } catch {
    return null;
  }
}
