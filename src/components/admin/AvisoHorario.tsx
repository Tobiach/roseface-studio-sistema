// src/components/admin/AvisoHorario.tsx
//
// Aviso informativo (nunca bloquea) cuando el equipo carga o mueve un turno a un horario que no es de los
// "habituales" de la profesional: Yosy y las profesionales pueden agendar a cualquier hora (una clienta que
// llega sobre la hora, fuera de horario, etc.); las clientas solo ven en la web los bloques fijos de cada una.
import React from 'react';
import { encajeEnHorario } from '../../lib/disponibilidad';
import type { Profesional } from '../../types';

interface Props {
  profesional?: Pick<Profesional, 'nombre' | 'horarioDisponible' | 'horariosFijos'>;
  fecha: string;
  hora: string;
}

export const AvisoHorario: React.FC<Props> = ({ profesional, fecha, hora }) => {
  if (!profesional || !fecha || !hora) return null;
  const e = encajeEnHorario(profesional, fecha, hora);
  if (e.tipo === 'habitual') return null;

  const fueraDeJornada = e.tipo === 'dia_libre' || e.tipo === 'fuera_de_jornada';
  const texto =
    e.tipo === 'dia_libre'
      ? `⏱ ${profesional.nombre} no trabaja los ${e.dia}. Se carga igual: solo lo ve el equipo, las clientas no pueden reservar ese día en la web.`
      : e.tipo === 'fuera_de_jornada'
      ? `⏱ Fuera del horario de ${profesional.nombre} (${e.dia}: ${e.desde} a ${e.hasta}). Se carga igual: solo lo ve el equipo, las clientas no ven ese horario en la web.`
      : `ℹ️ No es uno de los horarios que ven las clientas en la web${
          e.bloques?.length ? ` (${e.bloques.join(', ')})` : ''
        }, pero está dentro de la jornada de ${profesional.nombre}. Se carga igual.`;

  return (
    <p
      className={`rounded-xl border p-2.5 text-[11px] font-semibold ${
        fueraDeJornada ? 'bg-violet-50 border-violet-200 text-violet-900' : 'bg-sky-50 border-sky-200 text-sky-900'
      }`}
    >
      {texto}
    </p>
  );
};
