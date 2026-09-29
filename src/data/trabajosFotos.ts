// src/data/trabajosFotos.ts
// Fotos reales de trabajos realizados, provistas por Yosy (Drive, 12/8/2026).
// Recortadas y normalizadas a formato cuadrado uniforme.

const modules = import.meta.glob('../assets/images/trabajos/*.jpg', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export function urlFor(filename: string): string {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${filename}`));
  if (!entry) {
    throw new Error(`Foto de trabajo no encontrada: ${filename}`);
  }
  return entry[1];
}

export const trabajosPorProfesional: Record<string, string[]> = {
  // Yosy hace cejas y laminado — galería de cejas/laminado (fotos reales
  // de Yosy pendientes, por ahora reusa las de cejas que ya están cargadas).
  'prof-yosy': [
    'Laminado_de_Cejas_1.jpg',
    'Laminado_de_Cejas_2.jpg',
    'Perfilado_de_Cejas_1.jpg',
    'Perfilado_de_Cejas_2.jpg',
    'Sombreado_de_Cejas_1.jpg',
    'Sombreado_de_Cejas_2.jpg',
  ].map(urlFor),
  // Anye (alisados) y Cris (faciales): sin fotos reales todavía.
  'prof-martina': [],
  'prof-sofia': [],
  'prof-mili': [
    'Clasicas_Lash_1.jpg',
    'Efecto_Humedo_1.jpg',
    'Hibrida_Lash_1.jpg',
    'Hibrida_Lash_2.jpg',
    'Medio_Volumen_1.jpg',
    'Medio_Volumen_2.jpg',
    'Natural_Volumen_1.jpg',
    'Volumen_Brasilero_4D_1.jpg',
    'Volumen_Brasilero_4D_2.jpg',
    'Volumen_Tecnologico_1.jpg',
    'Volumen_Tecnologico_2.jpg',
    'Volumen_Tecnologico_3.jpg',
    'Perfilado_de_Cejas_1.jpg',
    'Perfilado_de_Cejas_2.jpg',
    'Perfilado_de_Cejas_3.jpg',
    'Perfilado_de_Cejas_4.jpg',
  ].map(urlFor),
  'prof-sharon': [
    'Clasicas_Lash_2.jpg',
    'Efecto_Humedo_2.jpg',
    'Hibrida_Lash_3.jpg',
    'Medio_Volumen_3.jpg',
    'Lash_Rose_Face_1.jpg',
    'Lash_Lifting_1.jpg',
    'Volumen_Brasilero_4D_3.jpg',
    'Volumen_Brasilero_4D_4.jpg',
    'Volumen_Brasilero_6D_1.jpg',
    'Volumen_Tecnologico_4.jpg',
    'Volumen_Tecnologico_5.jpg',
    'Volumen_Tecnologico_6.jpg',
  ].map(urlFor),
  // Vero (depilación láser) — sin fotos de trabajos todavía.
  'prof-camila': [],
  // 29/9/2026: de las 3 que habían quedado como "buenas" (Unas_1/4/8),
  // solo Unas_8 se ve realmente limpia (nada de fondo, foco en la uña).
  // Unas_1 tiene un watermark chico abajo (podría ser el logo propio del
  // estudio, sin confirmar) y Unas_4 está dominada por un anillo/nudillos,
  // casi no se ve la uña — quedan afuera hasta confirmar. Se puede sumar
  // más cuando Yosy/Ari elijan directamente cuáles mostrar.
  'prof-alexandra': ['Unas_8.jpg'].map(urlFor),
};
