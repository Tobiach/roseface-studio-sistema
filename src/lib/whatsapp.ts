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
// wa.me solo entiende el formato internacional (código de país, sin ceros ni signos). Los
// teléfonos del sistema se cargan como los escribe la gente ("11 2769-6736", "011 15 2769
// 6736", "+54 9 11 …"), así que se pasan a 549 + área + número antes de armar el link: con
// un número de 10 dígitos sin el 549, WhatsApp lo toma como de otro país y no abre el chat.
// Los números que no parecen argentinos se dejan como vienen.
export function normalizarTelefonoWhatsApp(telefono: string): string {
  let d = telefono.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2); // 0054… -> 54…

  if (d.startsWith('54')) {
    // Celulares argentinos: 54 + 9 + área + número. Si falta el 9, se agrega.
    if (d.length === 12 && d[2] !== '9') d = `549${d.slice(2)}`;
    return d;
  }
  if (d.length === 11 && d.startsWith('9')) return `54${d}`; // 9 + área + número

  d = d.replace(/^0+/, ''); // prefijo troncal: 011, 0221…
  // "15" de celular: 11 15 xxxx xxxx (12 dígitos) o 15 xxxx xxxx (10, AMBA sin código de área).
  if (d.length === 10 && d.startsWith('15')) {
    d = `11${d.slice(2)}`;
  } else if (d.length === 12) {
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === '15') {
        d = d.slice(0, area) + d.slice(area + 2);
        break;
      }
    }
  }
  return d.length === 10 ? `549${d}` : d;
}

export const buildWhatsAppUrlPara = (telefono: string, mensaje: string): string => {
  return `https://wa.me/${normalizarTelefonoWhatsApp(telefono)}?text=${encodeURIComponent(mensaje)}`;
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
    // Link de pago de Mercado Pago atado a ese turno (solo en los mensajes de seña de 72h y 48h).
    linkPago?: string;
  }
): string {
  const { nombreClienta, servicio, fecha, hora, senaPendiente, montoSena, linkPago } = datos;

  if (senaPendiente) {
    const sena = montoSena && montoSena > 0 ? ` de ${formatCurrency(montoSena)}` : '';
    const pagarAca = linkPago ? ` Podés pagarla directo con Mercado Pago desde acá 👉 ${linkPago}` : '';
    switch (plantilla) {
      case '72h':
        return `Hola hola ${nombreClienta}! 💗 Te escribo por tu turno en Rose Face Studio: ${servicio} el ${fecha} a las ${hora} hs. Para dejarlo confirmado necesitamos que abones la seña${sena} dentro de las próximas 72 hs.${pagarAca} Cualquier duda, seguimos por acá 💕`;
      case '48h':
        return `Hola hola ${nombreClienta}! 💗 Te recuerdo lo de tu turno en Rose Face Studio (${servicio} el ${fecha} a las ${hora} hs). En caso de que todavía no hayas abonado la seña${sena}, te pido que lo hagas dentro de las próximas 48 hs para dejarlo confirmado.${pagarAca} Si ya la abonaste, ¡ignorá este mensaje, gracias! 🙏`;
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
