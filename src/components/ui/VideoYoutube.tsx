// src/components/ui/VideoYoutube.tsx
//
// Embed de YouTube liviano: al entrar a la página solo se baja la miniatura
// (una foto), no el reproductor completo. El iframe de youtube-nocookie.com
// recién se crea cuando la clienta toca play — nunca navega a youtube.com ni
// abre pestaña nueva. Mismo mecanismo probado con Tobias antes de cargar los
// videos reales del estudio.
import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { extraerIdYoutube } from '../../lib/youtube';

interface VideoYoutubeProps {
  url: string;
  titulo: string;
  className?: string;
}

export const VideoYoutube: React.FC<VideoYoutubeProps> = ({ url, titulo, className = '' }) => {
  const [reproduciendo, setReproduciendo] = useState(false);
  const id = extraerIdYoutube(url);

  if (!id) return null;

  return (
    <div
      className={`relative w-full aspect-video rounded-2xl overflow-hidden border border-rf-gold/40 shadow-md bg-black ${className}`}
    >
      {reproduciendo ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={titulo}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setReproduciendo(true)}
          aria-label={`Reproducir: ${titulo}`}
          className="absolute inset-0 w-full h-full bg-center bg-cover cursor-pointer group"
          style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-16 h-16 rounded-full bg-white/95 shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Play className="w-6 h-6 text-rf-rose-deep ml-1" fill="currentColor" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
};
