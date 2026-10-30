// src/pages/admin/AdminAgenda.tsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, supabaseEnabled } from '../../lib/supabase';
import { Turno, EstadoTurno, PlantillaRecordatorio, BloqueoHorario } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusPill } from '../../components/ui/StatusPill';
import { RitualTimeline } from '../../components/ui/RitualTimeline';
import { CalendarioGrilla } from '../../components/admin/CalendarioGrilla';
import { PanelServiciosRealizados } from '../../components/admin/PanelServiciosRealizados';
import { PanelEditarTurno } from '../../components/admin/PanelEditarTurno';
import { PanelEditarClienta } from '../../components/admin/PanelEditarClienta';
import { AvisoHorario } from '../../components/admin/AvisoHorario';
import { formatCurrency, formatDateReadable, formatDateShort } from '../../lib/formatters';
import { ventanasDelTurno, estadoSena, estadoRecordatorios, mensajeParaTurno, llevaCuentaBancaria, cuentaBancariaParaTurno, puedeProfesionalEditarCompletado, type VentanaRecordatorio } from '../../lib/recordatorios';
import { SenaBadge } from '../../components/ui/SenaBadge';
import { hoyISO, sumarDiasISO, sumarMinutos, finSinPasarMedianoche, turnoBloqueaHorario, encajeEnHorario, DIAS_SEMANA } from '../../lib/disponibilidad';
import { calcularMontoSena, descuentoMercadoPago, DESCUENTO_MP_POR_RESERVA } from '../../lib/pricing';
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
    completarTurno,
    marcarSenaManual,
    sesionConToken,
    abrirPinModal,
    editarTurno,
    cancelarTurno,
    reactivarTurno,
    reabrirTurno,
    editarClienta,
    estadoDatos,
    refrescarDatos,
    aprobarComprobante,
    crearBloqueo,
    eliminarBloqueo,
    crearTurno,
    buscarOCrearClienta,
    toggleRecordatorio,
    enviarRecordatorioWhatsApp,
    showToast,
  } = useApp();
  const esProfesional = rolActivo === 'profesional';

  // Comprobantes de transferencia esperando aprobación — la propia
  // profesional de alquiler fijo ve los suyos (Fase 5); Yosy ve los de
  // Mili/Roma cuando la clienta no tenía Mercado Pago (29/10/2026): esos
  // afectan la comisión del cierre, así que los aprueba ella, nunca la
  // profesional (ver api/aprobar-comprobante.ts).
  const profesionalActivo = profesionales.find((p) => p.id === profesionalActivoId);
  const esAlquilerFijo = profesionalActivo?.modeloComision.tipo === 'alquiler_fijo';
  const comprobantesPendientes = esProfesional
    ? esAlquilerFijo
      ? turnos.filter(
          (t) =>
            t.profesionalId === profesionalActivoId &&
            t.circuitoPago === 'transferencia' &&
            !!t.comprobanteTransferenciaUrl &&
            !t.aprobadoPorProfesional
        )
      : []
    : turnos.filter((t) => t.circuitoPago === 'mercado_pago' && !!t.comprobanteTransferenciaUrl && !t.aprobadoPorProfesional);

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

  // Reloj de 15 s para el "actualizado hace…" del indicador de datos de la base
  const [ahoraDatos, setAhoraDatos] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhoraDatos(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);
  const [actualizandoDatos, setActualizandoDatos] = useState(false);

  // Editar la reserva (servicio, día, hora…) y cancelarla con motivo, desde el modal
  const [panelEdicion, setPanelEdicion] = useState<string | null>(null); // id del turno que se está editando
  const [cancelando, setCancelando] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [deshaciendo, setDeshaciendo] = useState(false); // confirmación de "deshacer Vino"
  const [editandoClienta, setEditandoClienta] = useState(false);

  // Bloqueo manual de horario (Fase 6)
  const [modalBloqueoAbierto, setModalBloqueoAbierto] = useState(false);
  const [bloqueoProfesionalId, setBloqueoProfesionalId] = useState<string>('');
  const [bloqueoFecha, setBloqueoFecha] = useState<string>(hoyISO());
  const [bloqueoDiaCompleto, setBloqueoDiaCompleto] = useState(true);
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState('09:00');
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState('19:00');
  const [bloqueoMotivo, setBloqueoMotivo] = useState('');
  // Tocar un horario bloqueado en el calendario ofrece desbloquearlo (29/10/2026).
  const [bloqueoAConfirmar, setBloqueoAConfirmar] = useState<BloqueoHorario | null>(null);
  const [desbloqueando, setDesbloqueando] = useState(false);

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
  // buscarOCrearClienta reutiliza a la clienta si ya hay una con ese nombre (sin distinguir
  // mayúsculas): en ese caso el teléfono que se escriba NO se cargaba en ninguna parte.
  const tmClientaExistente = tmNombre.trim()
    ? clientas.find((c) => c.nombre.toLowerCase() === tmNombre.trim().toLowerCase())
    : undefined;
  const tmTelefonoTipeado = tmTelefono.trim();
  const tmDigitosTelefono = tmTelefonoTipeado.replace(/\D/g, '').length;
  const tmTelefonoInvalido =
    tmTelefonoTipeado !== '' && !(/^[0-9+()\-\s.]+$/.test(tmTelefonoTipeado) && tmDigitosTelefono >= 8 && tmDigitosTelefono <= 15);
  const tmServiciosDeLaProfesional = tmProfesionalId
    ? servicios.filter((s) => s.profesionalesQueLoRealizan.includes(tmProfesionalId))
    : servicios;

  // Agenda de esa profesional ese día, para avisar ANTES de guardar si el horario
  // choca. La base solo rechaza turnos que empiezan a la MISMA hora (índice
  // turno_unico_por_horario); los que se pisan a medias sí se pueden cargar, pero
  // se avisa porque una profesional no atiende a dos clientas a la vez.
  const tmTurnosDelDia =
    tmProfesionalId && tmFecha
      ? turnos
          .filter((t) => t.profesionalId === tmProfesionalId && t.fecha === tmFecha && turnoBloqueaHorario(t))
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      : [];
  const tmHoraFin = tmServicio && tmHora ? finSinPasarMedianoche(tmHora, tmServicio.duracionMinutos) : null;
  const tmMismoInicio = tmHora ? tmTurnosDelDia.find((t) => t.horaInicio === tmHora) : undefined;
  const tmSolapados =
    tmHora && tmHoraFin
      ? tmTurnosDelDia.filter((t) => t.id !== tmMismoInicio?.id && t.horaInicio < tmHoraFin && t.horaFin > tmHora)
      : [];
  // Si la profesional bloqueó ese horario a mano ("Bloquear horario"): se avisa, pero el equipo puede
  // cargar el turno igual (ej. la clienta llegó de todos modos).
  const tmBloqueada =
    !!tmProfesionalId &&
    !!tmFecha &&
    !!tmHora &&
    bloqueos.some(
      (b) =>
        b.profesionalId === tmProfesionalId &&
        b.fecha === tmFecha &&
        (b.diaCompleto || !b.horaInicio || !b.horaFin || (b.horaInicio < (tmHoraFin ?? sumarMinutos(tmHora, 30)) && b.horaFin > tmHora))
    );
  // Horarios fijos de esa profesional ese día que todavía están libres (atajo para elegir hora).
  const tmFijosLibres =
    tmProfesionalId && tmFecha
      ? (
          profesionales.find((p) => p.id === tmProfesionalId)?.horariosFijos?.[
            DIAS_SEMANA[new Date(`${tmFecha}T12:00:00`).getDay()]
          ] ?? []
        ).filter((h) => !tmTurnosDelDia.some((t) => t.horaInicio === h))
      : [];

  // Ir a cualquier día del calendario (sin límite hacia adelante ni hacia atrás).
  const irADia = (dia: string) => {
    if (!dia) return;
    setDesde(dia);
    setHasta(dia);
    setPresetActivo('dia');
  };

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
    // Si la clienta ya existía y no tenía teléfono, el que se escribió se guarda en su ficha
    // (si ya tenía uno distinto no se pisa solo: pudo ser otra persona con el mismo nombre).
    // Solo Yosy: una profesional no tiene ni el campo para escribirlo (29/10/2026).
    const completarTelefono =
      !esProfesional && !!tmClientaExistente && tmTelefonoTipeado !== '' && !(tmClientaExistente.telefono ?? '').trim();
    // Registrar la seña como pagada o guardar el teléfono exige PIN reciente: se pide ANTES de
    // crear el turno, así no queda un turno creado sin lo que se quiso cargar.
    if ((registrarSena || completarTelefono) && !sesionConToken) {
      showToast('🔑 Para guardar la seña o el teléfono, ingresá tu PIN.');
      abrirPinModal(esProfesional ? 'profesional' : 'admin');
      return;
    }
    setTmGuardando(true);
    try {
      const clientaId = await buscarOCrearClienta(tmNombre.trim(), esProfesional ? '' : tmTelefono.trim());
      const horaFin = finSinPasarMedianoche(tmHora, tmServicio.duracionMinutos);
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
      if (completarTelefono) await editarClienta(nuevo.id, { telefono: tmTelefonoTipeado });
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
  // (seña ya paga: 48/24h · manual con seña pendiente: 72/48/24h) lo define
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

  // Marca el recordatorio como enviado y abre WhatsApp con el mensaje armado; en los de
  // seña (72h / 48h) de Mili/Roma además agrega la cuenta bancaria del día de ese turno.
  const enviarRecordatorio = (turno: Turno, plantilla: PlantillaRecordatorio) => {
    const clienta = clientas.find((c) => c.id === turno.clientaId);
    if (!clienta) {
      showToast('❌ No encontramos el teléfono de la clienta.');
      return;
    }
    return enviarRecordatorioWhatsApp(turno, plantilla, clienta, getServicioNombre(turno.servicioId));
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
            {prof && ['fuera_de_jornada', 'dia_libre'].includes(encajeEnHorario(prof, turno.fecha, turno.horaInicio).tipo) && (
              <Badge variant="neutral" size="sm">⏱ Fuera de horario</Badge>
            )}
            {descuentoMercadoPago(turno) > 0 && (
              <Badge variant="neutral" size="sm">Cargo de gestión · −{formatCurrency(DESCUENTO_MP_POR_RESERVA)}</Badge>
            )}
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
          {/* Ir a cualquier día: flechas para ayer/mañana y un selector de fecha sin límite */}
          <div className="flex items-center gap-1 bg-white border border-pink-200 rounded-lg px-1 py-0.5">
            <button
              onClick={() => irADia(sumarDiasISO(desde, -1))}
              aria-label="Día anterior"
              className="px-2 py-1 text-rf-rose-deep font-bold cursor-pointer hover:bg-rf-cream rounded-md"
            >
              ‹
            </button>
            <input
              type="date"
              value={esRango ? '' : desde}
              onChange={(e) => irADia(e.target.value)}
              aria-label="Ir a un día"
              className="text-xs font-semibold bg-transparent focus:outline-none cursor-pointer"
            />
            <button
              onClick={() => irADia(sumarDiasISO(desde, 1))}
              aria-label="Día siguiente"
              className="px-2 py-1 text-rf-rose-deep font-bold cursor-pointer hover:bg-rf-cream rounded-md"
            >
              ›
            </button>
          </div>
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

        {(estadoDatos.actualizadoEn || estadoDatos.error) && (
          <div
            className={`flex items-center justify-between gap-2 flex-wrap rounded-xl border px-3 py-2 text-[11px] ${
              estadoDatos.error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-pink-100 text-rf-charcoal'
            }`}
          >
            <span className={estadoDatos.error ? 'font-semibold' : ''}>
              {estadoDatos.error
                ? '⚠️ No se pudo actualizar con la base (¿sin internet?): lo que ves puede estar desactualizado.'
                : `Datos de la base actualizados hace ${
                    Math.max(0, Math.round((ahoraDatos - (estadoDatos.actualizadoEn as number)) / 1000)) < 60
                      ? `${Math.max(0, Math.round((ahoraDatos - (estadoDatos.actualizadoEn as number)) / 1000))} s`
                      : `${Math.round((ahoraDatos - (estadoDatos.actualizadoEn as number)) / 60000)} min`
                  } · ${turnos.length} turnos cargados`}
            </span>
            <button
              onClick={async () => {
                setActualizandoDatos(true);
                await refrescarDatos();
                setAhoraDatos(Date.now());
                setActualizandoDatos(false);
              }}
              disabled={actualizandoDatos}
              className="flex items-center gap-1 font-bold text-rf-rose-deep hover:underline cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${actualizandoDatos ? 'animate-spin' : ''}`} />
              <span>{actualizandoDatos ? 'Actualizando…' : 'Actualizar ahora'}</span>
            </button>
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
                        onClickBloqueo={setBloqueoAConfirmar}
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
                onClickBloqueo={setBloqueoAConfirmar}
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
                  (72h / 48h / 24h antes para las manuales con seña pendiente; 48h / 24h para el resto) y quedan acá hasta que los mandes por WhatsApp.
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
                  setPanelEdicion(null);
                  setCancelando(false);
                  setDeshaciendo(false);
                  setEditandoClienta(false);
                  setPanelServicios(null);
                }}
                aria-label="Cerrar"
                className="-m-2 p-2.5 rounded-xl text-gray-400 hover:text-rf-black hover:bg-rf-cream active:bg-rf-cream transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {(() => {
                const clientaDelTurno = clientas.find((c) => c.id === turnoSeleccionadoModal.clientaId);
                if (!clientaDelTurno) return null;
                return editandoClienta ? (
                  <PanelEditarClienta
                    key={clientaDelTurno.id}
                    clienta={clientaDelTurno}
                    puedeVaciarTelefono={!esProfesional}
                    puedeVerTelefono={!esProfesional}
                    onCancelar={() => setEditandoClienta(false)}
                    onGuardar={async (datos) => {
                      const r = await editarClienta(turnoSeleccionadoModal.id, datos);
                      if (r.ok) setEditandoClienta(false);
                      return r.ok;
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0">
                      <strong>Clienta:</strong> {clientaDelTurno.nombre}
                      {!esProfesional && (
                        <>
                          {' · '}
                          {clientaDelTurno.telefono ? (
                            clientaDelTurno.telefono
                          ) : (
                            <span className="text-amber-800 font-semibold">sin teléfono</span>
                          )}
                        </>
                      )}
                    </p>
                    <button
                      onClick={() => setEditandoClienta(true)}
                      className="shrink-0 text-[11px] font-bold text-rf-rose-deep hover:underline cursor-pointer"
                    >
                      Editar datos
                    </button>
                  </div>
                );
              })()}
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
              {descuentoMercadoPago(turnoSeleccionadoModal) > 0 && (
                <p className="text-violet-800">
                  <strong>Cargo de gestión:</strong> esta reserva ya trae {formatCurrency(DESCUENTO_MP_POR_RESERVA)} de más
                  en el precio (se resta antes de calcular los porcentajes), haya pagado la seña por Mercado Pago o por transferencia.
                </p>
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
                      ? 'Registraste que esta clienta ya abonó la seña. Recibe solo los recordatorios normales (48h y 24h antes).'
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

            {panelEdicion === turnoSeleccionadoModal.id ? (
              <PanelEditarTurno
                key={turnoSeleccionadoModal.id}
                turno={turnos.find((t) => t.id === turnoSeleccionadoModal.id) ?? turnoSeleccionadoModal}
                servicios={servicios}
                profesionales={profesionales}
                turnos={turnos}
                bloqueos={bloqueos}
                esAdmin={!esProfesional}
                getClientaNombre={getClientaNombre}
                onCancelar={() => setPanelEdicion(null)}
                onGuardar={async (cambios) => {
                  const r = await editarTurno(turnoSeleccionadoModal.id, cambios);
                  if (r.ok) {
                    (r.advertencias ?? []).forEach((a) => showToast(`⚠️ ${a}`));
                    setPanelEdicion(null);
                    setTurnoSeleccionadoModal(null);
                  }
                  return r.ok;
                }}
              />
            ) : panelServicios?.turnoId === turnoSeleccionadoModal.id ? (
              <PanelServiciosRealizados
                key={`${panelServicios.turnoId}-${panelServicios.modo}`}
                turno={turnos.find((t) => t.id === turnoSeleccionadoModal.id) ?? turnoSeleccionadoModal}
                servicioBase={servicios.find((s) => s.id === turnoSeleccionadoModal.servicioId)}
                profesional={getProfesional(turnoSeleccionadoModal.profesionalId)}
                servicios={servicios}
                modo={panelServicios.modo}
                puedeCambiarServicio={
                  panelServicios.modo === 'confirmar' ||
                  !esProfesional ||
                  puedeProfesionalEditarCompletado(turnoSeleccionadoModal, hoyISO())
                }
                onCancelar={() => setPanelServicios(null)}
                onGuardar={async ({ servicioId, extras }) => {
                  const turnoActual = turnos.find((t) => t.id === turnoSeleccionadoModal.id) ?? turnoSeleccionadoModal;
                  const teniaExtras = (turnoActual.serviciosExtra ?? []).length > 0;
                  if (!(await completarTurno(turnoActual.id, { servicioId, serviciosExtra: extras.length || teniaExtras ? extras : undefined }))) {
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
              {turnoSeleccionadoModal.estado === 'cancelado' ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-red-900 bg-red-50 border border-red-200 rounded-xl p-2">
                    Este turno está cancelado. Si fue un error o la clienta confirmó de nuevo, podés reactivarlo (si ese horario
                    sigue libre).
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={async () => {
                      if (await reactivarTurno(turnoSeleccionadoModal.id)) setTurnoSeleccionadoModal(null);
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reactivar turno</span>
                  </Button>
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-2">
                {turnoSeleccionadoModal.estado === 'completado' &&
                esProfesional &&
                !puedeProfesionalEditarCompletado(turnoSeleccionadoModal, hoyISO()) ? (
                  <p className="col-span-2 text-[11px] text-rf-charcoal bg-rf-cream border border-pink-100 rounded-xl p-2">
                    Ya pasaron más de 4hs desde que confirmaste este turno (o es de otro día): solo Yosy puede corregir
                    el servicio o los extras ahora (cambia las comisiones de esa semana).
                  </p>
                ) : (
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
                )}

                {turnoSeleccionadoModal.estado !== 'completado' && (
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
                )}

                {turnoSeleccionadoModal.estado === 'completado' && esProfesional ? (
                  <p className="col-span-2 text-[11px] text-rf-charcoal bg-rf-cream border border-pink-100 rounded-xl p-2">
                    Este turno ya está completado: solo Yosy puede editarlo (cambia las comisiones de esa semana).
                    {turnoSeleccionadoModal.fecha === hoyISO() && ' Como es de hoy, si lo marcaste por error lo podés deshacer.'}
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="col-span-2"
                    onClick={() => setPanelEdicion(turnoSeleccionadoModal.id)}
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-rf-rose-deep" />
                    <span>Editar reserva (servicio, día, hora…)</span>
                  </Button>
                )}

                {turnoSeleccionadoModal.estado === 'completado' &&
                  (!esProfesional || turnoSeleccionadoModal.fecha === hoyISO()) &&
                  (deshaciendo ? (
                    <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 space-y-2">
                      <p className="text-[11px] text-amber-900 font-semibold">
                        ¿Deshacer el "Vino"? El turno vuelve a pendiente y deja de sumar a las comisiones y a la facturación
                        hasta que lo marques de nuevo{!esProfesional ? ' (cuidado si esa semana ya está liquidada)' : ''}. Queda anotado.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setDeshaciendo(false)}>
                          No, dejarlo
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={async () => {
                            // 24/10/2026 (pedido de Tobias): antes esto cerraba el modal
                            // entero — había que reabrir el turno a mano para volver a
                            // confirmarlo. Ahora deja el modal abierto, directo en "¿Qué
                            // servicios se hizo?" (reabrir nunca toca servicio/extras/seña,
                            // así que no hace falta esperar a que se refresque `turnos`).
                            if (await reabrirTurno(turnoSeleccionadoModal.id)) {
                              setDeshaciendo(false);
                              setPanelServicios({ turnoId: turnoSeleccionadoModal.id, modo: 'confirmar' });
                            }
                          }}
                        >
                          Sí, deshacer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="col-span-2" onClick={() => setDeshaciendo(true)}>
                      <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                      <span>Deshacer "Vino" (volver a pendiente)</span>
                    </Button>
                  ))}

                {turnoSeleccionadoModal.estado !== 'completado' &&
                  (cancelando ? (
                    <div className="col-span-2 rounded-xl border border-red-200 bg-red-50 p-2.5 space-y-2">
                      <p className="text-[11px] text-red-900 font-semibold">
                        ¿Cancelar este turno? La seña no se reembolsa. Queda anotado quién lo canceló.
                      </p>
                      <input
                        type="text"
                        value={motivoCancelacion}
                        onChange={(e) => setMotivoCancelacion(e.target.value)}
                        maxLength={300}
                        placeholder="Motivo (opcional): ej. la clienta avisó que no puede venir"
                        className="w-full px-3 py-2 rounded-xl border border-red-200 text-xs bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setCancelando(false)}>
                          No, volver
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            if (await cancelarTurno(turnoSeleccionadoModal.id, motivoCancelacion)) {
                              setMotivoCancelacion('');
                              setCancelando(false);
                              setTurnoSeleccionadoModal(null);
                            }
                          }}
                        >
                          Sí, cancelar turno
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="danger" size="sm" className="col-span-2" onClick={() => setCancelando(true)}>
                      <span>Cancelar turno (seña no reembolsable)</span>
                    </Button>
                  ))}
              </div>
              )}
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
                    const conCuenta = llevaCuentaBancaria(turnoSeleccionadoModal, v.value);
                    // La cuenta bancaria no hace falta generarla: la vista previa ya es la real.
                    const cuentaBancaria = conCuenta ? cuentaBancariaParaTurno(turnoSeleccionadoModal) : undefined;
                    const mensaje = mensajeParaTurno(
                      turnoSeleccionadoModal,
                      v.value,
                      clienta?.nombre ?? 'clienta',
                      getServicioNombre(turnoSeleccionadoModal.servicioId),
                      cuentaBancaria
                    );

                    const enviarPorWhatsApp = () => enviarRecordatorio(turnoSeleccionadoModal, v.value);

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
                        <p className="text-[10px] text-rf-charcoal italic line-clamp-3">{mensaje}</p>
                        {conCuenta && cuentaBancaria && (
                          <p className="text-[10px] text-violet-800 font-semibold">
                            🏦 Lleva la cuenta de {cuentaBancaria.banco} ({cuentaBancaria.dias.toLowerCase()}) para la seña de este turno.
                          </p>
                        )}
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
                  setPanelEdicion(null);
                  setCancelando(false);
                  setDeshaciendo(false);
                  setEditandoClienta(false);
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
      {bloqueoAConfirmar && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-pink-100 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="font-display font-bold text-lg text-rf-black">¿Desbloquear este horario?</h3>
            <div className="text-xs text-rf-charcoal space-y-1 bg-rf-cream rounded-xl p-3">
              <p>
                <strong className="text-rf-black">{getProfesional(bloqueoAConfirmar.profesionalId)?.nombre}</strong>
                {' — '}
                {formatDateReadable(bloqueoAConfirmar.fecha)}
              </p>
              <p>
                {bloqueoAConfirmar.diaCompleto ? 'Todo el día' : `${bloqueoAConfirmar.horaInicio} a ${bloqueoAConfirmar.horaFin} hs`}
              </p>
              {bloqueoAConfirmar.motivo && <p className="italic">"{bloqueoAConfirmar.motivo}"</p>}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setBloqueoAConfirmar(null)} disabled={desbloqueando}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  setDesbloqueando(true);
                  await eliminarBloqueo(bloqueoAConfirmar.id);
                  setDesbloqueando(false);
                  setBloqueoAConfirmar(null);
                }}
                disabled={desbloqueando}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{desbloqueando ? 'Desbloqueando…' : 'Sí, desbloquear'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

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
                <div className={esProfesional ? 'col-span-2' : ''}>
                  <label className="font-bold text-rf-black block mb-1">Nombre de la clienta</label>
                  <input
                    type="text"
                    value={tmNombre}
                    onChange={(e) => setTmNombre(e.target.value)}
                    placeholder="Nombre y apellido"
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 font-semibold"
                  />
                </div>
                {!esProfesional && (
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
                )}
              </div>

              {/* El teléfono (nuevo o ya cargado) es terreno exclusivo de Yosy (29/10/2026,
                  pedido de Tobias: una profesional no agrega el número de nadie) — por eso acá
                  no se le muestra ni el campo ni ningún aviso sobre si la clienta ya existe. */}
              {!esProfesional && tmClientaExistente && (
                <p className="rounded-xl bg-sky-50 border border-sky-200 text-sky-900 p-2.5 text-[11px]">
                  {!(tmClientaExistente.telefono ?? '').trim()
                    ? tmTelefonoTipeado
                      ? '✓ Ya está cargada en el sistema, sin teléfono: el que escribas se guarda en su ficha.'
                      : 'Ya está cargada en el sistema pero sin teléfono: escribilo para guardarlo en su ficha.'
                    : tmTelefonoTipeado && tmTelefonoTipeado !== tmClientaExistente.telefono
                    ? `⚠️ Ya está cargada con el teléfono ${tmClientaExistente.telefono}. Se usa ese; si cambió, corregilo con "Editar datos" en el turno.`
                    : `Ya está cargada en el sistema (teléfono ${tmClientaExistente.telefono}).`}
                </p>
              )}
              {!esProfesional && tmTelefonoInvalido && (
                <p className="rounded-xl bg-red-50 border border-red-200 text-red-800 p-2.5 text-[11px] font-semibold">
                  El teléfono tiene que tener entre 8 y 15 números (solo números, espacios, guiones o +). Si no lo tenés, dejalo vacío.
                </p>
              )}

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

              {tmProfesionalId && tmFecha && (
                <div className="space-y-2">
                  <div className="rounded-xl bg-rf-cream border border-pink-100 p-2.5 text-[11px] text-rf-charcoal space-y-1">
                    <p className="font-bold text-rf-black">
                      Agenda de {profesionales.find((p) => p.id === tmProfesionalId)?.nombre} ese día
                    </p>
                    {tmTurnosDelDia.length === 0 ? (
                      <p>Libre todo el día.</p>
                    ) : (
                      tmTurnosDelDia.map((t) => (
                        <p key={t.id}>
                          {t.horaInicio}–{t.horaFin} · {getClientaNombre(t.clientaId)}
                        </p>
                      ))
                    )}
                  </div>

                  {tmFijosLibres.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-rf-charcoal">Horarios habituales libres:</span>
                      {tmFijosLibres.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setTmHora(h)}
                          className={`px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                            tmHora === h
                              ? 'bg-rf-rose-deep text-white border-rf-rose-deep'
                              : 'bg-white text-rf-black border-pink-200 hover:border-rf-rose'
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}

                  <AvisoHorario profesional={profesionales.find((p) => p.id === tmProfesionalId)} fecha={tmFecha} hora={tmHora} />
                  {tmBloqueada && (
                    <p className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-2.5 text-[11px] font-semibold">
                      ⚠️ Esa profesional tiene ese horario bloqueado. Se puede cargar igual.
                    </p>
                  )}
                  {tmMismoInicio && (
                    <p className="rounded-xl bg-red-50 border border-red-200 text-red-800 p-2.5 text-[11px] font-semibold">
                      ⛔ A las {tmMismoInicio.horaInicio} ya hay un turno de {getClientaNombre(tmMismoInicio.clientaId)} con esta
                      profesional. No se pueden cargar dos turnos que empiecen a la misma hora para la misma profesional:
                      elegí otra hora.
                    </p>
                  )}
                  {!tmMismoInicio && tmSolapados.length > 0 && (
                    <p className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-2.5 text-[11px] font-semibold">
                      ⚠️ Este turno se pisa con:{' '}
                      {tmSolapados.map((t) => `${getClientaNombre(t.clientaId)} (${t.horaInicio}–${t.horaFin})`).join(', ')}. Se
                      puede cargar igual, pero revisá que la profesional llegue.
                    </p>
                  )}
                </div>
              )}

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
                      ? 'Queda con "Seña pagada" y recibe los recordatorios normales (48h y 24h antes).'
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
                disabled={tmGuardando || !tmNombre.trim() || !tmProfesionalId || !tmServicioId || !tmFecha || !tmHora || !!tmMismoInicio || tmTelefonoInvalido}
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
