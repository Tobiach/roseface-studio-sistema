// src/components/ui/FloatingWhatsAppButton.tsx
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '../../lib/whatsapp';

export const FloatingWhatsAppButton: React.FC = () => {
  const url = buildWhatsAppUrl('Hola! Quiero reservar un turno en Rose Face Studio 💕');

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
    >
      <MessageCircle className="w-7 h-7 fill-white" />
    </a>
  );
};
