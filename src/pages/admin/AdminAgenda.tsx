// src/pages/admin/AdminAgenda.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, supabaseEnabled } from '../../lib/supabase';
import { Turno, EstadoTurno, PlantillaRecordatorio } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusPill } from '../../components/ui/StatusPill';
import { RitualTimeline } from '../../components/ui/RitualTimeline';
import { CalendarioGrilla } from '../../components/admin/CalendarioGrilla';
import { PanelServiciosRealizados } from '../../components/admin/PanelServiciosRealizados';
import { formatCurrency, formatDateReadable, formatDateShort } from '../../lib/formatters';
import { buildWhatsAppUrlPara } from '../../lib/whatsapp';
import { ventanasDelTurno, estadoSena, estadoRecordatorios, mensajeParaTurno, type VentanaRecordatorio } from '../../lib/recordatorios';
import { SenaBadge } from '../../components/ui/SenaBadge';
import { hoyISO, sumarDiasISO, calcularHorariosDisponibles, sumarMinutos } from '../../lib/disponibilidad';
import { calcularMontoSena } from '../../lib/pricing';
import { esMarcadaAMano, armarNota } from '../../lib/recurrencia';
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
  Landmark,
  FileImage,
  Ban,
  Trash2,
  X,
  Link2,
  Plus,
  Repeat,
} from 'lucide-react';

// TODO: Fase de integración OAuth — punto de entrada para conectar la API real de
// Google Calendar (sync bidireccional de turnos). Hoy es solo un indicador visual.
// function sincronizarConGoogleCalendar(turno: Turno) { ... }

