// src/components/admin/PanelEditarTurno.tsx
//
// Panel del modal de turno para editar una reserva ya hecha: servicio (y con eso
// lo que se factura), día, hora, profesional (solo Yosy) y, solo Yosy, el precio
// y la seña a mano. El guardado pasa por api/editar-turno.ts, que recalcula el
// total en el servidor y deja el cambio anotado en el turno.
import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { finSinPasarMedianoche, turnoBloqueaHorario } from '../../lib/disponibilidad';
import { calcularMontoSena } from '../../lib/pricing';
import { estadoSena } from '../../lib/recordatorios';
import { AvisoHorario } from './AvisoHorario';
import type { CambiosTurno } from '../../context/AppContext';
import type { BloqueoHorario, Profesional, Servicio, Turno } from '../../types';

interface Props {
  turno: Turno;
  servicios: Servicio[];
  profesionales: Profesional[];
  turnos: Turno[];
  bloqueos: BloqueoHorario[];
  esAdmin: boolean;
  getClientaNombre: (id: string) => string;
  onGuardar: (cambios: CambiosTurno) => Promise<boolean>;
  onCancelar: () => void;
}

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const campo = 'w-full px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white';

export const PanelEditarTurno: React.FC<Props> = ({
  turno,
  servicios,
  profesionales,
  turnos,
  bloqueos,
  esAdmin,
  getClientaNombre,
  onGuardar,
  onCancelar,
}) => {
  const [servicioId, setServicioId] = useState(turno.servicioId);
  const [profesionalId, setProfesionalId] = useState(turno.profesionalId);
  const [fecha, setFecha] = useState(turno.fecha);
  const [horaInicio, setHoraInicio] = useState(turno.horaInicio);
  const [finManual, setFinManual] = useState<string | null>(null);
  const [totalManual, setTotalManual] = useState('');
  const [senaManual, setSenaManual] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const servicioNuevo = servicios.find((s) => s.id === servicioId);
  const profesionalSel = profesionales.find((p) => p.id === profesionalId);
  const cambiaServicio = servicioId !== turno.servicioId;
  const cambiaProfesional = profesionalId !== turno.profesionalId;
  const cambiaHorario = fecha !== turno.fecha || horaInicio !== turno.horaInicio;

  // Servicios que realiza la profesional elegida (más el actual, para que no desaparezca de la lista).
  const serviciosDisponibles = servicios.filter(
    (s) => s.profesionalesQueLoRealizan.includes(profesionalId) || s.id === turno.servicioId
  );
  const servicioValido =
    !!servicioNuevo &&
    (servicioNuevo.profesionalesQueLoRealizan.includes(profesionalId) || (!cambiaServicio && !cambiaProfesional));

  // Duración y hora de fin: si cambia el servicio, la del servicio nuevo; si solo se mueve, la que ya tenía.
  // Si el fin quedó recortado a las 23:59 (turno nocturno), la duración real es la del servicio.
  const duracionActual =
    turno.horaFin === '23:59' && servicioNuevo ? servicioNuevo.duracionMinutos : aMinutos(turno.horaFin) - aMinutos(turno.horaInicio);
  const horaFinCalculada = horaInicio
    ? finSinPasarMedianoche(horaInicio, cambiaServicio && servicioNuevo ? servicioNuevo.duracionMinutos : duracionActual > 0 ? duracionActual : 30)
    : '';
  const horaFin = finManual ?? horaFinCalculada;

  // Plata: lo que muestra es una vista previa — el total real lo recalcula el servidor.
  const sumaExtras = (turno.serviciosExtra ?? []).reduce((a, e) => a + e.precio, 0);
  const totalCalculado = cambiaServicio && servicioNuevo ? servicioNuevo.precio + sumaExtras : turno.montoTotal;
  const totalManualNum = totalManual === '' ? null : Number(totalManual);
  const totalFinal = esAdmin && totalManualNum !== null && Number.isFinite(totalManualNum) ? totalManualNum : totalCalculado;
  const senaPendiente = estadoSena(turno) === 'pendiente';
  const senaCalculada =
    cambiaServicio && senaPendiente && servicioNuevo ? Math.min(calcularMontoSena(servicioNuevo), totalFinal) : turno.montoSena;
  const senaManualNum = senaManual === '' ? null : Number(senaManual);
  const senaFinal = esAdmin && senaManualNum !== null && Number.isFinite(senaManualNum) ? senaManualNum : senaCalculada;

  // Agenda de la profesional ese día (sin este turno) y choques con el horario elegido.
  const delDia = turnos
    .filter((t) => t.id !== turno.id && t.profesionalId === profesionalId && t.fecha === fecha && turnoBloqueaHorario(t))
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const mismoInicio = horaInicio ? delDia.find((t) => t.horaInicio === horaInicio) : undefined;
  const solapados =
    horaInicio && horaFin && horaFin > horaInicio
      ? delDia.filter((t) => t.id !== mismoInicio?.id && t.horaInicio < horaFin && t.horaFin > horaInicio)
      : [];
  const bloqueada = bloqueos.some(
    (b) =>
      b.profesionalId === profesionalId &&
      b.fecha === fecha &&
      (b.diaCompleto || !b.horaInicio || !b.horaFin || (b.horaInicio < horaFin && b.horaFin > horaInicio))
  );

  const yaPaso = !esAdmin && cambiaHorario && !!fecha && !!horaInicio && new Date(`${fecha}T${horaInicio}:00-03:00`).getTime() <= Date.now();
  const finInvalido = !horaFin || horaFin <= horaInicio;

  // Solo se mandan los campos que realmente cambiaron.
  const cambios: CambiosTurno = {};
  if (cambiaServicio) cambios.servicioId = servicioId;
  if (esAdmin && cambiaProfesional) cambios.profesionalId = profesionalId;
  if (fecha !== turno.fecha) cambios.fecha = fecha;
  if (horaInicio !== turno.horaInicio) cambios.horaInicio = horaInicio;
  if (finManual !== null && finManual !== horaFinCalculada) cambios.horaFin = finManual;
  if (esAdmin && totalManualNum !== null && Number.isFinite(totalManualNum) && totalManualNum !== totalCalculado) cambios.montoTotal = totalManualNum;
  if (esAdmin && senaManualNum !== null && Number.isFinite(senaManualNum) && senaManualNum !== senaCalculada) cambios.montoSena = senaManualNum;
  const hayCambios = Object.keys(cambios).length > 0;
  if (nota.trim()) cambios.nota = nota.trim();

  const bloqueado =
    guardando || !hayCambios || !!mismoInicio || !servicioValido || !fecha || !horaInicio || finInvalido || yaPaso;

  const guardar = async () => {
    setGuardando(true);
    await onGuardar(cambios);
    setGuardando(false);
  };

  const diferenciaTotal = totalFinal - turno.montoTotal;

  return (
    <div className="space-y-3 pt-2 border-t border-pink-100">
      <label className="text-xs font-bold text-rf-black block">Editar reserva</label>
      <p className="text-[11px] text-rf-charcoal bg-rf-cream border border-pink-100 rounded-xl p-2">
        Podés cambiar el servicio (cambia lo que se factura), el día y la hora. Cada cambio queda anotado en el turno con quién lo hizo
        y cuándo{esAdmin ? '' : ', y Yosy recibe un aviso'}.
      </p>
      {turno.estado === 'completado' && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2 font-semibold">
          ⚠️ Este turno ya está completado: cambiar el servicio, el precio o el día modifica las comisiones de esa semana.
        </p>
      )}

      {esAdmin && (
        <div>
          <label className="font-bold text-rf-black block mb-1 text-xs">Profesional</label>
          <select value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)} className={campo}>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="font-bold text-rf-black block mb-1 text-xs">Servicio</label>
        <select value={servicioId} onChange={(e) => setServicioId(e.target.value)} className={campo}>
          {serviciosDisponibles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} — {formatCurrency(s.precio)}
            </option>
          ))}
        </select>
        {!servicioValido && (
          <p className="text-[11px] text-red-700 mt-1 font-semibold">
            {profesionalSel?.nombre ?? 'Esa profesional'} no realiza ese servicio: elegí otro.
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="font-bold text-rf-black block mb-1 text-xs">Día</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
        </div>
        <div>
          <label className="font-bold text-rf-black block mb-1 text-xs">Hora</label>
          <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={campo} />
        </div>
        <div>
          <label className="font-bold text-rf-black block mb-1 text-xs">Termina</label>
          <input type="time" value={horaFin} onChange={(e) => setFinManual(e.target.value)} className={campo} />
        </div>
      </div>

      <div className="rounded-xl bg-rf-cream border border-pink-100 p-2.5 text-[11px] text-rf-charcoal space-y-1">
        <p className="font-bold text-rf-black">Agenda de {profesionalSel?.nombre} ese día (sin este turno)</p>
        {delDia.length === 0 ? (
          <p>Libre todo el día.</p>
        ) : (
          delDia.map((t) => (
            <p key={t.id}>
              {t.horaInicio}–{t.horaFin} · {getClientaNombre(t.clientaId)}
            </p>
          ))
        )}
      </div>

      <AvisoHorario profesional={profesionalSel} fecha={fecha} hora={horaInicio} />

      {mismoInicio && (
        <p className="rounded-xl bg-red-50 border border-red-200 text-red-800 p-2.5 text-[11px] font-semibold">
          ⛔ A las {mismoInicio.horaInicio} ya hay un turno de {getClientaNombre(mismoInicio.clientaId)}. No se pueden tener dos turnos
          que empiecen a la misma hora: elegí otra hora.
        </p>
      )}
      {!mismoInicio && solapados.length > 0 && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-2.5 text-[11px] font-semibold">
          ⚠️ Se pisa con: {solapados.map((t) => `${getClientaNombre(t.clientaId)} (${t.horaInicio}–${t.horaFin})`).join(', ')}. Se puede
          guardar igual.
        </p>
      )}
      {bloqueada && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-2.5 text-[11px] font-semibold">
          ⚠️ {profesionalSel?.nombre} tiene ese horario bloqueado. Se puede guardar igual.
        </p>
      )}
      {yaPaso && (
        <p className="rounded-xl bg-red-50 border border-red-200 text-red-800 p-2.5 text-[11px] font-semibold">
          ⛔ No se puede mover un turno a un horario que ya pasó.
        </p>
      )}
      {finInvalido && horaInicio && (
        <p className="rounded-xl bg-red-50 border border-red-200 text-red-800 p-2.5 text-[11px] font-semibold">
          ⛔ La hora de fin tiene que ser posterior a la de inicio.
        </p>
      )}

      {esAdmin && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-bold text-rf-black block mb-1 text-xs">Corregir total (opcional)</label>
            <input
              type="number"
              min={0}
              value={totalManual}
              onChange={(e) => setTotalManual(e.target.value)}
              placeholder={String(totalCalculado)}
              className={campo}
            />
          </div>
          <div>
            <label className="font-bold text-rf-black block mb-1 text-xs">Corregir seña (opcional)</label>
            <input
              type="number"
              min={0}
              value={senaManual}
              onChange={(e) => setSenaManual(e.target.value)}
              placeholder={String(senaCalculada)}
              className={campo}
            />
          </div>
        </div>
      )}

      <div>
        <label className="font-bold text-rf-black block mb-1 text-xs">Motivo del cambio (opcional)</label>
        <input
          type="text"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={300}
          placeholder="Ej: la clienta pidió sumar cejas / cambió de día"
          className={campo}
        />
      </div>

      {hayCambios && (
        <div className="rounded-xl border border-pink-200 bg-white p-2.5 text-[11px] space-y-0.5">
          <p className="font-bold text-rf-black">Así queda:</p>
          {cambiaServicio && servicioNuevo && (
            <p>
              Servicio: {servicios.find((s) => s.id === turno.servicioId)?.nombre ?? '—'} → <strong>{servicioNuevo.nombre}</strong>
            </p>
          )}
          {esAdmin && cambiaProfesional && (
            <p>
              Profesional: {profesionales.find((p) => p.id === turno.profesionalId)?.nombre} → <strong>{profesionalSel?.nombre}</strong>
            </p>
          )}
          {cambiaHorario && (
            <p>
              {turno.fecha} {turno.horaInicio} → <strong>{fecha} {horaInicio}</strong>
            </p>
          )}
          {totalFinal !== turno.montoTotal && (
            <p>
              Total: {formatCurrency(turno.montoTotal)} → <strong>{formatCurrency(totalFinal)}</strong> (
              {diferenciaTotal > 0 ? '+' : ''}
              {formatCurrency(diferenciaTotal)}) — se factura cuando se marca "Vino"
            </p>
          )}
          {senaFinal !== turno.montoSena && (
            <p>
              Seña: {formatCurrency(turno.montoSena)} → <strong>{formatCurrency(senaFinal)}</strong>
            </p>
          )}
          {cambiaHorario && <p className="text-gray-500">Los recordatorios ya enviados se reinician para la nueva fecha.</p>}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancelar} disabled={guardando}>
          Volver
        </Button>
        <Button variant="primary" size="sm" onClick={guardar} disabled={bloqueado}>
          <Save className="w-3.5 h-3.5" />
          <span>{guardando ? 'Guardando…' : 'Guardar cambios'}</span>
        </Button>
      </div>
    </div>
  );
};
