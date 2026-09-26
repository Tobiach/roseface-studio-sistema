// src/pages/admin/AdminClientasRecurrentes.tsx
// Vista propia del panel (25/9/2026) — antes era un widget adentro de
// Agenda. El link que se manda ya trae el nombre/teléfono de esa clienta
// puntual precargados (ver ?nombre=&telefono= en Reserva.tsx) y se manda
// con 1 click directo al WhatsApp de la clienta.
//
// Contactada/nota/silenciada (25/9/2026) viven en la tabla
// `clientas_recurrentes_estado` — si todavía no se corrió el SQL que la
// crea, esas 3 acciones simplemente no van a poder guardar (toast de
// error) pero el resto del panel funciona igual.
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase, supabaseEnabled } from '../../lib/supabase';
import { Turno, Clienta, Servicio, Profesional } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDateReadable } from '../../lib/formatters';
import { mensajeClientaRecurrente, buildWhatsAppUrlPara } from '../../lib/whatsapp';
import { Repeat, MessageCircle, Phone, EyeOff, Eye, CheckCircle2 } from 'lucide-react';

interface EstadoRecurrencia {
  clienta_id: string;
  servicio_id: string;
  turno_id_ancla: string | number | null;
  contactada: boolean;
  contactada_en: string | null;
  nota: string | null;
  silenciada: boolean;
}

const DIAS_ANTICIPACION_RECURRENCIA = 4;

