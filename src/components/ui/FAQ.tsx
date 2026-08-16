// src/components/ui/FAQ.tsx
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  pregunta: string;
  respuesta: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    pregunta: '¿Tengo que pagar una seña para reservar?',
    respuesta:
      'Sí, se abona el 30% del valor del servicio en el momento de reservar con Mercado Pago. El saldo restante se paga en el estudio el día del turno.',
  },
  {
    pregunta: '¿Puedo cancelar o cambiar mi turno?',
    respuesta:
      'Sí. Si cancelás con más de 48hs de anticipación, te devolvemos el 100% de la seña. Con menos de 48hs, la seña queda retenida.',
  },
  {
    pregunta: '¿Puedo reservar a cualquier hora?',
    respuesta:
      'Sí, la reserva online está disponible las 24 horas, los 7 días de la semana. No dependés de que alguien te responda para conseguir tu turno.',
  },
  {
    pregunta: '¿Cómo confirmo mi turno?',
    respuesta: 'Te confirmamos por WhatsApp apenas se acredita la seña.',
  },
  {
    pregunta: '¿Dónde están ubicados y qué días atienden?',
    respuesta:
      'Av. Pedro Goyena 850, Caballito, CABA. Atendemos de lunes a sábado de 09:00 a 19:00 hs.',
  },
];

export const FAQ: React.FC = () => {
  const [abierta, setAbierta] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, i) => {
        const estaAbierta = abierta === i;
        return (
          <div
            key={item.pregunta}
            className="rounded-2xl border border-pink-100 bg-white overflow-hidden"
          >
            <button
              onClick={() => setAbierta(estaAbierta ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer"
            >
              <span className="font-display text-sm sm:text-base text-rf-black font-semibold">
                {item.pregunta}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-rf-rose-deep shrink-0 transition-transform duration-200 ${
                  estaAbierta ? 'rotate-180' : ''
                }`}
              />
            </button>
            {estaAbierta && (
              <p className="px-5 pb-4 text-sm text-rf-charcoal leading-relaxed">
                {item.respuesta}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
