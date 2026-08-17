// src/pages/Profesionales.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Star, ChevronRight, Sparkles } from 'lucide-react';

export const Profesionales: React.FC = () => {
  const { profesionales } = useApp();

  // Order by main specialty sequence:
  // 1. Pestañas (Mili, Sharon)
  // 2. Cejas (Camila, Valentina - Mili shown once)
  // 3. Uñas (Alexandra)
  // 4. Alisados (Martina)
  // 5. Masajes y Faciales (Sofia)
  // 6. Depilación Láser (Camila shown once)
  const ordenDeseado = [
    'prof-yosy',
    'prof-mili',
    'prof-sharon',
    'prof-camila',
    'prof-valentina',
    'prof-alexandra',
    'prof-martina',
    'prof-sofia',
  ];

  const profesionalesOrdenados = [...profesionales].sort((a, b) => {
    const idxA = ordenDeseado.indexOf(a.id);
    const idxB = ordenDeseado.indexOf(b.id);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Badge variant="rose">Nuestro Staff</Badge>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-rf-black">
          Conocé al equipo detrás de Rose Face Studio
        </h1>
        <p className="text-sm text-rf-charcoal leading-relaxed">
          Cada especialista cuenta con formación certificada y años de experiencia dedicada a cada especialidad.
        </p>
      </div>

      {/* Grid of Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {profesionalesOrdenados.map((prof) => (
          <Card key={prof.id} hoverable className="space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <Link
                to={`/profesionales/${prof.id}`}
                className="relative rounded-2xl overflow-hidden border border-pink-100 shadow-xs group block"
              >
                <img
                  src={prof.fotoUrl}
                  alt={prof.nombre}
                  className="w-full h-60 object-cover aspect-[4/5] filter brightness-[1.02] contrast-[1.03] saturate-[1.05] group-hover:scale-105 transition-transform duration-300"
                />
                {/* Google Style Rating Badge */}
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-pink-200/80 shadow-xs flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-rf-gold-bright text-rf-gold-bright" />
                  <span className="text-xs font-semibold text-rf-black font-mono">
                    {prof.calificacionPromedio.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-rf-charcoal font-medium">
                    ({prof.cantidadResenas})
                  </span>
                </div>
              </Link>

              <div>
                <h2 className="font-display font-bold text-xl text-rf-black">
                  {prof.nombre} {prof.apodo ? `(${prof.apodo})` : ''}
                </h2>
                <p className="text-xs text-rf-rose-deep font-semibold mt-0.5">
                  {prof.aniosExperiencia} años de trayectoria
                </p>
              </div>

              {/* Combined Specialty Badges */}
              <div className="flex flex-wrap gap-1.5">
                {prof.especialidades.map((esp) => (
                  <span
                    key={esp}
                    className="text-[11px] font-semibold bg-pink-50 text-rf-rose-deep px-2.5 py-1 rounded-full border border-pink-100/80"
                  >
                    {esp}
                  </span>
                ))}
              </div>

              <p className="text-xs text-rf-charcoal line-clamp-3 leading-relaxed">
                {prof.bio}
              </p>
            </div>

            <div className="pt-4 border-t border-pink-100 flex items-center justify-between gap-2">
              <Link to={`/profesionales/${prof.id}`} className="flex-1">
                <Button variant="outline" size="sm" fullWidth>
                  Ver Perfil & Galería
                </Button>
              </Link>
              <Link to={`/reserva`} className="flex-1">
                <Button variant="primary" size="sm" fullWidth>
                  Reservar Turno
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