export const AdminClientasRecurrentes: React.FC = () => {
  const { rolActivo, turnos, servicios, clientas, profesionales, showToast } = useApp();

  const [estados, setEstados] = useState<EstadoRecurrencia[]>([]);
  const [tablaDisponible, setTablaDisponible] = useState(true);
  const [profesionalFiltro, setProfesionalFiltro] = useState<string>('todas');
  const [verSilenciadas, setVerSilenciadas] = useState(false);
  const [notaAbierta, setNotaAbierta] = useState<string | null>(null); // key `${clientaId}|${servicioId}`
  const [notaBorrador, setNotaBorrador] = useState('');

  const cargarEstados = async () => {
    if (!supabaseEnabled || !supabase) return;
    const { data, error } = await supabase.from('clientas_recurrentes_estado').select('*');
    if (error) {
      setTablaDisponible(false);
      return;
    }
    setTablaDisponible(true);
    setEstados((data ?? []) as EstadoRecurrencia[]);
  };

  useEffect(() => {
    cargarEstados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vista exclusiva de Yosy — mismo criterio que Caja/VIP (el router
  // también la bloquea por URL directa, esto es el resguardo del componente).
  if (rolActivo === 'profesional') {
    return <Navigate to="/admin/agenda" replace />;
  }

  const claveEstado = (clientaId: string, servicioId: string) => `${clientaId}|${servicioId}`;

  const obtenerEstado = (clientaId: string, servicioId: string) =>
    estados.find((e) => e.clienta_id === clientaId && e.servicio_id === servicioId);

  const guardarEstado = async (
    clientaId: string,
    servicioId: string,
    cambios: Partial<Pick<EstadoRecurrencia, 'contactada' | 'contactada_en' | 'nota' | 'silenciada' | 'turno_id_ancla'>>
  ) => {
    if (!supabaseEnabled || !supabase) return;
    const previo = obtenerEstado(clientaId, servicioId);
    const nuevo: EstadoRecurrencia = {
      clienta_id: clientaId,
      servicio_id: servicioId,
      turno_id_ancla: previo?.turno_id_ancla ?? null,
      contactada: previo?.contactada ?? false,
      contactada_en: previo?.contactada_en ?? null,
      nota: previo?.nota ?? null,
      silenciada: previo?.silenciada ?? false,
      ...cambios,
    };
    const { error } = await supabase
      .from('clientas_recurrentes_estado')
      .upsert(nuevo, { onConflict: 'clienta_id,servicio_id' });
    if (error) {
      showToast('❌ No se pudo guardar — falta activar esto en la base (avisale a Tobias).');
      return;
    }
    setEstados((prev) => {
      const resto = prev.filter((e) => !(e.clienta_id === clientaId && e.servicio_id === servicioId));
      return [...resto, nuevo];
    });
  };

  // Clientas cuyo último turno completado de un servicio con ciclo
  // conocido (ej. retoque de pestañas ~21 días) está por cumplir ese
  // ciclo. Avisa ~4 días ANTES (no el día que ya se cumplió) para darle
  // tiempo a Yosy de escribirle y que la clienta pueda pagar la seña y
  // sacar turno antes de la fecha ideal.
  const listaBase = useMemo(() => {
    const hoy = new Date();
    const ultimoPorClientaYServicio = new Map<string, Turno>();
    for (const t of turnos) {
      if (t.estado !== 'completado') continue;
      const key = `${t.clientaId}|${t.servicioId}`;
      const actual = ultimoPorClientaYServicio.get(key);
      if (!actual || t.fecha > actual.fecha) ultimoPorClientaYServicio.set(key, t);
    }

    const resultados: {
      clienta: Clienta;
      servicio: Servicio;
      profesional?: Profesional;
      turno: Turno;
      diasParaElCiclo: number;
    }[] = [];
    for (const [, turno] of ultimoPorClientaYServicio) {
      const servicio = servicios.find((s) => s.id === turno.servicioId);
      if (!servicio?.cicloRecurrenciaDias) continue;
      const diasSinVisitar = Math.floor(
        (hoy.getTime() - new Date(`${turno.fecha}T12:00:00`).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diasSinVisitar < servicio.cicloRecurrenciaDias - DIAS_ANTICIPACION_RECURRENCIA) continue;
      const clienta = clientas.find((c) => c.id === turno.clientaId);
      if (!clienta) continue;
      resultados.push({
        clienta,
        servicio,
        profesional: profesionales.find((p) => p.id === turno.profesionalId),
        turno,
        diasParaElCiclo: servicio.cicloRecurrenciaDias - diasSinVisitar,
      });
    }
    return resultados.sort((a, b) => a.diasParaElCiclo - b.diasParaElCiclo);
  }, [turnos, servicios, clientas, profesionales]);

  const listaConEstado = listaBase.map((item) => {
    const estado = obtenerEstado(item.clienta.id, item.servicio.id);
    const silenciada = estado?.silenciada ?? false;
    // "Contactada" solo cuenta para EL ciclo actual — si volvió a reservar
    // desde la última vez que se la marcó, el turno ancla cambió y arranca
    // un ciclo nuevo (sin marcar), aunque el registro viejo siga en la base.
    const contactada =
      !!estado?.contactada &&
      estado?.turno_id_ancla != null &&
      String(estado.turno_id_ancla) === String(item.turno.id);
    return { ...item, estado, silenciada, contactada };
  });

  const listaVisible = listaConEstado
    .filter((item) => (verSilenciadas ? item.silenciada : !item.silenciada))
    .filter((item) => profesionalFiltro === 'todas' || item.profesional?.id === profesionalFiltro);

  // Stats: cuántas activas hay, cuántas se contactaron este mes (desde acá
  // o a mano) y cuántos turnos reales se generaron desde el link en el
  // mismo período — para una idea real de conversión, no solo un contador.
  const haceUnMes = new Date();
  haceUnMes.setDate(haceUnMes.getDate() - 30);
  const contactadasEsteMes = estados.filter(
    (e) => e.contactada_en && new Date(e.contactada_en) >= haceUnMes
  ).length;
  const reservadasDesdeElLink = turnos.filter(
    (t) =>
      t.notasInternas?.includes('vino del link de Clientas Recurrentes') &&
      new Date(t.fechaCreacion) >= haceUnMes
  ).length;

  const enviarPorWhatsApp = async (clienta: Clienta, servicio: Servicio, profesional: Profesional | undefined, turno: Turno) => {
    if (!profesional) {
      showToast('❌ Esta clienta no tiene una profesional habitual asignada.');
      return;
    }
    const params = new URLSearchParams({
      profesionalId: profesional.id,
      nombre: clienta.nombre,
      telefono: clienta.telefono,
      origen: 'recurrencia',
    });
    const link = `${window.location.origin}/reserva?${params.toString()}`;
    const mensaje = mensajeClientaRecurrente({ nombreClienta: clienta.nombre, servicio: servicio.nombre, link });
    window.open(buildWhatsAppUrlPara(clienta.telefono, mensaje), '_blank');
    // Mandar el link también cuenta como "ya la contacté".
    await guardarEstado(clienta.id, servicio.id, {
      contactada: true,
      contactada_en: new Date().toISOString(),
      turno_id_ancla: turno.id,
    });
  };

  return (
    <div className="space-y-6 font-admin">
      <div className="pb-4 border-b border-pink-100">
        <div className="flex items-center gap-2">
          <Badge variant="gold">Recurrencia</Badge>
          <span className="text-xs text-rf-charcoal font-medium">Control.Evo Engine</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-rf-black mt-1">
          Clientas Recurrentes
        </h1>
        <p className="text-xs text-rf-charcoal mt-1 max-w-xl">
          Clientas que ya deberían estar volviendo (retoque de pestañas, uñas, depilación, etc.) —
          avisa unos días antes de que se cumpla el ciclo para que te dé tiempo de escribirles.
        </p>
      </div>

      {!tablaDisponible && (
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Marcar "contactada", dejar notas y silenciar todavía no está activado en la base — el
          resto del panel funciona igual mientras tanto.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="space-y-1">
          <span className="text-xs text-rf-charcoal font-semibold">Clientas activas ahora</span>
          <p className="text-2xl font-bold text-rf-black">{listaConEstado.filter((i) => !i.silenciada).length}</p>
        </Card>
        <Card className="space-y-1">
          <span className="text-xs text-rf-charcoal font-semibold">Contactadas (últimos 30 días)</span>
          <p className="text-2xl font-bold text-rf-black">{contactadasEsteMes}</p>
        </Card>
        <Card className="space-y-1">
          <span className="text-xs text-rf-charcoal font-semibold">Reservaron desde el link (30 días)</span>
          <p className="text-2xl font-bold text-emerald-700">
            {reservadasDesdeElLink}
            {contactadasEsteMes > 0 && (
              <span className="text-xs font-normal text-rf-charcoal ml-1.5">
                ({Math.round((reservadasDesdeElLink / contactadasEsteMes) * 100)}% de conversión)
              </span>
            )}
          </p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={profesionalFiltro}
          onChange={(e) => setProfesionalFiltro(e.target.value)}
          className="text-xs font-semibold px-3 py-2 rounded-xl border border-pink-200 bg-white text-rf-black focus:outline-none focus:ring-2 focus:ring-rf-rose-deep"
        >
          <option value="todas">Todas las profesionales</option>
          {profesionales.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <button
          onClick={() => setVerSilenciadas((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
            verSilenciadas
              ? 'bg-rf-rose-deep text-white border-rf-rose-deep'
              : 'bg-white text-rf-charcoal border-pink-200 hover:border-rf-rose'
          }`}
        >
          {verSilenciadas ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{verSilenciadas ? 'Viendo silenciadas' : 'Ver silenciadas'}</span>
        </button>
      </div>

      {listaVisible.length === 0 ? (
        <Card className="text-center py-10 space-y-2">
          <Repeat className="w-8 h-8 text-rf-rose-deep mx-auto" />
          <p className="text-sm text-rf-charcoal">
            {verSilenciadas
              ? 'No tenés ninguna clienta silenciada.'
              : 'Por ahora no hay ninguna clienta por avisar. Van a ir apareciendo acá a medida que se acerque la fecha de su próximo retoque.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listaVisible.map(({ clienta, servicio, profesional, turno, diasParaElCiclo, contactada, estado }) => {
            const key = claveEstado(clienta.id, servicio.id);
            return (
              <Card key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-base text-rf-black">{clienta.nombre}</span>
                  <Badge variant={diasParaElCiclo < 0 ? 'danger' : 'warning'} size="sm">
                    {diasParaElCiclo >= 0 ? `Faltan ${diasParaElCiclo} días` : `Atrasada ${Math.abs(diasParaElCiclo)} días`}
                  </Badge>
                </div>
                <p className="text-xs text-rf-charcoal">
                  {servicio.nombre} con {profesional?.nombre ?? 'su profesional habitual'}
                </p>
                <p className="text-[11px] text-gray-400">
                  Última vez: {formatDateReadable(turno.fecha)}
                </p>
                <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" />
                  {clienta.telefono}
                </p>

                {contactada && (
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ya la contactaste para este ciclo
                  </p>
                )}

                {notaAbierta === key ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={notaBorrador}
                      onChange={(e) => setNotaBorrador(e.target.value)}
                      placeholder="Ej: la llamé, dijo que viene la semana que viene"
                      rows={2}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-rf-rose-deep"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await guardarEstado(clienta.id, servicio.id, { nota: notaBorrador });
                          setNotaAbierta(null);
                          showToast('📝 Nota guardada');
                        }}
                        className="text-[11px] font-bold text-white bg-rf-rose-deep px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setNotaAbierta(null)}
                        className="text-[11px] font-semibold text-rf-charcoal px-3 py-1.5 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNotaBorrador(estado?.nota ?? '');
                      setNotaAbierta(key);
                    }}
                    className="text-[11px] text-sky-700 font-semibold hover:underline cursor-pointer text-left"
                  >
                    {estado?.nota ? `📝 "${estado.nota}"` : '+ Agregar nota (ej. ya le escribí por fuera)'}
                  </button>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => enviarPorWhatsApp(clienta, servicio, profesional, turno)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() =>
                      guardarEstado(clienta.id, servicio.id, { silenciada: !verSilenciadas }).then(() =>
                        showToast(verSilenciadas ? '🔔 Clienta reactivada' : '🔕 Clienta silenciada')
                      )
                    }
                    title={verSilenciadas ? 'Reactivar' : 'Silenciar'}
                    className="p-2 rounded-xl border border-pink-200 text-rf-charcoal hover:border-rf-rose-deep hover:text-rf-rose-deep transition-colors cursor-pointer"
                  >
                    {verSilenciadas ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
