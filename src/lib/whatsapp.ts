// src/lib/whatsapp.ts
import type { PlantillaRecordatorio } from '../types';
import { formatCurrency } from './formatters';

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
// Saludo y contenido tomados literal del formulario real de Yosy (8/9/2026):
// "Hola hola mi niña, te escribo para confirmar tu turno el día tal en el
// horario tal. Y después el día anterior tenga un recordatorio con la
// dirección. Incluso si es hasta 72 horas antes mejor."
const DIRECCION = 'Av. Acoyte 25, piso 5 depto B, Cdad. Autónoma de Buenos Aires';

export function mensajeRecordatorio(
  plantilla: PlantillaRecordatorio,
  datos: {
    nombreClienta: string;
    servicio: string;
    fecha: string;
    hora: string;
    // Clienta recurrente / turno manual con la seña todavía sin registrar:
    // 72h y 48h antes se le pide la seña, 24h antes se confirma la cita.
    senaPendiente?: boolean;
    montoSena?: number;
  }
): string {
  const { nombreClienta, servicio, fecha, hora, senaPendiente, montoSena } = datos;

  if (senaPendiente) {
    const sena = montoSena && montoSena > 0 ? ` de ${formatCurrency(montoSena)}` : '';
    switch (plantilla) {
      case '72h':
        return `Hola hola ${nombreClienta}! 💗 Te escribo por tu turno en Rose Face Studio: ${servicio} el ${fecha} a las ${hora} hs. Para dejarlo confirmado necesitamos que abones la seña${sena} dentro de las próximas 72 hs. Cualquier duda, seguimos por acá 💕`;
      case '48h':
        return `Hola hola ${nombreClienta}! 💗 Te recuerdo lo de tu turno en Rose Face Studio (${servicio} el ${fecha} a las ${hora} hs). En caso de que todavía no hayas abonado la seña${sena}, te pido que lo hagas dentro de las próximas 48 hs para dejarlo confirmado. Si ya la abonaste, ¡ignorá este mensaje, gracias! 🙏`;
      default:
        return `Hola hola ${nombreClienta}! 💕 Mañana es tu turno en Rose Face Studio (${servicio} a las ${hora} hs). ¿Me confirmás que podés venir? Te dejo la dirección para que la tengas a mano: ${DIRECCION}.`;
    }
  }

  // Turno con la seña ya cobrada: solo 48h y 24h antes (el de 4h se sacó el 16/10/2026).
  if (plantilla === '24h') {
    return `Hola hola ${nombreClienta}! Mañana es tu turno en Rose Face Studio (${servicio} a las ${hora} hs) 💕 Te dejo la dirección para que la tengas a mano: ${DIRECCION}.`;
  }
  return `Hola hola ${nombreClienta}! 💗 Te escribo para confirmar tu turno en Rose Face Studio: ${servicio} el ${fecha} a las ${hora} hs. ¡Te esperamos!`;
}

// Panel "Clientas Recurrentes" (25/9/2026): mensaje con el link personalizado
// de auto-agendado (ya trae su nombre/teléfono cargados) para avisarle que
// le toca volver — mismo saludo real de Yosy que el resto de los mensajes.
export function mensajeClientaRecurrente(datos: { nombreClienta: string; servicio: string; link: string }): string {
  const { nombreClienta, servicio, link } = datos;
  return `Hola hola ${nombreClienta}! 💕 Vimos que ya te toca volver para tu retoque de ${servicio}. Te dejamos el link para que reserves cuando quieras: ${link}`;
}
