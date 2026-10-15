// src/lib/recurrencia.ts
//
// "Marcar como clienta recurrente" a mano (desde el modal de un turno o desde
// el formulario de turno manual) escribe en `clientas_recurrentes_estado` una
// nota con esta marca; la pantalla Clientas Recurrentes la reconoce y suma a
// esa clienta+servicio a su lista aunque el servicio no tenga ciclo definido.
//
// Si Yosy después escribe una nota propia en esa tarjeta, la marca se
// conserva como prefijo (si no, la clienta desaparecería de la lista apenas
// se editara la nota).
export const MARCA_A_MANO = 'Marcada a mano desde la Agenda';

const SEPARADOR = ' · ';

export const esMarcadaAMano = (nota: string | null | undefined): boolean =>
  !!nota && nota.startsWith(MARCA_A_MANO);

// La nota que ve Yosy, sin la marca interna.
export const notaVisible = (nota: string | null | undefined): string => {
  if (!nota) return '';
  if (!esMarcadaAMano(nota)) return nota;
  return nota.slice(MARCA_A_MANO.length).replace(SEPARADOR.trimEnd(), '').trim();
};

// Arma la nota a guardar: conserva la marca si corresponde y agrega el texto.
export const armarNota = (texto: string, conMarca: boolean): string => {
  const limpio = texto.trim();
  if (!conMarca) return limpio;
  return limpio ? `${MARCA_A_MANO}${SEPARADOR}${limpio}` : MARCA_A_MANO;
};
