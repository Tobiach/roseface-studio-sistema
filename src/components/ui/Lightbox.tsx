// src/components/ui/Lightbox.tsx
import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  imagenes: string[];
  indiceActivo: number;
  onCerrar: () => void;
  onCambiarIndice: (indice: number) => void;
  alt?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({
  imagenes,
  indiceActivo,
  onCerrar,
  onCambiarIndice,
  alt = 'Trabajo realizado',
}) => {
  const anterior = () => onCambiarIndice((indiceActivo - 1 + imagenes.length) % imagenes.length);
  const siguiente = () => onCambiarIndice((indiceActivo + 1) % imagenes.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      if (e.key === 'ArrowLeft') anterior();
      if (e.key === 'ArrowRight') siguiente();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  });

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      <button
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer"
      >
        <X className="w-8 h-8" />
      </button>

      {imagenes.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            anterior();
          }}
          aria-label="Anterior"
          className="absolute left-2 sm:left-6 text-white/80 hover:text-white cursor-pointer p-2"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      <img
        src={imagenes[indiceActivo]}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
      />

      {imagenes.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            siguiente();
          }}
          aria-label="Siguiente"
          className="absolute right-2 sm:right-6 text-white/80 hover:text-white cursor-pointer p-2"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {imagenes.length > 1 && (
        <span className="absolute bottom-4 text-white/70 text-xs font-medium">
          {indiceActivo + 1} / {imagenes.length}
        </span>
      )}
    </div>
  );
};
