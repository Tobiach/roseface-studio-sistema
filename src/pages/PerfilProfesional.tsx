// src/pages/PerfilProfesional.tsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/formatters';
import { Lightbox } from '../components/ui/Lightbox';
import {
  Star,
  Calendar,
  Clock,
  Sparkles,
  ChevronLeft,
  CheckCircle2,
  Info,
  Expand,
} from 'lucide-react';

export const PerfilProfesional: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profesionales, servicios } = useApp();
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [imagenActiva, setImagenActiva] = useState<number | null>(null);

  const prof = profesionales.find((p) => p.id === id);

  if (!prof) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-rf-black">Profesional no encontrada</h2>
        <Link to="/profesionales">
          <Button variant="primary">Volver al equipo</Button>
        </Link>
      </div>
    );
  }

  // Find services performed by this professional
  const serviciosQueRealiza = servicios.filter((s) =>
    s.profesionalesQueLoRealizan.includes(prof.id)
  );

  // Gallery categorization tabs for Mili or pros with multiple techniques
  const esCamila = prof.id === 'prof-camila';
  const esMili = prof.id === 'prof-mili';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10 font-body">
      <Link
        to="/profesionales"
        className="inline-flex items-center gap-1 text-xs text-rf-charcoal hover:text-rf-rose-deep font-medium"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Volver a todo el equipo</span>
      </Link>

      {/* Hero Header */}
      <Card className="p-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="relative shrink-0">
            <img
              src={prof.fotoUrl}
              alt={prof.nombre}
              className="w-36 h-36 rounded-2xl object-cover aspect-[4/5] border-2 border-rf-gold shadow-md filter brightness-[1.02] contrast-[1.03] saturate-[1.05]"
            />
          </div>

          <div className="space-y-3 text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {/* Google Style Rating */}
              <div className="bg-pink-50 px-3 py-1 rounded-full border border-pink-200/80 flex items-center gap-1.5 text-xs font-semibold text-rf-black">
                <Star className="w-3.5 h-3.5 fill-rf-gold-bright text-rf-gold-bright" />
                <span>{prof.calificacionPromedio.toFixed(1)}</span>
                <span className="text-rf-charcoal text-[11px] font-normal">
                  ({prof.cantidadResenas} opiniones)
                </span>
              </div>
              <Badge variant="rose">{prof.aniosExperiencia} años de trayectoria</Badge>
            </div>

            <h1 className="font-display text-3xl font-bold text-rf-black">
              {prof.nombre} {prof.apodo ? `(${prof.apodo})` : ''}
            </h1>

            <p className="text-sm text-rf-charcoal leading-relaxed">{prof.bio}</p>

            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-1">
              {prof.especialidades.map((esp) => (
                <span
                  key={esp}
                  className="text-xs bg-pink-50 text-rf-rose-deep font-semibold px-3 py-1 rounded-full border border-pink-100"
                >
                  {esp}
                </span>
              ))}
            </div>

            <div className="pt-2">
              <Link to={`/reserva`}>
                <Button variant="primary" size="md">
                  <Calendar className="w-4 h-4" />
                  <span>Reservar turno con {prof.nombre}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Services performed by this professional */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-rf-black">
          Servicios que realiza {prof.nombre}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serviciosQueRealiza.map((serv) => (
            <Card key={serv.id} className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-rf-black">{serv.nombre}</h3>
                <p className="text-xs text-rf-charcoal flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rf-rose-deep" />
                    {serv.duracionMinutos} min
                  </span>
                  <span>•</span>
                  <span className="font-bold text-rf-rose-deep">{formatCurrency(serv.precio)}</span>
                </p>
              </div>

              <Link to={`/reserva?servicioId=${serv.id}`}>
                <Button variant="secondary" size="sm">
                  <span>Reservar</span>
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* Gallery of Work Samples */}
      {prof.galeria.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold text-rf-black">
                {esCamila ? 'Equipamiento & Gabinete' : 'Galería de Trabajos Realizados'}
              </h2>
              <p className="text-xs text-rf-charcoal">
                {esCamila
                  ? 'Gabinete equipado con máquina Soprano Ice de última generación.'
                  : `Muestra de técnicas y resultados reales de ${prof.nombre}.`}
              </p>
            </div>

            {esCamila && (
              <Badge variant="gold" icon={<Info className="w-3 h-3" />}>
                Equipamiento Certificado Soprano Ice
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {prof.galeria.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setImagenActiva(idx)}
                className="rounded-2xl overflow-hidden aspect-square border border-pink-100 shadow-xs relative group bg-pink-50/50 cursor-pointer text-left"
              >
                <img
                  src={imgUrl}
                  alt={`Trabajo de ${prof.nombre} ${idx + 1}`}
                  className="w-full h-full object-cover filter brightness-[1.02] contrast-[1.03] saturate-[1.05] group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                  <span className="text-[10px] text-white font-medium bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {esCamila ? 'Equipamiento Soprano Ice' : `${prof.nombre} — Trabajo real`}
                  </span>
                  <Expand className="w-4 h-4 text-white shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {imagenActiva !== null && (
        <Lightbox
          imagenes={prof.galeria}
          indiceActivo={imagenActiva}
          onCerrar={() => setImagenActiva(null)}
          onCambiarIndice={setImagenActiva}
          alt={`Trabajo de ${prof.nombre}`}
        />
      )}
    </div>
  );
};
