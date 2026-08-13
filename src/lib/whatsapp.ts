// src/lib/whatsapp.ts
const WA_NUMBER = '5491160549387'; // Rose Face Studio — sin +, sin espacios

export const buildWhatsAppUrl = (mensaje: string): string => {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(mensaje)}`;
};
