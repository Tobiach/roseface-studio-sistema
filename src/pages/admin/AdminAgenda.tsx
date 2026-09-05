// src/pages/admin/AdminAgenda.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Turno, EstadoTurno, Clienta, Servicio, Profesional } from '../../types';
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
  Landmark,
  FileImage,
  Ban,
  Trash2,
  Repeat,
  Link as LinkIcon,
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
  const {
    turnos,
    clientas,
    profesionales,
    servicios,
    bloqueos,
    recordatoriosConfig,
    rolActivo,
    profesionalActivoId,
    actualizarEstadoTurno,
    aprobarComprobante,
    crearBloqueo,
    eliminarBloqueo,
    toggleRecordatorio,
    showToast,
  } = useApp();
  const esProfesional = rolActivo === 'profesional';

  // Comprobantes de transferencia esperando aprobación — solo la propia
  // profesional de alquiler fijo los ve, nunca Yosy (Fase 5).
  const profesionalActivo = profesionales.find((p) => p.id === profesionalActivoId);
  const esAlquilerFijo = profesionalActivo?.modeloComision.tipo === 'alquiler_fijo';
  const comprobantesPendientes =
    esProfesional && esAlquilerFijo
      ? turnos.filter(
          (t) =>
            t.profesionalId === profesionalActivoId &&
            t.circuitoPago === 'transferencia' &&
            !!t.comprobanteTransferenciaUrl &&
            !t.aprobadoPorProfesional
        )
      : [];

  // Notificación de pago para Yosy (Fase 6.1) — últimos turnos confirmados.
  // En el circuito de transferencia no se le muestra monto ni comprobante:
  // ese pago es entre la clienta y la profesional, Yosy solo sabe que el
  // turno quedó confirmado.
  const pagosRecientes = !esProfesional
    ? turnos
        .filter((t) => t.estado === 'sena_confirmada')
        .sort((a, b) => (a.fechaCreacion < b.fechaCreacion ? 1 : -1))
        .slice(0, 5)
    : [];

  // Aviso de recurrencia (Fase 8): clientas cuyo último turno completado de
  // un servicio con ciclo conocido (ej. retoque de pestañas ~21 días) ya
  // superó ese ciclo. Yosy decide si le manda el link de auto-agendado de
  // la profesional habitual. Mientras cicloRecurrenciaDias no esté cargado
  // (pendiente del formulario de Yosy) esta lista queda vacía a propósito.
  const avisosRecurrencia = !esProfesional
    ? (() => {
        const hoy = new Date();
        const ultimoPorClientaYServicio = new Map<string, Turno>();
        for (const t of turnos) {
          if (t.estado !== 'completado') continue;
          const key = `${t.clientaId}|${t.servicioId}`;
          const actual = ultimoPorClientaYServicio.get(key);
          if (!actual || t.fecha > actual.fecha) ultimoPorClientaYServicio.set(key, t);
        }

        const resultados: { clienta: Clienta; servicio: Servicio; profesional?: Profesional; diasSinVisitar: number }[] = [];
        for (const [, turno] of ultimoPorClientaYServicio) {
          const servicio = servicios.find((s) => s.id === turno.servicioId);
          if (!servicio?.cicloRecurrenciaDias) continue;
          const diasSinVisitar = Math.floor(
            (hoy.getTime() - new Date(`${turno.fecha}T12:00:00`).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diasSinVisitar < servicio.cicloRecurrenciaDias) continue;
          const clienta = clientas.find((c) => c.id === turno.clientaId);
          if (!clienta) continue;
          resultados.push({
            clienta,
            servicio,
            profesional: profesionales.find((p) => p.id === turno.profesionalId),
            diasSinVisitar,
          });
        }
        return resultados.sort((a, b) => b.diasSinVisitar - a.diasSinVisitar).slice(0, 8);
      })()
    : [];

  const [fechaFiltro, setFechaFiltro] = useState<string>('2026-08-17');
  const [profesionalFiltro, setProfesionalFiltro] = useState<string>('todos');
  const [turnoSeleccionadoModal, setTurnoSeleccionadoModal] = useState<Turno | null>(null);

  // Bloqueo manual de horario (Fase 6)
  const [modalBloqueoAbierto, setModalBloqueoAbierto] = useState(false);
  const [bloqueoProfesionalId, setBloqueoProfesionalId] = useState<string>('');
  const [bloqueoFecha, setBloqueoFecha] = useState<string>('2026-08-17');
  const [bloqueoDiaCompleto, setBloqueoDiaCompleto] = useState(true);
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState('09:00');
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState('19:00');
  const [bloqueoMotivo, setBloqueoMotivo] = useState('');

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

  // Una profesional solo puede bloquear su propia agenda — Yosy puede
  // elegir cualquiera (Fase 6).
  const profesionalesParaBloqueo = esProfesional
    ? profesionales.filter((p) => p.id === profesionalActivoId)
    : profesionales;

  const handleCrearBloqueo = async () => {
    if (!bloqueoProfesionalId || !bloqueoFecha) return;
    await crearBloqueo({
      profesionalId: bloqueoProfesionalId,
      fecha: bloqueoFecha,
      diaCompleto: bloqueoDiaCompleto,
      horaInicio: bloqueoDiaCompleto ? null : bloqueoHoraInicio,
      horaFin: bloqueoDiaCompleto ? null : bloqueoHoraFin,
      motivo: bloqueoMotivo || null,
      creadoPor: esProfesional ? profesionalActivoId : 'yosy',
    });
    setModalBloqueoAbierto(false);
    setBloqueoMotivo('');
  };

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

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBloqueoProfesionalId(esProfesional ? profesionalActivoId ?? '' : profesionales[0]?.id ?? '');
              setBloqueoFecha(fechaFiltro);
              setModalBloqueoAbierto(true);
            }}
          >
            <Ban className="w-3.5 h-3.5 text-rf-rose-deep" />
            <span>Bloquear horario</span>
          </Button>
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
              bloqueos={bloqueos}
              onSeleccionarTurno={setTurnoSeleccionadoModal}
              getClientaNombre={getClientaNombre}
            />
          </div>

          {/* Bloqueos activos del día — con opción de sacarlos */}
          {bloqueos.filter((b) => b.fecha === fechaFiltro && (profesionalFiltroEfectivo === 'todos' || b.profesionalId === profesionalFiltroEfectivo)).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rf-charcoal">Bloqueos de hoy</h3>
              <div className="space-y-2">
                {bloqueos
                  .filter((b) => b.fecha === fechaFiltro && (profesionalFiltroEfectivo === 'todos' || b.profesionalId === profesionalFiltroEfectivo))
                  .map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    >
                      <span className="text-rf-charcoal">
                        <strong className="text-rf-black">{getProfesional(b.profesionalId)?.nombre}</strong>
                        {' — '}
                        {b.diaCompleto ? 'Todo el día' : `${b.horaInicio} a ${b.horaFin} hs`}
                        {b.motivo ? ` · ${b.motivo}` : ''}
                      </span>
                      <button
                        onClick={() => eliminarBloqueo(b.id)}
                        className="text-gray-400 hover:text-rf-danger cursor-pointer p-1"
                        aria-label="Quitar bloqueo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

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
          {/* Comprobantes de transferencia a aprobar — solo la propia profesional */}
          {comprobantesPendientes.length > 0 && (
            <Card className="bg-gradient-to-b from-sky-50/60 via-white to-white space-y-4 border border-sky-200">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
                <Landmark className="w-4 h-4" />
                <span>Comprobantes a Revisar ({comprobantesPendientes.length})</span>
              </div>

              <div className="space-y-3">
                {comprobantesPendientes.map((turno) => (
                  <div key={turno.id} className="bg-white rounded-xl border border-sky-200 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rf-black">{getClientaNombre(turno.clientaId)}</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(turno.montoSena)}</span>
                    </div>
                    <p className="text-[11px] text-rf-charcoal">
                      {getServicioNombre(turno.servicioId)} • {formatDateReadable(turno.fecha)} {turno.horaInicio} hs
                    </p>
                    <a
                      href={turno.comprobanteTransferenciaUrl ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-sky-700 font-semibold hover:underline"
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      <span>Ver comprobante</span>
                    </a>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => aprobarComprobante(turno.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprobar y confirmar turno</span>
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pagos recientes — feed de notificación de pago para Yosy */}
          {pagosRecientes.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-center gap-2 text-rf-black font-bold text-sm">
                <Bell className="w-4 h-4 text-rf-rose-deep" />
                <span>Pagos Recientes</span>
              </div>
              <div className="space-y-2">
                {pagosRecientes.map((turno) => (
                  <div key={turno.id} className="flex items-center justify-between text-xs border-b border-pink-50 pb-2 last:border-0 last:pb-0">
                    <div>
                      <span className="font-semibold text-rf-black block">{getClientaNombre(turno.clientaId)}</span>
                      <span className="text-[11px] text-rf-charcoal">
                        {getProfesional(turno.profesionalId)?.nombre} • {formatDateReadable(turno.fecha)}
                      </span>
                    </div>
                    {turno.circuitoPago === 'transferencia' ? (
                      <Badge variant="success" size="sm">Turno confirmado</Badge>
                    ) : (
                      <span className="font-bold text-emerald-700">{formatCurrency(turno.montoSena)}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Aviso de recurrencia (Fase 8) */}
          {avisosRecurrencia.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-center gap-2 text-rf-black font-bold text-sm">
                <Repeat className="w-4 h-4 text-rf-rose-deep" />
                <span>Avisos de Recurrencia ({avisosRecurrencia.length})</span>
              </div>
              <div className="space-y-3">
                {avisosRecurrencia.map(({ clienta, servicio, profesional, diasSinVisitar }) => (
                  <div key={`${clienta.id}-${servicio.id}`} className="bg-rf-cream rounded-xl border border-pink-100 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rf-black">{clienta.nombre}</span>
                      <Badge variant="warning" size="sm">{diasSinVisitar} días</Badge>
                    </div>
                    <p className="text-[11px] text-rf-charcoal">
                      {servicio.nombre} con {profesional?.nombre ?? 'su profesional habitual'}
                    </p>
                    {profesional?.linkAutoagenda ? (
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(profesional.linkAutoagenda!);
                          showToast('🔗 Link de auto-agendado copiado');
                        }}
                        className="flex items-center gap-1.5 text-sky-700 font-semibold hover:underline cursor-pointer"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>Copiar link de auto-agendado</span>
                      </button>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">
                        Falta el link de auto-agendado de {profesional?.nombre ?? 'esta profesional'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Yosy Recordatorios (Fase 7): la activación es por turno, desde
              el modal de cada uno — este card es solo la explicación. */}
          {!esProfesional && (
            <Card className="bg-gradient-to-b from-amber-50/60 via-white to-white space-y-2 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-rf-gold-bright" />
                <span>Yosy Recordatorios</span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                Tocá un turno para activar sus recordatorios (48h / 24h / 4h antes). Se activan uno
                por uno, por turno — todavía no manda WhatsApp real, queda registrado como
                "✓ Activado" para cuando se conecte el envío.
              </p>
            </Card>
          )}

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

            {/* Yosy Recordatorios por turno (Fase 7) — solo Yosy los activa */}
            {!esProfesional && (
              <div className="space-y-2 pt-2 border-t border-pink-100">
                <label className="text-xs font-bold text-rf-black block">Recordatorios de este turno:</label>
                <div className="grid grid-cols-3 gap-2">
                  {VENTANAS_RECORDATORIO.map((v) => {
                    const config = recordatoriosConfig.find(
                      (r) => r.turnoId === turnoSeleccionadoModal.id && r.plantilla === v.value
                    );
                    const activado = config?.activado ?? false;
                    return (
                      <button
                        key={v.value}
                        onClick={() => toggleRecordatorio(turnoSeleccionadoModal.id, v.value, !activado)}
                        className={`px-2 py-2 rounded-xl text-[11px] font-bold border cursor-pointer transition-all ${
                          activado
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-white border-pink-200 text-rf-charcoal hover:border-rf-rose-deep'
                        }`}
                      >
                        {activado ? '✓ ' : ''}
                        {v.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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

      {/* MODAL BLOQUEAR HORARIO */}
      {modalBloqueoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-pink-100 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-pink-100">
              <h3 className="font-display font-bold text-lg text-rf-black">Bloquear Horario</h3>
              <button
                onClick={() => setModalBloqueoAbierto(false)}
                className="text-gray-400 hover:text-rf-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-rf-black block mb-1">Profesional</label>
                {esProfesional ? (
                  <span className="block px-3 py-2 rounded-xl border border-pink-200 bg-rf-cream text-rf-charcoal font-semibold">
                    {profesionalesParaBloqueo[0]?.nombre}
                  </span>
                ) : (
                  <select
                    value={bloqueoProfesionalId}
                    onChange={(e) => setBloqueoProfesionalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                  >
                    {profesionalesParaBloqueo.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-bold text-rf-black block mb-1">Fecha</label>
                <input
                  type="date"
                  value={bloqueoFecha}
                  onChange={(e) => setBloqueoFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                />
              </div>

              <label className="flex items-center gap-2 font-semibold text-rf-black">
                <input
                  type="checkbox"
                  checked={bloqueoDiaCompleto}
                  onChange={(e) => setBloqueoDiaCompleto(e.target.checked)}
                />
                Bloquear el día completo
              </label>

              {!bloqueoDiaCompleto && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-rf-black block mb-1">Desde</label>
                    <input
                      type="time"
                      value={bloqueoHoraInicio}
                      onChange={(e) => setBloqueoHoraInicio(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-rf-black block mb-1">Hasta</label>
                    <input
                      type="time"
                      value={bloqueoHoraFin}
                      onChange={(e) => setBloqueoHoraFin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-rf-black block mb-1">Motivo (opcional)</label>
                <input
                  type="text"
                  value={bloqueoMotivo}
                  onChange={(e) => setBloqueoMotivo(e.target.value)}
                  placeholder="Ej: día libre, feriado, capacitación"
                  className="w-full px-3 py-2 rounded-xl border border-pink-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setModalBloqueoAbierto(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleCrearBloqueo}>
                <Ban className="w-3.5 h-3.5" />
                <span>Bloquear</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
