// src/lib/whatsapp.ts
const WA_NUMBER = '5491160549387'; // Rose Face Studio — sin +, sin espacios

export const buildWhatsAppUrl = (mensaje: string): string => {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(mensaje)}`;
};

// Para mandarle un WhatsApp a una clienta puntual (recordatorios, etc.) —
// distinto del de arriba, que siempre apunta al número del estudio.
// wa.me necesita solo dígitos con código de país; los teléfonos cargados
// vienen con formato libre ("+54 9 11 4589-1234"), así que se limpia acá.
export const buildWhatsAppUrlPara = (telefono: string, mensaje: string): string => {
  const soloDigitos = telefono.replace(/[^\d]/g, '');
  return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(mensaje)}`;
};

// Mensajes predeterminados para los recordatorios por turno (Fase 7). Cada
// plantilla tiene su propio tono según cuánto falta para el turno — se
// arma acá para que Yosy solo tenga que revisar y tocar "Enviar" en
// WhatsApp, no redactar cada vez.
export function mensajeRecordatorio(
  plantilla: '48h' | '24h' | '4h',
  datos: { nombreClienta: string; servicio: string; fecha: string; hora: string }
): string {
  const { nombreClienta, servicio, fecha, hora } = datos;
  switch (plantilla) {
    case '48h':
      return `Hola ${nombreClienta}! 💗 Te recordamos tu turno en Rose Face Studio para ${servicio} el ${fecha} a las ${hora} hs. ¡Te esperamos!`;
    case '24h':
      return `Hola ${nombreClienta}! Mañana es tu turno en Rose Face Studio (${servicio} a las ${hora} hs). Cualquier cosa avisanos por acá 💕`;
    case '4h':
      return `Hola ${nombreClienta}! En unas horas te esperamos en Rose Face Studio para tu turno de ${servicio} a las ${hora} hs. ¡Nos vemos pronto!`;
  }
}
