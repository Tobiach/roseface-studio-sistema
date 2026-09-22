// src/pages/Profesionales.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/ui/Badge';
import { Star } from 'lucide-react';
import { slugDeNombre } from '../lib/profesionalSlug';

export const Profesionales: React.FC = () => {
  const { profesionales } = useApp();

  // Orden en la página de equipo — Depilación Láser (prof-camila) va al
  // final, es el slot del equipamiento, no una persona, pero Yosy quiere
  // que igual aparezca en la grilla del equipo.
  const ordenDeseado = ['prof-yosy', 'prof-mili', 'prof-sharon', 'prof-alexandra', 'prof-martina', 'prof-sofia', 'prof-camila'];

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

      {/* Grid compacta — foto + nombre, pensada para que en el celular entren
          3 arriba y 3 abajo en una sola pantalla sin scrollear. El detalle
          (bio, especialidades, reservar) vive en el perfil de cada una. */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5">
        {profesionalesOrdenados.map((prof) => (
          <Link
            key={prof.id}
            to={`/profesionales/${slugDeNombre(prof.nombre)}`}
            className="group space-y-1.5 sm:space-y-2"
          >
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-pink-100 shadow-xs">
              <img
                src={prof.fotoUrl}
                alt={prof.nombre}
                className="w-full aspect-[4/5] object-cover object-top filter brightness-[1.02] contrast-[1.03] saturate-[1.05] group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-pink-200/80 shadow-xs flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-rf-gold-bright text-rf-gold-bright" />
                <span className="text-[10px] font-semibold text-rf-black font-mono">
                  {prof.calificacionPromedio.toFixed(1)}
                </span>
              </div>
            </div>
            <h2 className="font-display font-bold text-xs sm:text-sm text-rf-black text-center leading-tight">
              {prof.nombre}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
};