// Presets de rango a futuro para el filtro de la agenda. "dias: N" = ventana
// de N días de calendario arrancando hoy (hoy incluido).
const PRESETS_RANGO = [
  { id: 'hoy', label: 'Hoy', dias: 1 },
  { id: 'd2', label: 'Próx. 2 días', dias: 2 },
  { id: 'd3', label: 'Próx. 3 días', dias: 3 },
  { id: 'd4', label: 'Próx. 4 días', dias: 4 },
  { id: 'd7', label: 'Próx. 7 días', dias: 7 },
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
    guardarServiciosTurno,
    marcarSenaManual,
    sesionConToken,
    abrirPinModal,
    reprogramarTurno,
    aprobarComprobante,
    crearBloqueo,
    eliminarBloqueo,
    crearTurno,
    buscarOCrearClienta,
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

  // El aviso de recurrencia se mudó a su propia página del panel —
  // ver src/pages/admin/AdminClientasRecurrentes.tsx (25/9/2026).

  // Filtro de fecha: un rango [desde, hasta]. Un solo día = desde === hasta
  // (mantiene la grilla de disponibilidad). Presets a futuro + rango libre.
  const [desde, setDesde] = useState<string>(hoyISO());
  const [hasta, setHasta] = useState<string>(hoyISO());
  const [presetActivo, setPresetActivo] = useState<string>('hoy');
  const esRango = desde !== hasta;
  // Retrocompat: varias partes de abajo usaban "fechaFiltro" como el día foco.
  const fechaFiltro = desde;

  const aplicarPreset = (preset: (typeof PRESETS_RANGO)[number]) => {
    const hoy = hoyISO();
    setDesde(hoy);
    setHasta(sumarDiasISO(hoy, preset.dias - 1));
    setPresetActivo(preset.id);
  };

  const [profesionalFiltro, setProfesionalFiltro] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [turnoSeleccionadoModal, setTurnoSeleccionadoModal] = useState<Turno | null>(null);
  // Panel de 'qué servicios se hizo' dentro del modal de turno (confirmar que
  // vino / editar el desglose de un turno ya completado).
  const [panelServicios, setPanelServicios] = useState<{ turnoId: string; modo: 'confirmar' | 'editar' } | null>(null);

  // Reprogramar turno (desde el modal)
  const [reprogramando, setReprogramando] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState<string>('');
  const [nuevaHora, setNuevaHora] = useState<string>('');

  // Bloqueo manual de horario (Fase 6)
  const [modalBloqueoAbierto, setModalBloqueoAbierto] = useState(false);
  const [bloqueoProfesionalId, setBloqueoProfesionalId] = useState<string>('');
  const [bloqueoFecha, setBloqueoFecha] = useState<string>(hoyISO());
  const [bloqueoDiaCompleto, setBloqueoDiaCompleto] = useState(true);
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState('09:00');
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState('19:00');
  const [bloqueoMotivo, setBloqueoMotivo] = useState('');

  // Turno manual (13/10/2026, pedido de Tobias/Yosy): cargar un turno a
  // mano sin pasar por el asistente público — para una clienta que llama
  // por teléfono, un walk-in que cambia de idea sobre el servicio, o que
  // suma un servicio extra en el mismo día. Usa las mismas funciones que
  // ya existen (crearTurno/buscarOCrearClienta), no hace falta un endpoint
  // nuevo — el INSERT directo con el anon key solo está permitido para turnos
  // en estado 'reservado' (ver handleCrearTurnoManual).
  const [modalTurnoManualAbierto, setModalTurnoManualAbierto] = useState(false);
  const [tmNombre, setTmNombre] = useState('');
  const [tmTelefono, setTmTelefono] = useState('');
  const [tmProfesionalId, setTmProfesionalId] = useState('');
  const [tmServicioId, setTmServicioId] = useState('');
  const [tmFecha, setTmFecha] = useState(hoyISO());
  const [tmHora, setTmHora] = useState('');
  const [tmEstado, setTmEstado] = useState<EstadoTurno>('reservado');
  const [tmMontoTotal, setTmMontoTotal] = useState<number | ''>('');
  const [tmMontoSena, setTmMontoSena] = useState<number | ''>('');
  const [tmGuardando, setTmGuardando] = useState(false);
  const [tmRecurrente, setTmRecurrente] = useState(false);
  const [tmSenaAbonada, setTmSenaAbonada] = useState(false);

  const tmServicio = servicios.find((s) => s.id === tmServicioId);
  const tmServiciosDeLaProfesional = tmProfesionalId
    ? servicios.filter((s) => s.profesionalesQueLoRealizan.includes(tmProfesionalId))
    : servicios;

  const abrirTurnoManual = () => {
    setTmNombre('');
    setTmTelefono('');
    setTmProfesionalId(esProfesional ? profesionalActivoId ?? '' : '');
    setTmServicioId('');
    setTmFecha(fechaFiltro);
    setTmHora('');
    setTmEstado('reservado');
    setTmMontoTotal('');
    setTmMontoSena('');
    setTmRecurrente(false);
    setTmSenaAbonada(false);
    setModalTurnoManualAbierto(true);
  };

  const elegirServicioManual = (servicioId: string) => {
    setTmServicioId(servicioId);
    const serv = servicios.find((s) => s.id === servicioId);
    if (serv) {
      setTmMontoTotal(serv.precio);
      setTmMontoSena(calcularMontoSena(serv));
    }
  };

  const handleCrearTurnoManual = async () => {
    if (!tmNombre.trim() || !tmProfesionalId || !tmServicioId || !tmFecha || !tmHora || !tmServicio) return;
    const registrarSena = tmSenaAbonada && tmEstado !== 'completado';
    // Registrar la seña como pagada exige PIN reciente: se pide ANTES de crear
    // el turno, así no queda un turno creado sin la seña que se quiso cargar.
    if (registrarSena && !sesionConToken) {
      showToast('🔑 Para registrar la seña como pagada, ingresá tu PIN.');
      abrirPinModal(esProfesional ? 'profesional' : 'admin');
      return;
    }
    setTmGuardando(true);
    try {
      const clientaId = await buscarOCrearClienta(tmNombre.trim(), tmTelefono.trim());
      const horaFin = sumarMinutos(tmHora, tmServicio.duracionMinutos);
      // La base solo deja insertar desde el navegador turnos en estado
      // 'reservado' (RLS de turnos, 15/10/2026: si no, cualquiera podría
      // crearse un turno ya pagado). Por eso se crea siempre 'reservado' y,
      // si se pidió 'completado', se pasa después por el endpoint del servidor.
      const nuevo = await crearTurno({
        clientaId,
        profesionalId: tmProfesionalId,
        servicioId: tmServicioId,
        fecha: tmFecha,
        horaInicio: tmHora,
        horaFin,
        estado: 'reservado',
        montoTotal: Number(tmMontoTotal) || tmServicio.precio,
        montoSena: Number(tmMontoSena) || 0,
        senaVerificadaAutomaticamente: false,
        origenReserva: 'manual',
        idTransaccionMP: null,
        notasInternas: 'Turno cargado a mano desde el panel (no vino del sitio público).',
      });
      if (tmEstado === 'completado') await actualizarEstadoTurno(nuevo.id, 'completado');
      if (registrarSena) await marcarSenaManual(nuevo.id, true);
      if (tmRecurrente) await marcarClienteRecurrente(nuevo);
      setModalTurnoManualAbierto(false);
    } catch {
      // crearTurno ya avisó con un toast; el modal queda abierto para reintentar.
    } finally {
      setTmGuardando(false);
    }
  };

  // Marcar clienta recurrente a mano (13/10/2026, pedido de Yosy): hoy
  // "Clientas Recurrentes" solo detecta automático si el servicio tiene un
  // ciclo definido (cicloRecurrenciaDias). Esto escribe el mismo registro
  // que ya usa esa pantalla (`clientas_recurrentes_estado`) para que
  // aparezca igual aunque el servicio no tenga ciclo — AdminClientasRecurrentes.tsx
  // tiene que sumar esta lista "marcada a mano" aparte de la automática.
  const marcarClienteRecurrente = async (turno: Turno) => {
    if (!supabaseEnabled || !supabase) {
      showToast('❌ No disponible sin conexión a la base.');
      return;
    }
    // Si esa clienta+servicio ya tenía una nota propia (ej. desde la lista
    // automática), se conserva detrás de la marca en vez de pisarla.
    const { data: previo } = await supabase
      .from('clientas_recurrentes_estado')
      .select('nota')
      .eq('clienta_id', turno.clientaId)
      .eq('servicio_id', turno.servicioId)
      .maybeSingle();
    const { error } = await supabase.from('clientas_recurrentes_estado').upsert(
      {
        clienta_id: turno.clientaId,
        servicio_id: turno.servicioId,
        turno_id_ancla: turno.id,
        contactada: false,
        contactada_en: null,
        nota: esMarcadaAMano(previo?.nota) ? previo?.nota : armarNota(previo?.nota ?? '', true),
        silenciada: false,
      },
      { onConflict: 'clienta_id,servicio_id' }
    );
    if (error) {
      showToast('❌ No se pudo marcar como recurrente.');
      return;
    }
    showToast('🔁 Marcada como clienta recurrente — ya aparece en Clientas Recurrentes.');
  };

  // Un profesional solo ve su propia agenda — el filtro queda fijo en su id
  const profesionalFiltroEfectivo = esProfesional ? profesionalActivoId ?? 'todos' : profesionalFiltro;

  const q = busqueda.trim().toLowerCase();

  // Filter turnos by date range, professional y búsqueda por clienta, ordenados por fecha + hora
  const turnosFiltrados = turnos
    .filter((t) => {
      const coincideFecha = t.fecha >= desde && t.fecha <= hasta;
      const coincideProf =
        profesionalFiltroEfectivo === 'todos' ? true : t.profesionalId === profesionalFiltroEfectivo;
      if (!coincideFecha || !coincideProf) return false;
      if (!q) return true;
      const c = clientas.find((cli) => cli.id === t.clientaId);
      return (
        (c?.nombre ?? '').toLowerCase().includes(q) ||
        (c?.telefono ?? '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.fecha === b.fecha ? a.horaInicio.localeCompare(b.horaInicio) : a.fecha.localeCompare(b.fecha)));

  // Turnos agrupados por día (para la vista de rango)
  const turnosPorDia: Record<string, Turno[]> = {};
  for (const t of turnosFiltrados) {
    (turnosPorDia[t.fecha] ||= []).push(t);
  }

  const bloqueosDelRango = bloqueos.filter(
    (b) =>
      b.fecha >= desde &&
      b.fecha <= hasta &&
      (profesionalFiltroEfectivo === 'todos' || b.profesionalId === profesionalFiltroEfectivo)
  );

  // Cola de recordatorios: por cada turno futuro (de la profesional filtrada, sin
  // importar el rango de fechas elegido arriba — si no, con "Hoy" nunca se verían
  // los de 72h/48h), la ventana que ya entró en tiempo y todavía no se activó — solo la más urgente, para que
  // Yosy tenga una lista corta y accionable. Qué ventanas tiene cada turno
  // (web: 48/24/4h · manual con seña pendiente: 72/48/24h) lo define
  // ventanasDelTurno() en lib/recordatorios.ts.
  const recordatoriosPendientes: { turno: Turno; ventana: VentanaRecordatorio; horasFaltan: number }[] = [];
  if (!esProfesional) {
    const ahoraMs = Date.now();
    for (const t of turnos) {
      if (profesionalFiltroEfectivo !== 'todos' && t.profesionalId !== profesionalFiltroEfectivo) continue;
      const rec = estadoRecordatorios(t, recordatoriosConfig, ahoraMs);
      if (!rec?.pendiente) continue;
      recordatoriosPendientes.push({ turno: t, ventana: rec.pendiente, horasFaltan: rec.horasFaltan });
    }
    recordatoriosPendientes.sort((a, b) => a.horasFaltan - b.horasFaltan);
  }

  const enviarRecordatorio = (turno: Turno, plantilla: PlantillaRecordatorio) => {
    toggleRecordatorio(turno.id, plantilla, true);
    const clienta = clientas.find((c) => c.id === turno.clientaId);
    if (!clienta) {
      showToast('❌ No encontramos el teléfono de la clienta.');
      return;
    }
    const mensaje = mensajeParaTurno(turno, plantilla, clienta.nombre, getServicioNombre(turno.servicioId));
    window.open(buildWhatsAppUrlPara(clienta.telefono, mensaje), '_blank');
  };

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

  // Doble reserva (10/10/2026, pedido de Tobias): si la misma clienta tiene
  // otro turno activo (con cualquier profesional/servicio/fecha), tanto Yosy
  // como la propia profesional lo ven en la tarjeta — ej. reservó pestañas y
  // también uñas. Cálculo en memoria, no hace falta nada nuevo en la base.
  const otrosTurnosActivos = (turno: Turno) =>
    turnos.filter((t) => t.id !== turno.id && t.clientaId === turno.clientaId && t.estado !== 'cancelado');

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

  const renderTurnoCard = (turno: Turno) => {
    const prof = getProfesional(turno.profesionalId);
    const isCancelled = turno.estado.startsWith('cancelado');
    const otrosTurnos = otrosTurnosActivos(turno);
    return (
      <Card
        key={turno.id}
        hoverable
        onClick={() => setTurnoSeleccionadoModal(turno)}
        className={`space-y-3 border-l-4 ${
          turno.estado === 'completado'
            ? 'border-l-emerald-500'
            : estadoSena(turno) === 'pagada'
            ? 'border-l-rf-gold-bright'
            : isCancelled
            ? 'border-l-rf-danger'
            : 'border-l-amber-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100 text-center shrink-0">
              <span className="font-bold text-rf-rose-deep text-sm block">{turno.horaInicio}</span>
              <span className="text-[10px] text-rf-charcoal block">hs</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-rf-black">{getClientaNombre(turno.clientaId)}</h3>
              <p className="text-xs text-rf-charcoal">
                {getServicioNombre(turno.servicioId)} •{' '}
                <span className="font-semibold text-rf-rose-deep">{prof?.nombre}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SenaBadge turno={turno} />
            <StatusPill estado={turno.estado} senaAparte />
          </div>
        </div>

        <div className="pt-2 border-t border-pink-100/60 flex items-center justify-between text-xs">
          <RitualTimeline estado={turno.estado} compact />
          <div className="text-right shrink-0">
            <span className="text-[10px] text-gray-400 block font-medium">Seña / Total</span>
            <span className="font-bold text-rf-black">
              {formatCurrency(turno.montoSena)} / {formatCurrency(turno.montoTotal)}
            </span>
          </div>
        </div>

        {otrosTurnos.length > 0 && (
          <div className="text-[11px] bg-sky-50 p-2 rounded-lg text-sky-800 border border-sky-200 space-y-1">
            {otrosTurnos.map((o) => (
              <div key={o.id} className="flex items-start gap-1.5">
                <Link2 className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  También tiene <strong>{getServicioNombre(o.servicioId)}</strong> con{' '}
                  <strong>{getProfesional(o.profesionalId)?.nombre}</strong> el {formatDateShort(o.fecha)} a las{' '}
                  {o.horaInicio} hs
                </span>
              </div>
            ))}
          </div>
        )}

        {turno.notasInternas && (
          <p className="text-[11px] bg-rf-cream p-2 rounded-lg text-rf-charcoal italic border border-pink-100">
            💬 {turno.notasInternas}
          </p>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-8 font-admin">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="gold">Gestión Diaria</Badge>
            <span className="text-xs text-rf-charcoal font-medium">Control.Evo Engine</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-rf-black mt-1">
            {esProfesional ? 'Mi Agenda' : 'Agenda del Studio'}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
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

          <Button variant="primary" size="sm" onClick={abrirTurnoManual}>
            <Plus className="w-3.5 h-3.5" />
            <span>Turno manual</span>
          </Button>
        </div>
      </div>

      {/* Filtro de fecha — presets a futuro + rango libre (estilo panel de anuncios) */}
      <div className="bg-white border border-pink-100 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-rf-rose-deep shrink-0" />
          {PRESETS_RANGO.map((p) => (
            <button
              key={p.id}
              onClick={() => aplicarPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                presetActivo === p.id
                  ? 'bg-rf-rose-deep text-white border-rf-rose-deep'
                  : 'bg-white text-rf-charcoal border-pink-200 hover:border-rf-rose'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPresetActivo('rango')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              presetActivo === 'rango'
                ? 'bg-rf-rose-deep text-white border-rf-rose-deep'
                : 'bg-white text-rf-charcoal border-pink-200 hover:border-rf-rose'
            }`}
          >
            Rango a elección
          </button>

          <div className="relative ml-auto">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar clienta o teléfono..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-rf-rose-deep w-48"
            />
          </div>
        </div>

        {presetActivo === 'rango' && (
          <div className="flex items-end gap-3 flex-wrap pt-1">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-rf-charcoal block mb-1">Desde</label>
              <input
                type="date"
                value={desde}
                min={hoyISO()}
                onChange={(e) => {
                  const v = e.target.value;
                  setDesde(v);
                  if (v > hasta) setHasta(v);
                }}
                className="px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-rf-rose-deep"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-rf-charcoal block mb-1">Hasta</label>
              <input
                type="date"
                value={hasta}
                min={desde}
                onChange={(e) => setHasta(e.target.value)}
                className="px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-rf-rose-deep"
              />
            </div>
          </div>
        )}

        <p className="text-[11px] text-rf-charcoal">
          {esRango ? (
            <>Mostrando <strong className="text-rf-black">{formatDateShort(desde)}</strong> al <strong className="text-rf-black">{formatDateShort(hasta)}</strong> · {turnosFiltrados.length} turno{turnosFiltrados.length === 1 ? '' : 's'}</>
          ) : (
            <>Mostrando <strong className="text-rf-black">{formatDateReadable(desde)}</strong> · {turnosFiltrados.length} turno{turnosFiltrados.length === 1 ? '' : 's'}</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Agenda Timeline (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {esRango ? (
            <div className="space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-rf-charcoal">
                Calendario — {formatDateShort(desde)} al {formatDateShort(hasta)}
              </h2>
              {Object.keys(turnosPorDia).length === 0 ? (
                <p className="text-xs text-rf-charcoal">Sin turnos en el período.</p>
              ) : (
                Object.keys(turnosPorDia)
                  .sort()
                  .map((dia) => (
                    <div key={dia} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-rf-rose-deep capitalize">
                          {formatDateReadable(dia)} · {turnosPorDia[dia].length} turno{turnosPorDia[dia].length === 1 ? '' : 's'}
                        </h3>
                        <button
                          onClick={() => {
                            setDesde(dia);
                            setHasta(dia);
                            setPresetActivo('rango');
                          }}
                          className="text-[11px] font-semibold text-rf-rose-deep hover:underline cursor-pointer"
                        >
                          Ver solo este día
                        </button>
                      </div>
                      <CalendarioGrilla
                        profesionales={profesionalesParaGrilla}
                        fecha={dia}
                        turnos={turnos}
                        bloqueos={bloqueos}
                        onSeleccionarTurno={setTurnoSeleccionadoModal}
                        getClientaNombre={getClientaNombre}
                      />
                    </div>
                  ))
              )}
            </div>
          ) : (
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
          )}

          {/* Bloqueos activos del período — con opción de sacarlos */}
          {bloqueosDelRango.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rf-charcoal">
                {esRango ? 'Bloqueos del período' : 'Bloqueos del día'}
              </h3>
              <div className="space-y-2">
                {bloqueosDelRango
                  .map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    >
                      <span className="text-rf-charcoal">
                        {esRango && <strong className="text-rf-black">{formatDateShort(b.fecha)} · </strong>}
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
              <p className="text-sm font-semibold text-rf-black">
                No hay turnos agendados para {esRango ? 'este período' : 'este día'}
              </p>
              <p className="text-xs text-rf-charcoal">Elegí otra fecha o quitá el filtro de profesional.</p>
            </Card>
          ) : esRango ? (
            <div className="space-y-6">
              {Object.entries(turnosPorDia).map(([dia, lista]) => (
                <div key={dia} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rf-rose-deep capitalize sticky top-0 bg-rf-cream/95 py-1">
                    {formatDateReadable(dia)} · {lista.length} turno{lista.length === 1 ? '' : 's'}
                  </h3>
                  <div className="space-y-4">{lista.map(renderTurnoCard)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">{turnosFiltrados.map(renderTurnoCard)}</div>
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

          {/* Yosy Recordatorios (Fase 7): cola de lo que hay que mandar YA,
              juntando los turnos del filtro actual — 1 click abre WhatsApp
              con el mensaje ya armado. */}
          {!esProfesional && (
            <Card className="bg-gradient-to-b from-amber-50/60 via-white to-white space-y-3 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-rf-gold-bright" />
                <span>Yosy Recordatorios {recordatoriosPendientes.length > 0 ? `(${recordatoriosPendientes.length})` : ''}</span>
              </div>

              {recordatoriosPendientes.length === 0 ? (
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  No hay recordatorios pendientes. Se activan por turno
                  (72h / 48h / 24h antes para las manuales con seña pendiente; 48h / 24h / 4h para el resto) y quedan acá hasta que los mandes por WhatsApp.
                </p>
              ) : (
                <div className="space-y-2">
                  {recordatoriosPendientes.map(({ turno, ventana, horasFaltan }) => {
                    const clienta = clientas.find((c) => c.id === turno.clientaId);
                    return (
                      <div key={`${turno.id}-${ventana.value}`} className="bg-white rounded-xl border border-amber-200 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-rf-black">{clienta?.nombre ?? 'Clienta'}</span>
                          <Badge variant="warning" size="sm">{ventana.label}</Badge>
                        </div>
                        <p className="text-[10px] text-rf-charcoal">
                          {formatDateReadable(turno.fecha)} {turno.horaInicio} hs · en {Math.round(horasFaltan)}h
                        </p>
                        <Button variant="primary" size="sm" fullWidth onClick={() => enviarRecordatorio(turno, ventana.value)}>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Enviar por WhatsApp</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Quick Stats Widget */}
          <Card className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rf-charcoal">
              {esRango
                ? `Resumen del período (${formatDateShort(desde)} – ${formatDateShort(hasta)})`
                : `Resumen del día (${fechaFiltro})`}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-pink-100">
                <span className="text-rf-charcoal">Total Turnos:</span>
                <span className="font-bold text-rf-black">{turnosFiltrados.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-pink-100">
                <span className="text-rf-charcoal">{esRango ? 'Señas cobradas:' : 'Señas cobradas hoy:'}</span>
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
          {/* max-h + overflow-y-auto: con reprogramar/recordatorios abiertos el
              contenido puede superar la altura de la pantalla — antes la caja
              se estiraba sin límite y el encabezado (con la X) quedaba arriba,
              fuera de la vista. El header queda "sticky" para seguir accesible
              aunque se scrollee el resto. */}
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 border border-pink-100 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="sticky top-0 -mx-6 -mt-6 px-6 pt-6 pb-3 bg-white z-10 flex items-center justify-between border-b border-pink-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rf-rose-deep">
                  Gestión de Turno
                </span>
                <h3 className="font-display font-bold text-lg text-rf-black">
                  {getClientaNombre(turnoSeleccionadoModal.clientaId)}
                </h3>
              </div>
              <button
                onClick={() => {
                  setTurnoSeleccionadoModal(null);
                  setReprogramando(false);
                  setPanelServicios(null);
                }}
                aria-label="Cerrar"
                className="-m-2 p-2.5 rounded-xl text-gray-400 hover:text-rf-black hover:bg-rf-cream active:bg-rf-cream transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p>
                <strong>Servicio:</strong> {getServicioNombre(turnoSeleccionadoModal.servicioId)}
              </p>
              {(turnoSeleccionadoModal.serviciosExtra ?? []).length > 0 && (
                <p>
                  <strong>Extras:</strong>{' '}
                  {(turnoSeleccionadoModal.serviciosExtra ?? [])
                    .map((e) => `${e.nombre} (${formatCurrency(e.precio)})`)
                    .join(', ')}
                </p>
              )}
              <p>
                <strong>Profesional:</strong>{' '}
                {getProfesional(turnoSeleccionadoModal.profesionalId)?.nombre}
              </p>
              <p>
                <strong>Fecha y Hora:</strong> {turnoSeleccionadoModal.fecha} a las{' '}
                {turnoSeleccionadoModal.horaInicio} hs
              </p>
              <p>
                <strong>Estado Actual:</strong> <StatusPill estado={turnoSeleccionadoModal.estado} senaAparte />
              </p>
              {estadoSena(turnoSeleccionadoModal) !== 'no_aplica' && (
                <div className="flex flex-wrap items-center gap-2">
                  <strong>Seña:</strong>
                  <SenaBadge turno={turnoSeleccionadoModal} size="md" />
                </div>
              )}
            </div>

            {/* Turno cargado a mano: acá se registra que la clienta abonó la seña
                (o se deshace). Los turnos del sitio y los ya confirmados no lo
                necesitan — su seña la verifica el sistema. */}
            {turnoSeleccionadoModal.origenReserva === 'manual' &&
              estadoSena(turnoSeleccionadoModal) !== 'no_aplica' &&
              turnoSeleccionadoModal.estado !== 'sena_confirmada' && (
                <div
                  className={`rounded-xl border p-3 space-y-2 text-xs ${
                    estadoSena(turnoSeleccionadoModal) === 'pagada'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <p className="text-rf-charcoal">
                    {estadoSena(turnoSeleccionadoModal) === 'pagada'
                      ? 'Registraste que esta clienta ya abonó la seña. Recibe solo los recordatorios normales (48h, 24h y 4h antes).'
                      : 'La seña todavía no está registrada: se le pide por WhatsApp 72h y 48h antes y se le confirma la cita 24h antes.'}
                  </p>
                  <Button
                    variant={estadoSena(turnoSeleccionadoModal) === 'pagada' ? 'ghost' : 'primary'}
                    size="sm"
                    fullWidth
                    onClick={async () => {
                      const abonada = estadoSena(turnoSeleccionadoModal) !== 'pagada';
                      if (await marcarSenaManual(turnoSeleccionadoModal.id, abonada)) {
                        setTurnoSeleccionadoModal({ ...turnoSeleccionadoModal, aprobadoPorProfesional: abonada });
                      }
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {estadoSena(turnoSeleccionadoModal) === 'pagada'
                        ? 'Deshacer: la seña todavía no está paga'
                        : 'Marcar la seña como pagada'}
                    </span>
                  </Button>
                </div>
              )}

            {!esProfesional && (
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => marcarClienteRecurrente(turnoSeleccionadoModal)}
              >
                <Repeat className="w-3.5 h-3.5 text-rf-rose-deep" />
                <span>Marcar como clienta recurrente de este servicio</span>
              </Button>
            )}

            {reprogramando ? (
              (() => {
                const profReprog = getProfesional(turnoSeleccionadoModal.profesionalId);
                const servReprog = servicios.find((s) => s.id === turnoSeleccionadoModal.servicioId);
                const horariosReprog =
                  profReprog && servReprog && nuevaFecha
                    ? calcularHorariosDisponibles(profReprog, nuevaFecha, servReprog.duracionMinutos, turnos, bloqueos)
                    : [];
                return (
                  <div className="space-y-3 pt-2 border-t border-pink-100">
                    <label className="text-xs font-bold text-rf-black block">Reprogramar a:</label>
                    <input
                      type="date"
                      value={nuevaFecha}
                      min={hoyISO()}
                      onChange={(e) => {
                        setNuevaFecha(e.target.value);
                        setNuevaHora('');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold"
                    />
                    {nuevaFecha && (
                      horariosReprog.length === 0 ? (
                        <p className="text-[11px] text-rf-charcoal bg-rf-cream border border-pink-100 rounded-xl p-2">
                          {profReprog?.nombre} no tiene horarios libres ese día. Probá otra fecha.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {horariosReprog.map((h) => (
                            <button
                              key={h}
                              onClick={() => setNuevaHora(h)}
                              className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                                nuevaHora === h
                                  ? 'bg-rf-rose-deep text-white border-rf-rose-deep'
                                  : 'bg-white text-rf-black border-pink-200 hover:border-rf-rose'
                              }`}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button variant="ghost" size="sm" onClick={() => setReprogramando(false)}>
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!nuevaFecha || !nuevaHora || !servReprog}
                        onClick={async () => {
                          if (!servReprog) return;
                          const horaFin = sumarMinutos(nuevaHora, servReprog.duracionMinutos);
                          await reprogramarTurno(turnoSeleccionadoModal.id, nuevaFecha, nuevaHora, horaFin);
                          setReprogramando(false);
                          setTurnoSeleccionadoModal(null);
                        }}
                      >
                        Confirmar nueva fecha
                      </Button>
                    </div>
                  </div>
                );
              })()
            ) : panelServicios?.turnoId === turnoSeleccionadoModal.id ? (
              <PanelServiciosRealizados
                key={`${panelServicios.turnoId}-${panelServicios.modo}`}
                turno={turnos.find((t) => t.id === turnoSeleccionadoModal.id) ?? turnoSeleccionadoModal}
                servicioBase={servicios.find((s) => s.id === turnoSeleccionadoModal.servicioId)}
                profesional={getProfesional(turnoSeleccionadoModal.profesionalId)}
                servicios={servicios}
                modo={panelServicios.modo}
                onCancelar={() => setPanelServicios(null)}
                onGuardar={async (extras) => {
                  const turnoActual = turnos.find((t) => t.id === turnoSeleccionadoModal.id) ?? turnoSeleccionadoModal;
                  const teniaExtras = (turnoActual.serviciosExtra ?? []).length > 0;
                  const confirmando = panelServicios.modo === 'confirmar';
                  // Sin extras (y sin extras previos que borrar) alcanza con el camino
                  // de siempre: solo cambia el estado, el total queda como estaba.
                  if (confirmando && extras.length === 0 && !teniaExtras) {
                    await actualizarEstadoTurno(turnoActual.id, 'completado');
                  } else if (!(await guardarServiciosTurno(turnoActual.id, extras, confirmando ? 'completado' : undefined))) {
                    return;
                  }
                  setPanelServicios(null);
                  setTurnoSeleccionadoModal(null);
                }}
              />
            ) : (
            <div className="space-y-2 pt-2 border-t border-pink-100">
              <label className="text-xs font-bold text-rf-black block">
                Cambiar Estado del Turno:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className={turnoSeleccionadoModal.estado === 'completado' ? 'col-span-2' : ''}
                  onClick={() =>
                    setPanelServicios({
                      turnoId: turnoSeleccionadoModal.id,
                      modo: turnoSeleccionadoModal.estado === 'completado' ? 'editar' : 'confirmar',
                    })
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {turnoSeleccionadoModal.estado === 'completado'
                      ? 'Editar servicios realizados'
                      : 'Vino — confirmar servicios'}
                  </span>
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
                  variant="outline"
                  size="sm"
                  className="col-span-2"
                  onClick={() => {
                    setNuevaFecha(turnoSeleccionadoModal.fecha);
                    setNuevaHora('');
                    setReprogramando(true);
                  }}
                >
                  <CalendarDays className="w-3.5 h-3.5 text-rf-rose-deep" />
                  <span>Reprogramar turno</span>
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
            )}

            {/* Yosy Recordatorios por turno (Fase 7) — 2 clicks: activar acá
                abre WhatsApp con el mensaje ya armado, listo para enviar. */}
            {!esProfesional && (
              <div className="space-y-2 pt-2 border-t border-pink-100">
                <label className="text-xs font-bold text-rf-black block">Recordatorios de este turno:</label>
                <div className="space-y-2">
                  {ventanasDelTurno(turnoSeleccionadoModal).map((v) => {
                    const config = recordatoriosConfig.find(
                      (r) => r.turnoId === turnoSeleccionadoModal.id && r.plantilla === v.value
                    );
                    const activado = config?.activado ?? false;
                    const clienta = clientas.find((c) => c.id === turnoSeleccionadoModal.clientaId);
                    const mensaje = mensajeParaTurno(
                      turnoSeleccionadoModal,
                      v.value,
                      clienta?.nombre ?? 'clienta',
                      getServicioNombre(turnoSeleccionadoModal.servicioId)
                    );

                    const enviarPorWhatsApp = () => {
                      toggleRecordatorio(turnoSeleccionadoModal.id, v.value, true);
                      if (clienta) {
                        window.open(buildWhatsAppUrlPara(clienta.telefono, mensaje), '_blank');
                      } else {
                        showToast('❌ No encontramos el teléfono de la clienta.');
                      }
                    };

                    return (
                      <div
                        key={v.value}
                        className={`rounded-xl border p-2.5 space-y-1.5 ${
                          activado ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-pink-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rf-black">{v.label}</span>
                          {activado && (
                            <button
                              onClick={() => toggleRecordatorio(turnoSeleccionadoModal.id, v.value, false)}
                              className="text-[10px] text-gray-400 hover:text-rf-danger cursor-pointer"
                            >
                              Desactivar
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-rf-charcoal italic line-clamp-2">{mensaje}</p>
                        <Button variant={activado ? 'outline' : 'primary'} size="sm" fullWidth onClick={enviarPorWhatsApp}>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{activado ? '✓ Activado — reenviar por WhatsApp' : 'Activar y enviar por WhatsApp'}</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTurnoSeleccionadoModal(null);
                  setReprogramando(false);
                  setPanelServicios(null);
                }}
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
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 border border-pink-100 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="sticky top-0 -mx-6 -mt-6 px-6 pt-6 pb-3 bg-white z-10 flex items-center justify-between border-b border-pink-100">
              <h3 className="font-display font-bold text-lg text-rf-black">Bloquear Horario</h3>
              <button
                onClick={() => setModalBloqueoAbierto(false)}
                aria-label="Cerrar"
                className="-m-2 p-2.5 rounded-xl text-gray-400 hover:text-rf-black hover:bg-rf-cream active:bg-rf-cream transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
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

      {/* MODAL TURNO MANUAL (13/10/2026) */}
      {modalTurnoManualAbierto && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 border border-pink-100 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="sticky top-0 -mx-6 -mt-6 px-6 pt-6 pb-3 bg-white z-10 flex items-center justify-between border-b border-pink-100">
              <h3 className="font-display font-bold text-lg text-rf-black">Turno Manual</h3>
              <button
                onClick={() => setModalTurnoManualAbierto(false)}
                aria-label="Cerrar"
                className="-m-2 p-2.5 rounded-xl text-gray-400 hover:text-rf-black hover:bg-rf-cream active:bg-rf-cream transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-rf-charcoal bg-rf-cream border border-pink-100 rounded-xl p-2.5">
              Para una clienta que llamó por teléfono, un walk-in que cambió de idea sobre el servicio, o que suma un servicio extra el mismo día. No pasa por el sitio público ni por Mercado Pago.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-rf-black block mb-1">Nombre de la clienta</label>
                  <input
                    type="text"
                    value={tmNombre}
                    onChange={(e) => setTmNombre(e.target.value)}
                    placeholder="Nombre y apellido"
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-rf-black block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={tmTelefono}
                    onChange={(e) => setTmTelefono(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-rf-black block mb-1">Profesional</label>
                <select
                  value={tmProfesionalId}
                  onChange={(e) => {
                    setTmProfesionalId(e.target.value);
                    setTmServicioId('');
                    setTmMontoTotal('');
                    setTmMontoSena('');
                  }}
                  disabled={esProfesional}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold disabled:bg-rf-cream"
                >
                  <option value="">Elegí una profesional</option>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-rf-black block mb-1">Servicio</label>
                <select
                  value={tmServicioId}
                  onChange={(e) => elegirServicioManual(e.target.value)}
                  disabled={!tmProfesionalId}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold disabled:bg-rf-cream"
                >
                  <option value="">Elegí un servicio</option>
                  {tmServiciosDeLaProfesional.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} — {formatCurrency(s.precio)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-rf-black block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={tmFecha}
                    onChange={(e) => setTmFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-rf-black block mb-1">Hora</label>
                  <input
                    type="time"
                    value={tmHora}
                    onChange={(e) => setTmHora(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-rf-black block mb-1">Monto total</label>
                  <input
                    type="number"
                    value={tmMontoTotal}
                    onChange={(e) => setTmMontoTotal(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-rf-black block mb-1">Seña</label>
                  <input
                    type="number"
                    value={tmMontoSena}
                    onChange={(e) => setTmMontoSena(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                  />
                </div>
              </div>

              {tmEstado !== 'completado' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-rf-black block">¿Ya abonó la seña?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTmSenaAbonada(true)}
                      className={`py-2.5 px-2 rounded-xl border-2 font-bold text-xs cursor-pointer transition-colors ${
                        tmSenaAbonada
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-white border-pink-200 text-rf-charcoal hover:border-emerald-300'
                      }`}
                    >
                      ✅ Sí, ya abonó
                    </button>
                    <button
                      type="button"
                      onClick={() => setTmSenaAbonada(false)}
                      className={`py-2.5 px-2 rounded-xl border-2 font-bold text-xs cursor-pointer transition-colors ${
                        !tmSenaAbonada
                          ? 'bg-amber-50 border-amber-500 text-amber-800'
                          : 'bg-white border-pink-200 text-rf-charcoal hover:border-amber-300'
                      }`}
                    >
                      ⏳ Todavía no
                    </button>
                  </div>
                  <p className="text-[11px] text-rf-charcoal">
                    {tmSenaAbonada
                      ? 'Queda con "Seña pagada" y recibe los recordatorios normales (48h, 24h y 4h antes).'
                      : 'Queda con "Seña pendiente": se le pide la seña por WhatsApp 72h y 48h antes y se le confirma la cita 24h antes.'}
                  </p>
                </div>
              )}

              <div>
                <label className="font-bold text-rf-black block mb-1">Estado</label>
                <select
                  value={tmEstado}
                  onChange={(e) => setTmEstado(e.target.value as EstadoTurno)}
                  className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                >
                  <option value="reservado">Reservado (todavía no vino)</option>
                  <option value="completado">Completado (ya vino)</option>
                </select>
              </div>

              <label className="flex items-start gap-2 rounded-xl bg-rf-cream border border-pink-100 p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tmRecurrente}
                  onChange={(e) => setTmRecurrente(e.target.checked)}
                  className="mt-0.5 accent-rf-rose-deep"
                />
                <span>
                  <strong className="text-rf-black block">Clienta recurrente</strong>
                  <span className="text-[11px] text-rf-charcoal">
                    La suma automáticamente a "Clientas Recurrentes" para este servicio.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setModalTurnoManualAbierto(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={tmGuardando || !tmNombre.trim() || !tmProfesionalId || !tmServicioId || !tmFecha || !tmHora}
                onClick={handleCrearTurnoManual}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tmGuardando ? 'Guardando...' : 'Crear turno'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
