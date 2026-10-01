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
  // 1/10/2026: Ari mandó 6 fotos profesionales propias (carpeta de Drive),
  // reemplazan la única que había quedado antes (Unas_8.jpg, ya borrada).
  'prof-alexandra': [
    'Unas_Esculpidas_1.jpg',
    'Unas_SoftGel_1.jpg',
    'Unas_SpaDePies_1.jpg',
    'Unas_Semipermanente_1.jpg',
    'Unas_Tradicional_1.jpg',
    'Unas_Capping_1.jpg',
  ].map(urlFor),
};
