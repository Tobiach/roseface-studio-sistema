// src/components/layout/Footer.tsx
import React from 'react';
import { Logo } from '../ui/Logo';
import { useApp } from '../../context/AppContext';
import { MapPin, Clock, Instagram, Heart, Shield, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '../../lib/whatsapp';

export const Footer: React.FC = () => {
  const { rolActivo, setRolActivo } = useApp();

  return (
    <footer className="bg-white border-t border-pink-100/80 pt-12 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-pink-100/60">
          {/* Col 1: Brand */}
          <div className="md:col-span-1 space-y-4">
            <Logo size="md" />
            <p className="text-sm text-rf-charcoal font-serif italic">
              "Cuando te amas, te cuidas ✨"
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Estudio estético exclusivo en Caballito, dedicado a resaltar tu belleza natural con la máxima calidez y atención personalizada.
            </p>
          </div>

          {/* Col 2: Location & Hours */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-rf-black uppercase tracking-wider font-display">
              Ubicación & Horarios
            </h4>
            <ul className="space-y-2 text-xs text-rf-charcoal">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-rf-rose-deep shrink-0 mt-0.5" />
                <span>Av. Pedro Goyena 850, Caballito, CABA</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rf-rose-deep shrink-0" />
                <span>Lun a Sáb: 09:00 a 19:00 hs</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Social & Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-rf-black uppercase tracking-wider font-display">
              Comunidad
            </h4>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rf-cream text-rf-black text-xs font-medium border border-pink-200/60 hover:bg-rf-blush transition-colors"
            >
              <Instagram className="w-4 h-4 text-rf-rose-deep" />
              <span>@roseface.studio</span>
            </a>
            <a
              href={buildWhatsAppUrl('Hola! Quiero reservar un turno en Rose Face Studio 💕')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rf-cream text-rf-black text-xs font-medium border border-pink-200/60 hover:bg-rf-blush transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-rf-rose-deep" />
              <span>WhatsApp</span>
            </a>
          </div>

          {/* Col 4: Quick Role Switcher */}
          <div className="space-y-3 bg-rf-cream p-4 rounded-2xl border border-pink-200/50">
            <h4 className="text-xs font-bold text-rf-black uppercase tracking-wider">
              Acceso al Sistema
            </h4>
            <p className="text-[11px] text-rf-charcoal">
              Cambiá de vista para explorar el panel administrativo de Yosy o la experiencia de la clienta.
            </p>
            <button
              onClick={() => setRolActivo(rolActivo === 'admin' ? 'clienta' : 'admin')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-rf-gold text-rf-black hover:bg-rf-blush transition-all cursor-pointer shadow-2xs"
            >
              <Shield className="w-3.5 h-3.5 text-rf-gold" />
              <span>
                {rolActivo === 'admin' ? 'Ver como Clienta' : 'Entrar como Admin (Yosy)'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} Rose Face Studio — Todos los derechos reservados.</p>
          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="font-semibold text-rf-black">Control.Evo</span>
            <Heart className="w-3 h-3 text-rf-red-lip fill-rf-red-lip inline ml-0.5" />
          </div>
        </div>
      </div>
    </footer>
  );
};
