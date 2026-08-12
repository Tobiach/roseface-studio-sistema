// src/pages/Home.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { RitualTimeline } from '../components/ui/RitualTimeline';
import { formatCurrency } from '../lib/formatters';
import {
  Sparkles,
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  Heart,
  Crown,
  ChevronRight,
  ShieldCheck,
  Award,
} from 'lucide-react';

export const Home: React.FC = () => {
  const { servicios, profesionales, beneficiosVIP } = useApp();
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');

  const categorias = [
    'Todas',
    'Pestañas',
    'Cejas',
    'Uñas',
    'Alisados',
    'Depilación Láser',
    'Masajes y Faciales',
  ];

  const serviciosFiltrados =
    categoriaSeleccionada === 'Todas'
      ? servicios
      : servicios.filter((s) => s.categoria === categoriaSeleccionada);

  return (
    <div className="space-y-20 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pink-50/80 via-rf-cream to-rf-cream pt-12 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rf-blush text-rf-rose-deep text-xs font-semibold border border-pink-200">
                <Sparkles className="w-3.5 h-3.5 text-rf-gold" />
                <span>Estudio Estético Exclusivo en Caballito</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-rf-black leading-tight">
                Tu momento de cuidado, <br />
                <span className="italic text-rf-rose-deep font-serif">sin vueltas ni esperas</span>
              </h1>

              <p className="text-base sm:text-lg text-rf-charcoal max-w-xl mx-auto lg:mx-0 leading-relaxed font-body">
                Reservá tu turno en 60 segundos con confirmación inmediata, recordatorios automáticos por WhatsApp y seña transparente.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link to="/reserva">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-md">
                    <Calendar className="w-5 h-5" />
                    <span>Reservar mi turno</span>
                  </Button>
                </Link>
                <Link to="/profesionales">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    <span>Conocer al equipo</span>
                  </Button>
                </Link>
              </div>

              {/* Guarantees Badges */}
              <div className="pt-6 border-t border-pink-200/60 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-rf-charcoal">
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-rf-gold" />
                  <span>Seña 30% protegida</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-rf-rose-deep" />
                  <span>Cancelación flexible +48hs</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>4.9 ★ (Más de 500 reseñas)</span>
                </div>
              </div>
            </div>

            {/* Right Column Signature Element Showcase */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-pink-100 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-pink-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rf-rose-deep animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rf-rose-deep">
                      Ritual de Atención en Vivo
                    </span>
                  </div>
                  <Badge variant="gold" size="sm">Turno en Progreso</Badge>
                </div>

                {/* Live Ritual Timeline Signature Element */}
                <RitualTimeline estado="sena_confirmada" />

                <div className="bg-rf-cream p-4 rounded-2xl border border-pink-200/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-rf-black">
                    <span>Lifting de Pestañas + Nutrición</span>
                    <span className="text-rf-rose-deep font-bold">{formatCurrency(30000)}</span>
                  </div>
                  <div className="flex items-center justify-between text-rf-charcoal text-[11px]">
                    <span>Profesional: Mili</span>
                    <span>Seña confirmada ($9.000)</span>
                  </div>
                </div>

                <p className="text-[11px] text-center text-rf-charcoal italic">
                  ✨ "Cada turno se gestiona solo de principio a fin, para que tu única preocupación sea disfrutar."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATÁLOGO DE SERVICIOS */}
      <section id="servicios" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="rose">Nuestros Servicios</Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-rf-black">
            Experiencias diseñadas para resaltar tu mirada y tu piel
          </h2>
          <p className="text-sm text-rf-charcoal">
            Elegí la categoría para ver detalles, precios y reservar tu lugar.
          </p>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaSeleccionada(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                categoriaSeleccionada === cat
                  ? 'bg-rf-rose-deep text-white shadow-xs'
                  : 'bg-white text-rf-charcoal border border-pink-100 hover:bg-rf-blush/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviciosFiltrados.map((servicio) => (
            <Card key={servicio.id} hoverable className="flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="rose">{servicio.categoria}</Badge>
                  <span className="text-xs text-rf-charcoal flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-rf-rose-deep" />
                    {servicio.duracionMinutos} min
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-rf-black">
                  {servicio.nombre}
                </h3>
                <p className="text-xs text-rf-charcoal leading-relaxed">
                  {servicio.descripcion}
                </p>
              </div>

              <div className="pt-4 border-t border-pink-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Precio Total</span>
                  <span className="text-lg font-bold text-rf-black">
                    {formatCurrency(servicio.precio)}
                  </span>
                </div>

                <Link to={`/reserva?servicioId=${servicio.id}`}>
                  <Button variant="secondary" size="sm">
                    <span>Reservar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* EQUIPO DE PROFESIONALES PREVIEW */}
      <section className="bg-rf-blush/30 py-16 border-y border-pink-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <Badge variant="gold">Equipo Experto</Badge>
              <h2 className="font-display text-3xl font-bold text-rf-black mt-2">
                Especialistas apasionadas por tu belleza
              </h2>
            </div>
            <Link to="/profesionales">
              <Button variant="outline" size="sm">
                <span>Ver todo el equipo</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {profesionales.slice(0, 4).map((prof) => (
              <Card key={prof.id} hoverable className="text-center space-y-4">
                <div className="relative mx-auto w-24 h-24 rounded-full overflow-hidden border-2 border-rf-gold p-0.5">
                  <img
                    src={prof.fotoUrl}
                    alt={prof.nombre}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-rf-black">{prof.nombre}</h3>
                  <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                    {prof.especialidades.map((esp) => (
                      <span key={esp} className="text-[10px] bg-pink-50 text-rf-rose-deep px-2 py-0.5 rounded-full font-medium">
                        {esp}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1 text-xs text-amber-600 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{prof.calificacionPromedio}</span>
                  <span className="text-gray-400 font-normal">({prof.cantidadResenas} reseñas)</span>
                </div>

                <Link to={`/profesionales/${prof.id}`} className="block w-full">
                  <Button variant="outline" size="sm" fullWidth>
                    Ver perfil
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ECOSISTEMA VIP BANNER PREVIEW */}
      <section id="vip" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-rf-black via-[#2a1d22] to-rf-black text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-rf-gold/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rf-gold/10 rounded-full blur-3xl -z-0" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <Badge variant="gold" icon={<Crown className="w-3.5 h-3.5" />}>
                Ecosistema VIP Roseface
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl font-bold leading-snug">
                Tu fidelidad tiene premios exclusivos
              </h2>
              <p className="text-sm text-pink-100/80 leading-relaxed max-w-lg">
                Sumá puntos con cada visita, disfrutá de tu bono especial de cumpleaños y regalale descuentos a tus amigas con nuestro programa de referidos.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                {beneficiosVIP.slice(0, 3).map((ben) => (
                  <div key={ben.id} className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                    <p className="font-semibold text-rf-gold-bright">{ben.nombre}</p>
                    <p className="text-[10px] text-gray-300 mt-1">{ben.puntosNecesarios > 0 ? `${ben.puntosNecesarios} pts` : 'Gratis en Cumpleaños'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 text-center lg:text-right">
              <Link to="/reserva">
                <Button variant="gold" size="lg" className="shadow-lg">
                  <Sparkles className="w-5 h-5" />
                  <span>Empezar a sumar puntos</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
