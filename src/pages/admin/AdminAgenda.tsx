// src/pages/admin/AdminAgenda.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Turno, EstadoTurno } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusPill } from '../../components/ui/StatusPill';
import { RitualTimeline } from '../../components/ui/RitualTimeline';
import { CalendarioGrilla } from '../../components/admin/CalendarioGrilla';
import { formatCurrency, formatDateReadable } from '../../lib/formatters';
import {
  CalendarDays,
  Clock,
  User,
  Filter,
  Sparkles,
  CheckCircle2,
  XCircle,
  Bell,
  RefreshCw,
  Search,
  MessageSquare,
  CalendarCheck,
} from 'lucide-react';

// TODO: Fase de integración OAuth — punto de entrada para conectar la API real de
// Google Calendar (sync bidireccional de turnos). Hoy es solo un indicador visual.
// function sincronizarConGoogleCalendar(turno: Turno) { ... }

const VENTANAS_RECORDATORIO = [
  { value: '48h', label: '48 horas antes' },
  { value: '24h', label: '24 horas antes' },
  { value: '4h', label: '4 horas antes' },
] as const;

export const AdminAgenda: React.FC = () => {
  const { turnos, clientas, profesionales, servicios, rolActivo, profesionalActivoId, actualizarEstadoTurno, showToast } = useApp();
  const esProfesional = rolActivo === 'profesional';

  const [fechaFiltro, setFechaFiltro] = useState<string>('2026-08-12');
  const [profesionalFiltro, setProfesionalFiltro] = useState<string>('todos');
  const [turnoSeleccionadoModal, setTurnoSeleccionadoModal] = useState<Turno | null>(null);
  const [ventanaRecordatorio, setVentanaRecordatorio] = useState<string>('48h');

  // Un profesional solo ve su propia agenda — el filtro queda fijo en su id
  const profesionalFiltroEfectivo = esProfesional ? profesionalActivoId ?? 'todos' : profesionalFiltro;

  // Filter turnos by date and professional
  const turnosFiltrados = turnos.filter((t) => {
    const coincideFecha = t.fecha === fechaFiltro;
    const coincideProf =
      profesionalFiltroEfectivo === 'todos' ? true : t.profesionalId === profesionalFiltroEfectivo;
    return coincideFecha && coincideProf;
  });

  const getClientaNombre = (id: string) => {
    const c = clientas.find((cli) => cli.id === id);
    return c ? c.nombre : 'Clienta General';
  };

  const getServicioNombre = (id: string) => {
    const s = servicios.find((serv) => serv.id === id);
    return s ? s.nombre : 'Servicio';
  };

  const getProfesional = (id: string) => {
    return profesionales.find((p) => p.id === id);
  };

  // Profesionales a mostrar en la grilla del calendario: todas, o solo la
  // seleccionada/filtrada (o la propia, en el rol Profesional).
  const profesionalesParaGrilla =
    profesionalFiltroEfectivo === 'todos'
      ? profesionales
      : profesionales.filter((p) => p.id === profesionalFiltroEfectivo);

  return (
    <div className="space-y-8 font-admin">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="gold">Gestión Diaria</Badge>
            <span className="text-xs text-rf-charcoal font-medium">Control.Evo Engine</span>
            <Badge variant="success" icon={<CalendarCheck className="w-3 h-3" />}>
              Sincronizado con Google Calendar
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-rf-black mt-1">
            {esProfesional ? 'Mi Agenda' : 'Agenda del Studio'}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-rf-rose-deep shadow-2xs"
          />

          {esProfesional ? (
            <span className="px-3.5 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white text-rf-rose-deep">
              {profesionales.find((p) => p.id === profesionalActivoId)?.nombre ?? 'Mi agenda'}
            </span>
          ) : (
            <select
              value={profesionalFiltro}
              onChange={(e) => setProfesionalFiltro(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-rf-rose-deep shadow-2xs"
            >
              <option value="todos">Todas las Profesionales</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Agenda Timeline (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rf-charcoal">
              Disponibilidad — {formatDateReadable(fechaFiltro)}
            </h2>
            <CalendarioGrilla
              profesionales={profesionalesParaGrilla}
              fecha={fechaFiltro}
              turnos={turnos}
              onSeleccionarTurno={setTurnoSeleccionadoModal}
              getClientaNombre={getClientaNombre}
            />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rf-charcoal">
              Detalle de turnos ({turnosFiltrados.length})
            </h2>
          </div>

          {turnosFiltrados.length === 0 ? (
            <Card className="text-center py-12 space-y-3">
              <CalendarDays className="w-10 h-10 text-pink-300 mx-auto" />
              <p className="text-sm font-semibold text-rf-black">No hay turnos agendados para este día</p>
              <p className="text-xs text-rf-charcoal">Elegí otra fecha o quitá el filtro de profesional.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {turnosFiltrados.map((turno) => {
                const prof = getProfesional(turno.profesionalId);
                const isCancelled = turno.estado.startsWith('cancelado');

                return (
                  <Card
                    key={turno.id}
                    hoverable
                    onClick={() => setTurnoSeleccionadoModal(turno)}
                    className={`space-y-3 border-l-4 ${
                      turno.estado === 'completado'
                        ? 'border-l-emerald-500'
                        : turno.estado === 'sena_confirmada' || turno.estado === 'recordatorio_enviado'
                        ? 'border-l-rf-gold-bright'
                        : isCancelled
                        ? 'border-l-rf-danger'
                        : 'border-l-amber-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100 text-center shrink-0">
                          <span className="font-bold text-rf-rose-deep text-sm block">
                            {turno.horaInicio}
                          </span>
                          <span className="text-[10px] text-rf-charcoal block">hs</span>
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-rf-black">
                            {getClientaNombre(turno.clientaId)}
                          </h3>
                          <p className="text-xs text-rf-charcoal">
                            {getServicioNombre(turno.servicioId)} •{' '}
                            <span className="font-semibold text-rf-rose-deep">{prof?.nombre}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusPill estado={turno.estado} />
                      </div>
                    </div>

                    {/* Compact Ritual Timeline Signature Element */}
                    <div className="pt-2 border-t border-pink-100/60 flex items-center justify-between text-xs">
                      <RitualTimeline estado={turno.estado} compact />

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-gray-400 block font-medium">Seña / Total</span>
                        <span className="font-bold text-rf-black">
                          {formatCurrency(turno.montoSena)} / {formatCurrency(turno.montoTotal)}
                        </span>
                      </div>
                    </div>

                    {turno.notasInternas && (
                      <p className="text-[11px] bg-rf-cream p-2 rounded-lg text-rf-charcoal italic border border-pink-100">
                        💬 {turno.notasInternas}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Widgets (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Automated Reminders Widget */}
          <Card className="bg-gradient-to-b from-amber-50/60 via-white to-white space-y-4 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-rf-gold-bright" />
              <span>Automatización Yosy Engine</span>
            </div>

            <p className="text-[11px] text-amber-900/90 italic">
              Tu sistema te dice a quién tenés que recordar y cuándo.
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-rf-black block">
                Enviar recordatorio a la clienta:
              </label>
              <select
                value={ventanaRecordatorio}
                onChange={(e) => setVentanaRecordatorio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-200/80 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-rf-rose-deep"
              >
                {VENTANAS_RECORDATORIO.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
              <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-1">
                <p className="font-semibold text-rf-rose-deep">
                  Próximo envío: turnos de {VENTANAS_RECORDATORIO.find((v) => v.value === ventanaRecordatorio)?.label.toLowerCase()} (WhatsApp)
                </p>
                <p className="text-[11px] text-rf-charcoal">
                  Se envía automáticamente un link de reconfirmación en la ventana elegida.
                  {/* TODO: envío real pendiente de integración de WhatsApp — hoy es simulado */}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              fullWidth
              size="sm"
              onClick={() => showToast('📲 Recordatorios de reconfirmación enviados por WhatsApp')}
            >
              <Bell className="w-3.5 h-3.5 text-rf-gold" />
              <span>Ejecutar envío manual ahora</span>
            </Button>
          </Card>

          {/* Quick Stats Widget */}
          <Card className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rf-charcoal">
              Resumen del Día ({fechaFiltro})
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-pink-100">
                <span className="text-rf-charcoal">Total Turnos:</span>
                <span className="font-bold text-rf-black">{turnosFiltrados.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-pink-100">
                <span className="text-rf-charcoal">Señas Cobradas Hoy:</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(
                    turnosFiltrados.reduce((sum, t) => sum + t.montoSena, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-rf-charcoal">Facturación Esperada:</span>
                <span className="font-bold text-rf-black">
                  {formatCurrency(
                    turnosFiltrados.reduce((sum, t) => sum + t.montoTotal, 0)
                  )}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL EDITAR ESTADO TURNO */}
      {turnoSeleccionadoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-pink-100 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rf-rose-deep">
                  Gestión de Turno
                </span>
                <h3 className="font-display font-bold text-lg text-rf-black">
                  {getClientaNombre(turnoSeleccionadoModal.clientaId)}
                </h3>
              </div>
              <button
                onClick={() => setTurnoSeleccionadoModal(null)}
                className="text-gray-400 hover:text-rf-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p>
                <strong>Servicio:</strong> {getServicioNombre(turnoSeleccionadoModal.servicioId)}
              </p>
              <p>
                <strong>Profesional:</strong>{' '}
                {getProfesional(turnoSeleccionadoModal.profesionalId)?.nombre}
              </p>
              <p>
                <strong>Fecha y Hora:</strong> {turnoSeleccionadoModal.fecha} a las{' '}
                {turnoSeleccionadoModal.horaInicio} hs
              </p>
              <p>
                <strong>Estado Actual:</strong> <StatusPill estado={turnoSeleccionadoModal.estado} />
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-pink-100">
              <label className="text-xs font-bold text-rf-black block">
                Cambiar Estado del Turno:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    actualizarEstadoTurno(turnoSeleccionadoModal.id, 'completado');
                    setTurnoSeleccionadoModal(null);
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Marcar Completado</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    actualizarEstadoTurno(turnoSeleccionadoModal.id, 'recordatorio_enviado');
                    setTurnoSeleccionadoModal(null);
                  }}
                >
                  <Bell className="w-3.5 h-3.5 text-rf-gold" />
                  <span>Recordatorio Enviado</span>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  className="col-span-2"
                  onClick={() => {
                    actualizarEstadoTurno(turnoSeleccionadoModal.id, 'cancelado');
                    setTurnoSeleccionadoModal(null);
                  }}
                >
                  <span>Cancelar turno (seña no reembolsable)</span>
                </Button>
              </div>
            </div>

            <div className="pt-2 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTurnoSeleccionadoModal(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
