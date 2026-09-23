// src/components/ui/ResenasMarquee.tsx
// Cinta de reseñas reales de Google que se desliza sola (derecha a
// izquierda), en 2 tamaños: "premium" para la sección debajo de las
// reseñas de Google Maps, "compacta" (más chica y más rápida) para
// debajo de "Conocer al equipo completo".
import React from 'react';
import { Star } from 'lucide-react';
import { resenasGoogle } from '../../data/resenasGoogle';

interface ResenasMarqueeProps {
  variante?: 'premium' | 'compacta';
}

export const ResenasMarquee: React.FC<ResenasMarqueeProps> = ({ variante = 'premium' }) => {
  const compacta = variante === 'compacta';
  // La lista se dibuja 2 veces seguidas y la pista se desliza -50% en loop
  // — así el corte del final al principio no se nota.
  const pista = [...resenasGoogle, ...resenasGoogle];

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div className={`flex w-max ${compacta ? 'gap-3 marquee-track-rapida' : 'gap-5 marquee-track'}`}>
        {pista.map((resena, i) => (
          <div
            key={`${resena.nombre}-${i}`}
            className={`shrink-0 rounded-2xl border-2 border-rf-gold/70 bg-gradient-to-br from-amber-50/90 via-white to-rf-cream shadow-sm ${
              compacta ? 'w-52 p-4' : 'w-80 p-6'
            }`}
          >
            <div className="flex items-center gap-0.5 mb-2">
              {Array.from({ length: resena.estrellas }).map((_, s) => (
                <Star
                  key={s}
                  className={`fill-rf-gold-bright text-rf-gold-bright ${compacta ? 'w-3 h-3' : 'w-4 h-4'}`}
                />
              ))}
            </div>
            <p
              className={`text-rf-charcoal leading-relaxed ${
                compacta ? 'text-[11px] line-clamp-3' : 'text-xs line-clamp-6'
              }`}
            >
              {resena.texto}
            </p>
            <p className={`font-display font-bold text-rf-black pt-2 ${compacta ? 'text-xs' : 'text-sm'}`}>
              {resena.nombre}
            </p>
            <p className="text-[10px] text-rf-rose-deep">Reseña real de Google</p>
          </div>
        ))}
      </div>
    </div>
  );
};
