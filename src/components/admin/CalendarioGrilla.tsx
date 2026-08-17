// src/components/admin/CalendarioGrilla.tsx
import React, { useMemo } from 'react';
import { Profesional, Turno } from '../../types';
import { DIAS_SEMANA, generarFranjas, estadoDeFranja } from '../../lib/disponibilidad';

interface CalendarioGrillaProps {
  profesionales: Profesional[];
  fecha: string;
  turnos: Turno[];
  onSeleccionarTurno: (turno: Turno) => void;
  getClientaNombre: (id: string) => string;
}

const COLOR_POR_ESTADO: Record<string, string> = {
  reservado: 'bg-amber-100 border-amber-300 text-amber-900',
  sena_confirmada: 'bg-rf-gold-bright/40 border-rf-gold text-rf-black',
  recordatorio_enviado: 'bg-purple-100 border-purple-300 text-purple-900',
  completado: 'bg-emerald-100 border-emerald-300 text-emerald-900',
};

export const CalendarioGrilla: React.FC<CalendarioGrillaProps> = ({
  profesionales,
  fecha,
  turnos,
  onSeleccionarTurno,
  getClientaNombre,
}) => {
  const diaSemana = DIAS_SEMANA[new Date(`${fecha}T12:00:00`).getDay()];

  const profesionalesDelDia = useMemo(
    () => profesionales.filter((p) => !!p.horarioDisponible[diaSemana]),
    [profesionales, diaSemana]
  );

  const { desde, hasta } = useMemo(() => {
    const jornadas = profesionalesDelDia
      .map((p) => p.horarioDisponible[diaSemana])
      .filter((j): j is { desde: string; hasta: string } => !!j);
    if (jornadas.length === 0) return { desde: '09:00', hasta: '19:00' };
    return {
      desde: jornadas.reduce((min, j) => (j.desde < min ? j.desde : min), jornadas[0].desde),
      hasta: jornadas.reduce((max, j) => (j.hasta > max ? j.hasta : max), jornadas[0].hasta),
    };
  }, [profesionalesDelDia, diaSemana]);

  const franjas = useMemo(() => generarFranjas(desde, hasta, 30), [desde, hasta]);

  if (profesionalesDelDia.length === 0) {
    return (
      <div className="text-center py-10 text-xs text-rf-charcoal bg-rf-cream rounded-2xl border border-pink-100">
        Ninguna profesional trabaja este día.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Referencia de colores */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-rf-charcoal">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" /> Fuera de horario
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-white border border-pink-200 inline-block" /> Libre
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 inline-block" /> Reservado / seña
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 inline-block" /> Completado
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-pink-100">
        <div
          className="grid gap-px bg-pink-100 min-w-max"
          style={{ gridTemplateColumns: `64px repeat(${profesionalesDelDia.length}, minmax(92px, 1fr))` }}
        >
          {/* Header row */}
          <div className="bg-rf-cream sticky left-0 z-10" />
          {profesionalesDelDia.map((p) => (
            <div
              key={p.id}
              className="bg-rf-cream px-2 py-2 flex flex-col items-center gap-1 text-center"
            >
              <img src={p.fotoUrl} alt={p.nombre} className="w-7 h-7 rounded-full object-cover border border-rf-gold" />
              <span className="text-[10px] font-bold text-rf-black leading-tight">{p.nombre}</span>
            </div>
          ))}

          {/* Filas por franja horaria */}
          {franjas.map((franja) => (
            <React.Fragment key={franja}>
              <div className="bg-white px-2 py-1.5 text-[10px] font-semibold text-rf-charcoal flex items-center justify-end sticky left-0">
                {franja}
              </div>
              {profesionalesDelDia.map((p) => {
                const estado = estadoDeFranja(p, fecha, franja, turnos);

                if (estado.tipo === 'fuera-horario') {
                  return <div key={p.id} className="bg-gray-100 min-h-[28px]" />;
                }

                if (estado.tipo === 'libre') {
                  return <div key={p.id} className="bg-white min-h-[28px]" />;
                }

                const esInicio = estado.turno.horaInicio === franja;
                const colorClase = COLOR_POR_ESTADO[estado.turno.estado] ?? 'bg-pink-100 border-pink-300 text-rf-black';

                return (
                  <button
                    key={p.id}
                    onClick={() => onSeleccionarTurno(estado.turno)}
                    className={`min-h-[28px] border-l-2 px-1.5 py-1 text-left cursor-pointer hover:brightness-95 transition-all ${colorClase}`}
                  >
                    {esInicio && (
                      <span className="text-[9px] font-bold leading-tight block truncate">
                        {getClientaNombre(estado.turno.clientaId)}
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
