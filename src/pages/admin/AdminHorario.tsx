// src/pages/admin/AdminHorario.tsx
//
// Cada profesional edita sus días y sus horarios fijos desde acá. Yosy
// (admin) puede editar el de cualquiera; una profesional, solo el propio.
import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CalendarClock, Save } from 'lucide-react';
import type { DisponibilidadSemanal } from '../../types';

const DIAS: { key: string; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

type EstadoDia = { trabaja: boolean; desde: string; hasta: string; horas: string };

export const AdminHorario: React.FC = () => {
  const { profesionales, rolActivo, profesionalActivoId, guardarHorario } = useApp();
  const esProfesional = rolActivo === 'profesional';

  const editables = esProfesional
    ? profesionales.filter((p) => p.id === profesionalActivoId)
    : profesionales.filter((p) => p.id !== 'prof-camila');

  const [seleccionadoId, setSeleccionadoId] = useState<string>(
    esProfesional ? profesionalActivoId ?? '' : editables[0]?.id ?? ''
  );
  const prof = profesionales.find((p) => p.id === seleccionadoId);

  const estadoInicial = useMemo<Record<string, EstadoDia>>(() => {
    const out: Record<string, EstadoDia> = {};
    for (const { key } of DIAS) {
      const vent = prof?.horarioDisponible?.[key] ?? null;
      const fijos = prof?.horariosFijos?.[key] ?? null;
      out[key] = {
        trabaja: !!vent,
        desde: vent?.desde ?? '09:00',
        hasta: vent?.hasta ?? '19:00',
        horas: (fijos ?? []).join(', '),
      };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadoId, prof]);

  const [estado, setEstado] = useState<Record<string, EstadoDia>>(estadoInicial);
  const [guardando, setGuardando] = useState(false);

  // Rehidratar cuando cambia la profesional seleccionada
  React.useEffect(() => {
    setEstado(estadoInicial);
  }, [estadoInicial]);

  const setDia = (key: string, patch: Partial<EstadoDia>) =>
    setEstado((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleGuardar = async () => {
    if (!prof) return;
    setGuardando(true);
    const horarioDisponible: DisponibilidadSemanal = {};
    const horariosFijos: { [dia: string]: string[] | null } = {};
    for (const { key } of DIAS) {
      const d = estado[key];
      if (!d.trabaja) {
        horarioDisponible[key] = null;
        horariosFijos[key] = null;
        continue;
      }
      const horas = d.horas
        .split(/[,\s]+/)
        .map((h) => h.trim())
        .filter((h) => /^\d{1,2}:\d{2}$/.test(h))
        .map((h) => (h.length === 4 ? '0' + h : h))
        .sort();
      horarioDisponible[key] = { desde: d.desde, hasta: d.hasta };
      horariosFijos[key] = horas.length > 0 ? horas : null;
    }
    await guardarHorario(prof.id, horarioDisponible, horariosFijos);
    setGuardando(false);
  };

  return (
    <div className="space-y-6 font-admin max-w-2xl">
      <div className="flex items-center gap-2 pb-4 border-b border-pink-100">
        <CalendarClock className="w-5 h-5 text-rf-rose-deep" />
        <h1 className="font-display text-2xl font-bold text-rf-black">
          {esProfesional ? 'Mi Horario' : 'Horarios del equipo'}
        </h1>
      </div>

      {!esProfesional && (
        <div>
          <label className="text-xs font-bold text-rf-charcoal block mb-1">Profesional</label>
          <select
            value={seleccionadoId}
            onChange={(e) => setSeleccionadoId(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 rounded-xl border border-pink-200 text-sm font-semibold"
          >
            {editables.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="text-xs text-rf-charcoal">
        Poné los horarios de inicio de cada turno separados por coma (ej: <em>09:00, 11:00, 14:00, 16:00</em>).
        La ventana "desde / hasta" limita el día; los turnos que se ofrecen son exactamente las horas que cargues.
      </p>

      <div className="space-y-3">
        {DIAS.map(({ key, label }) => {
          const d = estado[key];
          return (
            <Card key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-rf-black">{label}</span>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.trabaja}
                    onChange={(e) => setDia(key, { trabaja: e.target.checked })}
                  />
                  {d.trabaja ? 'Trabaja' : 'No trabaja'}
                </label>
              </div>

              {d.trabaja && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-rf-charcoal block mb-0.5">Desde</label>
                      <input
                        type="time"
                        value={d.desde}
                        onChange={(e) => setDia(key, { desde: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg border border-pink-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-rf-charcoal block mb-0.5">Hasta</label>
                      <input
                        type="time"
                        value={d.hasta}
                        onChange={(e) => setDia(key, { hasta: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg border border-pink-200 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-rf-charcoal block mb-0.5">
                      Horarios de turno (separados por coma)
                    </label>
                    <input
                      type="text"
                      value={d.horas}
                      onChange={(e) => setDia(key, { horas: e.target.value })}
                      placeholder="09:00, 11:00, 14:00, 16:00"
                      className="w-full px-2 py-1.5 rounded-lg border border-pink-200 text-xs"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Vacío = grilla automática cada 30 min dentro de la ventana.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleGuardar} disabled={guardando}>
          <Save className="w-4 h-4" />
          <span>{guardando ? 'Guardando...' : 'Guardar horario'}</span>
        </Button>
        {prof && <Badge variant="rose" size="sm">{prof.nombre}</Badge>}
      </div>
    </div>
  );
};
