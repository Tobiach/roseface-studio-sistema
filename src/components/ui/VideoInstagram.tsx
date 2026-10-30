// src/components/ui/VideoInstagram.tsx
//
// Reproductor oficial de Instagram (la página /embed/ del reel) dentro de un iframe. Es el mismo video que está
// publicado en @rosefacestudio, con la calidad original de Instagram. Instagram dibuja arriba el nombre de la
// cuenta y abajo sus botones; se deja tal cual (no se recorta ni se oculta), como pide su uso de embeds.
//
// Tamaño: el video ocupa una caja 4:5 (alto = 1,25 × ancho) y Instagram suma 54 px de encabezado y 164 px de
// pie, siempre iguales (medido a anchos de 300 a 480 px). Un padding en % se calcula sobre el ANCHO, así que
// `125% + 218px` da el alto exacto a cualquier ancho sin JavaScript. El marco dorado es un `ring` (no un
// `border`) justamente para no sumarle píxeles a esa cuenta.
// El iframe es perezoso: no se descarga nada de Instagram hasta que la clienta se acerca al video.
import React from 'react';
import { extraerCodigoInstagram } from '../../lib/instagram';

interface VideoInstagramProps {
  url: string;
  titulo: string;
  className?: string;
}

export const VideoInstagram: React.FC<VideoInstagramProps> = ({ url, titulo, className = '' }) => {
  const codigo = extraerCodigoInstagram(url);
  if (!codigo) return null;

  return (
    <div className={`relative w-full max-w-[380px] mx-auto ${className}`}>
      <div
        className="relative w-full rounded-2xl overflow-hidden ring-1 ring-rf-gold/40 shadow-md bg-white"
        style={{ paddingBottom: 'calc(125% + 218px)' }}
      >
        <iframe
          src={`https://www.instagram.com/reel/${codigo}/embed/`}
          title={titulo}
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          scrolling="no"
        />
      </div>
    </div>
  );
};
