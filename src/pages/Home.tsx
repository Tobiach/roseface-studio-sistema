// src/pages/Home.tsx
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RitualTimeline } from '../components/ui/RitualTimeline';
import { formatCurrency } from '../lib/formatters';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { FAQ } from '../components/ui/FAQ';
import { Lightbox } from '../components/ui/Lightbox';
import { urlFor } from '../data/trabajosFotos';
import { Calendar, Star, MapPin, Clock, MessageCircle, Heart, Sparkles, GraduationCap, Gem, Crown, ExternalLink } from 'lucide-react';
import heroBannerEstudio from '../assets/images/home/hero-banner-estudio.jpg';

// Trabajos reales destacados en el Home — nombre de técnica = nombre real
// del archivo (fotos provistas por Yosy, ver trabajosFotos.ts).
const TRABAJOS_DESTACADOS = [
  { archivo: 'Clasicas_Lash_1.jpg', tecnica: 'Clásicas Lash' },
  { archivo: 'Hibrida_Lash_1.jpg', tecnica: 'Híbrida Lash' },
  { archivo: 'Natural_Volumen_1.jpg', tecnica: 'Natural Volumen' },
  { archivo: 'Efecto_Humedo_1.jpg', tecnica: 'Efecto Húmedo' },
  { archivo: 'Medio_Volumen_1.jpg', tecnica: 'Medio Volumen' },
  { archivo: 'Lash_Rose_Face_1.jpg', tecnica: 'Lash Rose Face' },
  { archivo: 'Volumen_Brasilero_4D_1.jpg', tecnica: 'Volumen Brasileño 4D' },
  { archivo: 'Lash_Lifting_1.jpg', tecnica: 'Lash Lifting' },
  { archivo: 'Volumen_Tecnologico_1.jpg', tecnica: 'Volumen Tecnológico' },
  { archivo: 'Hibrida_Lash_2.jpg', tecnica: 'Híbrida Lash' },
  { archivo: 'Volumen_Brasilero_6D_1.jpg', tecnica: 'Volumen Brasileño 6D' },
  { archivo: 'Medio_Volumen_2.jpg', tecnica: 'Medio Volumen' },
].map((t) => ({ ...t, url: urlFor(t.archivo) }));

const UNAS_DESTACADAS = ['Unas_1.jpg', 'Unas_4.jpg', 'Unas_8.jpg'].map((archivo) => ({
  archivo,
  tecnica: 'Uñas',
  url: urlFor(archivo),
}));

const GALERIA_HOME = [...TRABAJOS_DESTACADOS, ...UNAS_DESTACADAS];

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
  const [imagenActiva, setImagenActiva] = useState<number | null>(null);

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
      <section className="px-4 pt-8 sm:pt-14 max-w-4xl mx-auto">
        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-rf-gold/40">
          <img
            src={heroBannerEstudio}
            alt="Rose Face Studio — Caballito"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="text-center mt-8 space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-rf-rose-deep">
            Rose Face · Caballito
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-rf-black leading-tight">
            Belleza que se siente
          </h1>
          <p className="text-base text-rf-charcoal font-body max-w-md mx-auto leading-relaxed">
            Pestañas · Uñas · Cabello · Bienestar
          </p>
          <div className="pt-2">
            <Link to="/reserva">
              <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-sm">
                <Calendar className="w-5 h-5" />
                <span>Reservá tu momento</span>
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
          Una mirada puede cambiarlo todo.
        </h2>
        <p className="text-sm text-rf-charcoal leading-relaxed font-body max-w-md mx-auto">
          En Roseface potenciamos lo que ya es tuyo. Especialistas en pestañas y apasionadas por
          esos pequeños detalles que hacen que salgas sintiéndote increíble.
        </p>
        <div className="pt-2">
          <Link to="/#servicios">
            <Button variant="outline" size="md">
              Descubrí Roseface
            </Button>
          </Link>
        </div>
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

      {/* 4. TRABAJOS REALIZADOS — genera confianza mostrando resultados reales */}
      <section className="px-4 py-16 max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2 max-w-md mx-auto">
          <h2 className="font-display text-3xl text-rf-black">Trabajos reales, resultados reales</h2>
          <p className="text-sm text-rf-charcoal">Una muestra de lo que hacemos todos los días en Roseface.</p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {GALERIA_HOME.map((trabajo, idx) => (
            <button
              key={trabajo.archivo}
              onClick={() => setImagenActiva(idx)}
              className="group text-left cursor-pointer space-y-1"
            >
              <div className="aspect-square rounded-xl overflow-hidden border border-pink-100 bg-pink-50/50">
                <img
                  src={trabajo.url}
                  alt={trabajo.tecnica}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-[9px] sm:text-[10px] font-semibold text-rf-charcoal text-center leading-tight truncate">
                {trabajo.tecnica}
              </p>
            </button>
          ))}
        </div>

        <p className="text-center font-display text-xl sm:text-2xl text-rf-black italic pt-2">
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

      {/* 8. UBICACIÓN — video humaniza a Yosy, después la info práctica */}
      <section className="px-4 py-16 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-rf-rose-deep">Conocé a Yosy</p>
          <h2 className="font-display text-2xl sm:text-3xl text-rf-black">Estamos en Caballito.</h2>
        </div>

        <div className="relative w-full aspect-video max-w-md mx-auto rounded-2xl overflow-hidden border border-rf-gold/40 shadow-md bg-black">
          <iframe
            src="https://drive.google.com/file/d/1FDZNrYOEwciRTI74sDVlsJj92N2-We2f/preview"
            title="Un día con Yosy"
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>

        <div className="space-y-3 text-sm text-rf-charcoal max-w-sm mx-auto">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-rf-rose-deep shrink-0 mt-0.5" />
            <span>Av. Acoyte 25, C1405BFA Cdad. Autónoma de Buenos Aires</span>
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

      {/* 8.5 RESEÑAS REALES */}
      <section className="px-4 py-16 max-w-md mx-auto text-center space-y-4">
        <div className="flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-6 h-6 fill-rf-gold-bright text-rf-gold-bright" />
          ))}
        </div>
        <h2 className="font-display text-2xl text-rf-black">Lo que dicen de nosotras</h2>
        <p className="text-sm text-rf-charcoal">
          Mirá las reseñas reales de clientas en nuestra ficha de Google.
        </p>
        <a
          href="https://maps.app.goo.gl/8f4PV4y6jJg8mTFh8"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-rf-gold text-rf-black text-sm font-semibold hover:bg-rf-cream transition-colors"
        >
          <span>Ver reseñas en Google Maps</span>
          <ExternalLink className="w-4 h-4" />
        </a>
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

      {imagenActiva !== null && (
        <Lightbox
          imagenes={GALERIA_HOME.map((t) => t.url)}
          indiceActivo={imagenActiva}
          onCerrar={() => setImagenActiva(null)}
          onCambiarIndice={setImagenActiva}
          alt="Trabajo realizado en Rose Face Studio"
        />
      )}
    </div>
  );
};
