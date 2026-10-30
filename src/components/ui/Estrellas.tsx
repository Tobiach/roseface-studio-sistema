// src/components/ui/Estrellas.tsx
//
// Las 5 estrellas de una calificación (1 a 5), llenas las que corresponden al valor redondeado y
// vacías (solo el contorno, apagado) las demás. Antes cada profesional mostraba UNA sola estrella
// junto a "5.0", que se podía leer como "1 estrella"; el número y la cantidad de opiniones no cambian.
import React from 'react';
import { Star } from 'lucide-react';

interface EstrellasProps {
  valor: number;
  // Tamaño de cada estrella (clases de Tailwind de ancho y alto).
  className?: string;
}

export const Estrellas: React.FC<EstrellasProps> = ({ valor, className = 'w-3.5 h-3.5' }) => {
  const llenas = Math.max(0, Math.min(5, Math.round(valor)));
  return (
    <span className="inline-flex items-center gap-px shrink-0" role="img" aria-label={`Calificación ${valor.toFixed(1)} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          data-llena={i < llenas ? 'si' : 'no'}
          className={`${className} ${i < llenas ? 'fill-rf-gold-bright text-rf-gold-bright' : 'fill-transparent text-rf-gold-bright/40'}`}
        />
      ))}
    </span>
  );
};
