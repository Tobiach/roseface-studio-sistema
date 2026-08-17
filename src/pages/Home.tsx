// src/pages/Home.tsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PhotoPlaceholder } from '../components/ui/PhotoPlaceholder';
import { RitualTimeline } from '../components/ui/RitualTimeline';
import { formatCurrency } from '../lib/formatters';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { FAQ } from '../components/ui/FAQ';
import { Calendar, Star, MapPin, Clock, MessageCircle, Heart, Sparkles, GraduationCap, Gem, Crown } from 'lucide-react';
import heroBannerEstudio from '../assets/images/home/hero-banner-estudio.jpg';
import logoRoseface from '../assets/images/home/logo-roseface.jpg';
import experienciaClienta from '../assets/images/home/experiencia-clienta.jpg';

const CATEGORIA_DESCRIPTOR: Record<string, string> = {
  Pestañas: 'Miradas con carácter',
  Cejas: 'El marco perfecto',
  Uñas: 'Detalle que se nota',
  Alisados: 'Brillo que se siente',
  'Depilación Láser': 'Piel lista, siempre',
  'Masajes y Faciales': 'Piel que respira',
};

export const Home: React.FC = () => {
  const { servicios, profesionales, beneficiosVIP } = useApp();

  const categorias = useMemo(() => {
    const nombres = Array.from(new Set(servicios.map((s) => s.categoria)));
    return nombres.map((nombre) => ({
      nombre,
      desde: Math.min(...servicios.filter((s) => s.categoria === nombre).map((s) => s.precio)),
    }));
  }, [servicios]);

  const resenas = useMemo(() => {
    const total = profesionales.reduce((acc, p) => acc + p.cantidadResenas, 0);
    const promedioPonderado =
      profesionales.reduce((acc, p) => acc + p.calificacionPromedio * p.cantidadResenas, 0) /
      (total || 1);
    return { total, promedio: promedioPonderado };
  }, [profesionales]);

  const mensajeWhatsApp = buildWhatsAppUrl('Hola! Quiero reservar un turno en Rose Face Studio 💕');

  return (
    <div className="pb-16">
      {/* 1. HERO — deseo / experiencia */}
      <section className="px-4 pt-8 sm:pt-14 max-w-3xl mx-auto">
        <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-rf-gold/40">
          <img
            src={heroBannerEstudio}
            alt="Rose Face Studio — Caballito"
            className="absolute inset-0 w-full h-full object-cover scale-105 blur-[3px] brightness-[0.8]"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="bg-white rounded-full p-5 sm:p-7 shadow-2xl border-2 border-rf-gold/60">
              <img
                src={logoRoseface}
                alt="Rose Face Studio"
                className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-full"
              />
            </div>
          </div>
        </div>
        <div className="text-center mt-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-rf-rose-deep">
            Roseface · Caballito
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-rf-black leading-tight">
            Tu momento para vos.
          </h1>
          <p className="text-base text-rf-charcoal font-body max-w-md mx-auto leading-relaxed">
            Belleza, cuidado y ese ratito que te debías.
          </p>
          <div className="pt-2">
            <Link to="/reserva">
              <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-sm">
                <Calendar className="w-5 h-5" />
                <span>Reservar mi turno</span>
              </Button>
            </Link>
          </div>
          <p className="text-[11px] text-rf-charcoal/80 pt-1">
            Atención personalizada · Turnos online · Confirmación por WhatsApp
          </p>
        </div>
      </section>

      {/* 2. MARCA — identificación */}
      <section className="px-4 py-16 max-w-xl mx-auto text-center space-y-4">
        <h2 className="font-display text-2xl sm:text-3xl text-rf-black leading-snug">
          Un espacio pensado para que te sientas tan bien como te ves.
        </h2>
        <p className="text-sm text-rf-charcoal leading-relaxed font-body max-w-md mx-auto">
          En Roseface cada detalle está pensado para que desconectes del afuera y te dediques,
          por una vez, el tiempo que tanto le das a los demás.
        </p>
      </section>

      {/* 3. SERVICIOS */}
      <section id="servicios" className="px-4 py-16 max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="font-display text-3xl text-rf-black">Elegí tu momento</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categorias.map((cat) => (
            <Link
              key={cat.nombre}
              to="/reserva"
              className="group block rounded-2xl border border-pink-100 bg-white p-5 space-y-1.5 hover:border-rf-gold transition-colors"
            >
              <p className="font-display text-lg text-rf-black leading-snug">{cat.nombre}</p>
              <p className="text-[11px] text-rf-rose-deep italic">
                {CATEGORIA_DESCRIPTOR[cat.nombre] ?? ''}
              </p>
              <p className="text-[11px] text-rf-charcoal pt-1">Desde {formatCurrency(cat.desde)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. EXPERIENCIA */}
      <section className="px-4 py-16 max-w-3xl mx-auto space-y-6">
        <img
          src={experienciaClienta}
          alt="Resultado real en una clienta de Roseface"
          className="w-full aspect-[4/5] object-cover rounded-2xl border border-rf-gold/40"
        />
        <p className="text-center font-display text-xl sm:text-2xl text-rf-black italic">
          Más que un turno, un momento para vos.
        </p>
      </section>

      {/* 5. EQUIPO */}
      <section className="px-4 py-16 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2 max-w-md mx-auto">
          <h2 className="font-display text-3xl text-rf-black">Detrás de Roseface</h2>
          <p className="text-sm text-rf-charcoal leading-relaxed">
            Un equipo que se formó para una sola cosa: que salgas de acá mejor que como llegaste.
          </p>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-2 px-1 scrollbar-none sm:justify-center sm:flex-wrap">
          {profesionales.map((prof) => (
            <Link
              key={prof.id}
              to={`/profesionales/${prof.id}`}
              className="flex flex-col items-center gap-2 shrink-0 w-20"
            >
              <img
                src={prof.fotoUrl}
                alt={prof.nombre}
                className="w-16 h-16 rounded-full object-cover border-2 border-rf-gold/70"
              />
              <span className="text-xs font-medium text-rf-black text-center">{prof.nombre}</span>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link to="/profesionales">
            <Button variant="outline" size="sm">
              Conocer al equipo completo
            </Button>
          </Link>
        </div>
      </section>

      {/* 5.5 VALORES */}
      <section className="px-4 py-16 max-w-4xl mx-auto space-y-8 bg-rf-blush/20">
        <div className="text-center space-y-2 max-w-md mx-auto">
          <h2 className="font-display text-3xl text-rf-black">Lo que nos mueve</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              icon: Heart,
              titulo: 'Atención personalizada',
              texto: 'Cada clienta, un plan pensado para ella.',
            },
            {
              icon: Sparkles,
              titulo: 'Un ratito solo para vos',
              texto: 'El tiempo que tanto le das a los demás.',
            },
            {
              icon: GraduationCap,
              titulo: 'Equipo formado',
              texto: 'En constante capacitación, técnica por técnica.',
            },
            {
              icon: Gem,
              titulo: 'Resultados que se notan',
              texto: 'Que salgas de acá mejor que como llegaste.',
            },
          ].map((valor) => (
            <div key={valor.titulo} className="text-center space-y-2 px-2">
              <div className="w-11 h-11 mx-auto rounded-full bg-white border border-rf-gold/50 flex items-center justify-center">
                <valor.icon className="w-5 h-5 text-rf-rose-deep" />
              </div>
              <p className="font-display text-sm font-semibold text-rf-black">{valor.titulo}</p>
              <p className="text-[11px] text-rf-charcoal leading-snug">{valor.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5.75 FIDELIZACIÓN VIP */}
      <section id="vip" className="px-4 py-16 max-w-4xl mx-auto space-y-8">
        <div className="text-center max-w-md mx-auto space-y-2">
          <Badge variant="gold" icon={<Crown className="w-3.5 h-3.5" />}>Fidelización VIP</Badge>
          <h2 className="font-display text-3xl text-rf-black">Cada visita suma</h2>
          <p className="text-sm text-rf-charcoal leading-relaxed">
            Acumulás puntos con cada servicio y los canjeás por beneficios reales.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {beneficiosVIP.slice(0, 3).map((ben) => (
            <div
              key={ben.id}
              className="rounded-2xl border border-pink-100 bg-white p-5 space-y-2 text-center"
            >
              <span className="inline-block text-[11px] font-bold text-rf-rose-deep bg-pink-50 px-2.5 py-1 rounded-full">
                {ben.puntosNecesarios} pts
              </span>
              <p className="font-display text-sm font-semibold text-rf-black">{ben.nombre}</p>
              <p className="text-[11px] text-rf-charcoal leading-snug">{ben.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. PRUEBA SOCIAL */}
      <section className="px-4 py-16 max-w-md mx-auto text-center space-y-3">
        <div className="flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-6 h-6 fill-rf-gold-bright text-rf-gold-bright" />
          ))}
        </div>
        <p className="font-display text-3xl text-rf-black">{resenas.promedio.toFixed(1)} / 5</p>
        <p className="text-sm text-rf-charcoal">
          Más de {Math.floor(resenas.total / 100) * 100} reseñas
        </p>
      </section>

      {/* 7. RESERVA — promesa central: independencia y disponibilidad */}
      <section className="px-4 py-16 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Disponible 24/7
          </span>
          <h2 className="font-display text-2xl sm:text-3xl text-rf-black leading-snug">
            Tu turno, sin preocuparte por nada.
          </h2>
          <p className="text-sm text-rf-charcoal leading-relaxed max-w-md mx-auto">
            Los turnos se pueden tomar en cualquier horario. No dependés de que alguien esté
            conectado para reservar — el sistema organiza la experiencia y el equipo se enfoca en
            brindar el servicio.
          </p>
          <p className="text-sm text-rf-charcoal italic">
            Reservás → Confirmamos → Te recordamos → Disfrutás.
          </p>
        </div>
        <div className="bg-white rounded-3xl border border-pink-100 p-6">
          <RitualTimeline estado="completado" />
        </div>
      </section>

      {/* 7.5 FAQ */}
      <section className="px-4 py-16 max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="font-display text-3xl text-rf-black">Preguntas frecuentes</h2>
        </div>
        <FAQ />
      </section>

      {/* 8. UBICACIÓN */}
      <section className="px-4 py-16 max-w-2xl mx-auto space-y-6">
        <h2 className="font-display text-2xl sm:text-3xl text-rf-black text-center">
          Estamos en Caballito.
        </h2>
        <PhotoPlaceholder
          label="Foto real de la fachada o entrada del estudio — reemplazar antes de publicar"
          aspect="aspect-[16/9]"
        />
        <div className="space-y-3 text-sm text-rf-charcoal max-w-sm mx-auto">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-rf-rose-deep shrink-0 mt-0.5" />
            <span>Av. Pedro Goyena 850, Caballito, CABA</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rf-rose-deep shrink-0" />
            <span>Lun a Sáb: 09:00 a 19:00 hs</span>
          </div>
          <a
            href={mensajeWhatsApp}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-rf-rose-deep font-medium"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Escribinos por WhatsApp</span>
          </a>
        </div>
      </section>

      {/* 9. CTA FINAL */}
      <section className="px-4 py-16 max-w-md mx-auto text-center space-y-4">
        <h2 className="font-display text-3xl text-rf-black">¿Nos regalamos un ratito?</h2>
        <Link to="/reserva">
          <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-sm">
            <Calendar className="w-5 h-5" />
            <span>Reservar mi turno</span>
          </Button>
        </Link>
        <p className="text-xs text-rf-charcoal">Te esperamos en Roseface · Caballito, CABA</p>
      </section>
    </div>
  );
};
