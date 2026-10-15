// src/components/admin/CalendarioGrilla.tsx
//
// Vista tipo calendario de un día: una columna por profesional y una fila por
// franja de 30 min. Se arma a partir de los TURNOS (no solo del horario
// habitual): cualquier reserva del día tiene que verse, venga del sitio o
// cargada a mano — aunque caiga fuera del horario de la profesional, empiece
// a una hora que no es :00/:30, se superponga con otra, o sea de una
// profesional que ese día no trabaja (15/10/2026, pedido de Yosy).
import React, { useMemo } from 'react';
import { Profesional, Turno, BloqueoHorario } from '../../types';
import { DIAS_SEMANA, generarFranjas, estadoDeFranja, sumarMinutos, turnoBloqueaHorario } from '../../lib/disponibilidad';

interface CalendarioGrillaProps {
  profesionales: Profesional[];
  fecha: string;
  turnos: Turno[];
  bloqueos?: BloqueoHorario[];
  onSeleccionarTurno: (turno: Turno) => void;
  getClientaNombre: (id: string) => string;
}

const COLOR_POR_ESTADO: Record<string, string> = {
  reservado: 'bg-amber-100 border-amber-300 text-amber-900',
  sena_confirmada: 'bg-rf-gold-bright/40 border-rf-gold text-rf-black',
  recordatorio_enviado: 'bg-purple-100 border-purple-300 text-purple-900',
  completado: 'bg-emerald-100 border-emerald-300 text-emerald-900',
};

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

const aHora = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

// Fin efectivo de un turno: si por algún dato viejo/importado viene sin fin
// válido, se le da al menos una franja para que igual se vea.
const finDelTurno = (t: Turno) => (t.horaFin > t.horaInicio ? t.horaFin : sumarMinutos(t.horaInicio, 30));

export const CalendarioGrilla: React.FC<CalendarioGrillaProps> = ({
  profesionales,
  fecha,
  turnos,
  bloqueos = [],
  onSeleccionarTurno,
  getClientaNombre,
}) => {
  const diaSemana = DIAS_SEMANA[new Date(`${fecha}T12:00:00`).getDay()];

  // Turnos que ocupan agenda ese día (los cancelados y los holds vencidos no).
  const turnosDelDia = useMemo(
    () =>
      turnos.filter(
        (t) => t.fecha === fecha && turnoBloqueaHorario(t) && profesionales.some((p) => p.id === t.profesionalId)
      ),
    [turnos, fecha, profesionales]
  );

  // Columnas: las que trabajan ese día + cualquiera que tenga un turno cargado.
  const columnas = useMemo(
    () =>
      profesionales.filter(
        (p) => !!p.horarioDisponible[diaSemana] || turnosDelDia.some((t) => t.profesionalId === p.id)
      ),
    [profesionales, diaSemana, turnosDelDia]
  );

  // Rango de filas: la unión de las jornadas y de todos los turnos del día.
  const { desde, hasta } = useMemo(() => {
    const inicios: number[] = [];
    const fines: number[] = [];
    for (const p of columnas) {
      const j = p.horarioDisponible[diaSemana];
      if (j) {
        inicios.push(aMinutos(j.desde));
        fines.push(aMinutos(j.hasta));
      }
    }
    for (const t of turnosDelDia) {
      inicios.push(aMinutos(t.horaInicio));
      fines.push(aMinutos(finDelTurno(t)));
    }
    if (inicios.length === 0) return { desde: '09:00', hasta: '19:00' };
    return {
      desde: aHora(Math.floor(Math.min(...inicios) / 30) * 30),
      hasta: aHora(Math.ceil(Math.max(...fines) / 30) * 30),
    };
  }, [columnas, turnosDelDia, diaSemana]);

  const franjas = useMemo(() => generarFranjas(desde, hasta, 30), [desde, hasta]);

  if (columnas.length === 0) {
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
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-300 border border-gray-400 inline-block" /> Bloqueado
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-pink-100">
        <div
          className="grid gap-px bg-pink-100 min-w-max"
          style={{ gridTemplateColumns: `64px repeat(${columnas.length}, minmax(92px, 1fr))` }}
        >
          {/* Header row */}
          <div className="bg-rf-cream sticky left-0 z-10" />
          {columnas.map((p) => (
            <div
              key={p.id}
              className="bg-rf-cream px-2 py-2 flex flex-col items-center gap-1 text-center"
            >
              <img src={p.fotoUrl} alt={p.nombre} className="w-7 h-7 rounded-full object-cover border border-rf-gold" />
              <span className="text-[10px] font-bold text-rf-black leading-tight">{p.nombre}</span>
            </div>
          ))}

          {/* Filas por franja horaria */}
          {franjas.map((franja) => {
            const franjaFin = sumarMinutos(franja, 30);
            return (
              <React.Fragment key={franja}>
                <div className="bg-white px-2 py-1.5 text-[10px] font-semibold text-rf-charcoal flex items-center justify-end sticky left-0">
                  {franja}
                </div>
                {columnas.map((p) => {
                  // Todos los turnos de esta profesional que tocan la franja
                  // (puede haber más de uno si se superponen: se apilan).
                  const enFranja = turnosDelDia.filter(
                    (t) => t.profesionalId === p.id && t.horaInicio < franjaFin && finDelTurno(t) > franja
                  );

                  if (enFranja.length > 0) {
                    return (
                      <div key={p.id} className="bg-white flex flex-col gap-px min-h-[28px]">
                        {enFranja.map((t) => {
                          const empiezaAca = t.horaInicio >= franja && t.horaInicio < franjaFin;
                          const horaSuelta = !t.horaInicio.endsWith(':00') && !t.horaInicio.endsWith(':30');
                          const colorClase = COLOR_POR_ESTADO[t.estado] ?? 'bg-pink-100 border-pink-300 text-rf-black';
                          return (
                            <button
                              key={t.id}
                              onClick={() => onSeleccionarTurno(t)}
                              title={`${t.horaInicio} a ${finDelTurno(t)} · ${getClientaNombre(t.clientaId)}`}
                              className={`flex-1 min-h-[28px] border-l-2 px-1.5 py-1 text-left cursor-pointer hover:brightness-95 transition-all ${colorClase}`}
                            >
                              {empiezaAca && (
                                <span className="text-[9px] font-bold leading-tight block truncate">
                                  {horaSuelta ? `${t.horaInicio} · ` : ''}
                                  {getClientaNombre(t.clientaId)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  const estado = estadoDeFranja(p, fecha, franja, turnos, bloqueos);

                  if (estado.tipo === 'fuera-horario') {
                    return <div key={p.id} className="bg-gray-100 min-h-[28px]" />;
                  }

                  if (estado.tipo === 'bloqueado') {
                    return (
                      <div
                        key={p.id}
                        title={estado.bloqueo.motivo ?? 'Horario bloqueado'}
                        className="bg-gray-300 min-h-[28px] flex items-center justify-center"
                      >
                        <span className="text-[8px] text-gray-600 font-bold">🚫</span>
                      </div>
                    );
                  }

                  return <div key={p.id} className="bg-white min-h-[28px]" />;
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
