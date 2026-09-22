// src/lib/profesionalSlug.ts
//
// URLs como /profesionales/prof-sharon exponían el id interno (feo, poco
// profesional, y encima quedó desalineado del nombre real más de una vez
// esta semana). Las páginas de perfil ahora se linkean por un slug
// derivado del nombre — "Ariannys" -> "ariannys" — nunca por el id.
export function slugDeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca acentos (á -> a, é -> e...)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
