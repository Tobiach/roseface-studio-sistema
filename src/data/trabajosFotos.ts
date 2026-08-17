// src/data/trabajosFotos.ts
// Fotos reales de trabajos realizados, provistas por Yosy (Drive, 12/8/2026).
// Recortadas y normalizadas a formato cuadrado uniforme.

const modules = import.meta.glob('../assets/images/trabajos/*.jpg', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function urlFor(filename: string): string {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${filename}`));
  if (!entry) {
    throw new Error(`Foto de trabajo no encontrada: ${filename}`);
  }
  return entry[1];
}

export const trabajosPorProfesional: Record<string, string[]> = {
  // Yosy: trabajos reusados de Mili/Sharon como placeholder (autorizado por
  // Tobias, 17/8) — reemplazar por fotos reales de Yosy al cerrar la venta.
  'prof-yosy': [
    'Clasicas_Lash_1.jpg',
    'Volumen_Brasilero_4D_3.jpg',
    'Efecto_Humedo_1.jpg',
    'Hibrida_Lash_1.jpg',
    'Medio_Volumen_1.jpg',
    'Natural_Volumen_1.jpg',
  ].map(urlFor),
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
  'prof-camila': [
    'Sombreado_de_Cejas_1.jpg',
    'Sombreado_de_Cejas_2.jpg',
    'Sombreado_de_Cejas_3.jpg',
    'Sombreado_de_Cejas_4.jpg',
  ].map(urlFor),
  'prof-valentina': ['Laminado_de_Cejas_1.jpg', 'Laminado_de_Cejas_2.jpg'].map(urlFor),
  'prof-alexandra': [
    'Unas_1.jpg',
    'Unas_2.jpg',
    'Unas_3.jpg',
    'Unas_4.jpg',
    'Unas_5.jpg',
    'Unas_6.jpg',
    'Unas_7.jpg',
    'Unas_8.jpg',
    'Unas_9.jpg',
    'Unas_10.jpg',
  ].map(urlFor),
};
