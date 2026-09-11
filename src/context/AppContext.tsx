// src/context/AppContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  RolUsuario,
  Turno,
  Clienta,
  Profesional,
  Servicio,
  BeneficioVIP,
  ClientaEnRiesgo,
  EstadoTurno,
  BloqueoHorario,
  RecordatorioConfig,
} from '../types';
import { mockTurnos } from '../data/mockTurnos';
import { mockClientas } from '../data/mockClientas';
import { mockProfesionales } from '../data/mockProfesionales';
import { mockServicios } from '../data/mockServicios';
import { mockBeneficiosVIP, mockClientasEnRiesgo } from '../data/mockFidelizacion';
import { supabase, supabaseEnabled } from '../lib/supabase';
import {
  turnoFromRow,
  turnoToInsertRow,
  clientaFromRow,
  clientaToInsertRow,
  profesionalOperativoFromRow,
  servicioFromRow,
  bloqueoFromRow,
  bloqueoToInsertRow,
  recordatorioFromRow,
  horarioToRow,
} from '../lib/supabaseMappers';
import type { DisponibilidadSemanal } from '../types';

interface AppContextType {
  rolActivo: RolUsuario;
  setRolActivo: (rol: RolUsuario) => void;
  profesionalActivoId: string | null;
  setProfesionalActivoId: (id: string | null) => void;
  turnos: Turno[];
  clientas: Clienta[];
  profesionales: Profesional[];
  servicios: Servicio[];
  bloqueos: BloqueoHorario[];
  recordatoriosConfig: RecordatorioConfig[];
  beneficiosVIP: BeneficioVIP[];
  clientasEnRiesgo: ClientaEnRiesgo[];
  toastMessage: string | null;
  showToast: (msg: string) => void;
  crearTurno: (data: Omit<Turno, 'id' | 'fechaCreacion'>) => Promise<Turno>;
  actualizarEstadoTurno: (id: string, nuevoEstado: EstadoTurno, notasInternas?: string) => Promise<void>;
  reprogramarTurno: (id: string, fecha: string, horaInicio: string, horaFin: string) => Promise<void>;
  subirComprobante: (turnoId: string, file: File) => Promise<void>;
  aprobarComprobante: (turnoId: string) => Promise<void>;
  crearBloqueo: (data: Omit<BloqueoHorario, 'id'>) => Promise<void>;
  eliminarBloqueo: (id: string) => Promise<void>;
  toggleRecordatorio: (turnoId: string, plantilla: '48h' | '24h' | '4h', activar: boolean) => Promise<void>;
  guardarHorario: (
    profesionalId: string,
    horarioDisponible: DisponibilidadSemanal,
    horariosFijos: { [dia: string]: string[] | null }
  ) => Promise<void>;
  buscarOCrearClienta: (nombre: string, telefono: string, email?: string) => Promise<string>;
  activarFlujoRecuperacion: (clientaId: string) => void;
  canjearBeneficio: (clientaId: string, beneficio: BeneficioVIP) => boolean;
  // Gate por PIN (parche liviano, no es login real) para entrar como Yosy
  // o como una profesional puntual.
  pinModalRol: 'admin' | 'profesional' | null;
  abrirPinModal: (rol: 'admin' | 'profesional') => void;
  cerrarPinModal: () => void;
  verificarPin: (pin: string) => Promise<boolean>;
  cambiarUsuario: () => void;
}

const CLAVE_ACCESO = 'roseface_acceso';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Se lee una sola vez, de forma síncrona, ANTES del primer render — si esto
// viviera en un useEffect, AdminLayout alcanzaría a redirigir a "/" en el
// primer render (rolActivo todavía 'clienta') antes de que el efecto
// restaure el acceso guardado, rompiendo el bookmark directo a /admin.
function leerAccesoGuardado(): { rol: RolUsuario; profesionalId: string | null } {
  try {
    const raw = localStorage.getItem(CLAVE_ACCESO);
    if (!raw) return { rol: 'clienta', profesionalId: null };
    const guardado = JSON.parse(raw) as { rol?: RolUsuario; profesionalId?: string };
    return { rol: guardado.rol ?? 'clienta', profesionalId: guardado.profesionalId ?? null };
  } catch {
    return { rol: 'clienta', profesionalId: null };
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accesoInicial] = useState(leerAccesoGuardado);
  const [rolActivo, setRolActivo] = useState<RolUsuario>(accesoInicial.rol);
  const [profesionalActivoId, setProfesionalActivoId] = useState<string | null>(accesoInicial.profesionalId);
  // Arranca con los mocks (dev sin Supabase configurado, o mientras carga el
  // fetch real) y se reemplaza por datos reales apenas responde Supabase.
  const [turnos, setTurnos] = useState<Turno[]>(mockTurnos);
  const [clientas, setClientas] = useState<Clienta[]>(mockClientas);
  const [profesionales, setProfesionales] = useState<Profesional[]>(mockProfesionales);
  const [servicios, setServicios] = useState<Servicio[]>(mockServicios);
  const [bloqueos, setBloqueos] = useState<BloqueoHorario[]>([]);
  const [recordatoriosConfig, setRecordatoriosConfig] = useState<RecordatorioConfig[]>([]);
  const [beneficiosVIP] = useState<BeneficioVIP[]>(mockBeneficiosVIP);
  const [clientasEnRiesgo, setClientasEnRiesgo] = useState<ClientaEnRiesgo[]>(mockClientasEnRiesgo);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pinModalRol, setPinModalRol] = useState<'admin' | 'profesional' | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const abrirPinModal = (rol: 'admin' | 'profesional') => setPinModalRol(rol);
  const cerrarPinModal = () => setPinModalRol(null);

  const verificarPin = async (pin: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/verificar-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (!data.ok) return false;

      setRolActivo(data.rol);
      if (data.profesionalId) setProfesionalActivoId(data.profesionalId);
      try {
        localStorage.setItem(
          CLAVE_ACCESO,
          JSON.stringify({ rol: data.rol, profesionalId: data.profesionalId ?? undefined })
        );
      } catch {
        // no crítico si no se puede persistir
      }
      setPinModalRol(null);
      showToast(data.nombre ? `Bienvenida, ${data.nombre} 👋` : '✓ Acceso concedido');
      return true;
    } catch {
      return false;
    }
  };

  // Único modo de pasar a OTRA profesional/admin en el mismo dispositivo:
  // limpia el acceso guardado y vuelve a pedir PIN — así nadie cambia de
  // identidad sin el código de la otra persona.
  const cambiarUsuario = () => {
    setRolActivo('clienta');
    setProfesionalActivoId(null);
    try {
      localStorage.removeItem(CLAVE_ACCESO);
    } catch {
      // no crítico
    }
  };

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;
    let cancelado = false;

    (async () => {
      // Limpieza best-effort de holds vencidos (clienta abandonó el checkout
      // de MP hace más de 15 min): sin esto, un turno 'reservado' con hold
      // expirado seguiría apareciendo en los paneles de admin como si
      // siguiera esperando pago, hasta que alguien intente reservar
      // exactamente ese mismo horario (que es donde crear-preferencia.ts sí
      // lo flipea). No afecta la agenda demo sembrada: esos turnos nunca
      // tienen expira_en seteado.
      await supabase
        .from('turnos')
        .update({ estado: 'cancelado', notas_internas: 'Cancelado automáticamente: hold de 15 min vencido sin confirmar el pago.' })
        .eq('estado', 'reservado')
        .not('expira_en', 'is', null)
        .lt('expira_en', new Date().toISOString());

      const [turnosRes, clientasRes, serviciosRes, profesionalesRes, bloqueosRes, recordatoriosRes] = await Promise.all([
        supabase.from('turnos').select('*').order('fecha_creacion', { ascending: false }),
        supabase.from('clientas').select('*'),
        supabase.from('servicios').select('*'),
        supabase.from('profesionales').select('*'),
        supabase.from('bloqueos_horario').select('*').order('fecha', { ascending: true }),
        supabase.from('recordatorios_config').select('*'),
      ]);
      if (cancelado) return;

      if (turnosRes.data) setTurnos(turnosRes.data.map(turnoFromRow));
      if (clientasRes.data) setClientas(clientasRes.data.map(clientaFromRow));
      if (bloqueosRes.data) setBloqueos(bloqueosRes.data.map(bloqueoFromRow));
      if (recordatoriosRes.data) setRecordatoriosConfig(recordatoriosRes.data.map(recordatorioFromRow));
      if (serviciosRes.data && serviciosRes.data.length > 0) {
        setServicios(serviciosRes.data.map(servicioFromRow));
      }
      if (profesionalesRes.data && profesionalesRes.data.length > 0) {
        const operativoPorId = new Map(
          profesionalesRes.data.map((row) => [row.id, profesionalOperativoFromRow(row)])
        );
        setProfesionales((prev) =>
          prev.map((p) => {
            const operativo = operativoPorId.get(p.id);
            return operativo
              ? {
                  ...p,
                  modeloComision: operativo.modeloComision,
                  horarioDisponible: operativo.horarioDisponible,
                  horariosFijos: operativo.horariosFijos,
                  aliasCbu: operativo.aliasCbu,
                  videoUrl: operativo.videoUrl,
                  linkAutoagenda: operativo.linkAutoagenda,
                }
              : p;
          })
        );
      }
    })();

    // Refresco periódico de lo que cambia durante la operación (turnos,
    // clientas, recordatorios, bloqueos) — así cuando una clienta reserva y
    // paga, aparece en los paneles sin que nadie recargue la página. Solo
    // corre con la pestaña visible para no gastar de gusto.
    const refrescar = async () => {
      if (document.hidden || !supabase) return;
      const [t, c, r, b] = await Promise.all([
        supabase.from('turnos').select('*').order('fecha_creacion', { ascending: false }),
        supabase.from('clientas').select('*'),
        supabase.from('recordatorios_config').select('*'),
        supabase.from('bloqueos_horario').select('*'),
      ]);
      if (cancelado) return;
      if (t.data) setTurnos(t.data.map(turnoFromRow));
      if (c.data) setClientas(c.data.map(clientaFromRow));
      if (r.data) setRecordatoriosConfig(r.data.map(recordatorioFromRow));
      if (b.data) setBloqueos(b.data.map(bloqueoFromRow));
    };
    const intervalo = setInterval(refrescar, 45000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, []);

  const crearTurno = async (data: Omit<Turno, 'id' | 'fechaCreacion'>): Promise<Turno> => {
    if (supabaseEnabled && supabase) {
      const { data: row, error } = await supabase
        .from('turnos')
        .insert(turnoToInsertRow(data))
        .select()
        .single();

      if (error || !row) {
        showToast('❌ No se pudo registrar la reserva. Probá de nuevo.');
        throw error ?? new Error('Insert de turno sin datos');
      }

      const nuevoTurno = turnoFromRow(row);
      setTurnos((prev) => [nuevoTurno, ...prev]);
      showToast(`✨ Turno reservado con éxito para el ${nuevoTurno.fecha}`);
      return nuevoTurno;
    }

    const nuevoTurno: Turno = {
      ...data,
      id: `tur-${Date.now()}`,
      fechaCreacion: new Date().toISOString(),
    };
    setTurnos((prev) => [nuevoTurno, ...prev]);
    showToast(`✨ Turno reservado con éxito para el ${nuevoTurno.fecha}`);
    return nuevoTurno;
  };

  const actualizarEstadoTurno = async (id: string, nuevoEstado: EstadoTurno, notasInternas?: string) => {
    if (supabaseEnabled && supabase) {
      const patch: Record<string, unknown> = { estado: nuevoEstado };
      if (notasInternas !== undefined) patch.notas_internas = notasInternas;

      const { error } = await supabase.from('turnos').update(patch).eq('id', id);
      if (error) {
        showToast('❌ No se pudo actualizar el turno.');
        return;
      }
    }

    setTurnos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, estado: nuevoEstado, notasInternas: notasInternas !== undefined ? notasInternas : t.notasInternas }
          : t
      )
    );
    showToast(`Estado de turno actualizado a: ${nuevoEstado.replace('_', ' ')}`);
  };

  // Mover un turno a otra fecha/hora sin perder la seña ni el estado.
  const reprogramarTurno = async (id: string, fecha: string, horaInicio: string, horaFin: string) => {
    if (supabaseEnabled && supabase) {
      const { error } = await supabase
        .from('turnos')
        .update({ fecha, hora_inicio: horaInicio, hora_fin: horaFin })
        .eq('id', id);
      if (error) {
        showToast('❌ No se pudo reprogramar el turno.');
        return;
      }
    }
    setTurnos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, fecha, horaInicio, horaFin } : t))
    );
    showToast('✓ Turno reprogramado');
  };

  // Circuito de transferencia (Fase 5): la clienta sube su comprobante
  // directo a Supabase Storage y lo asocia al turno — todavía no confirma
  // el turno, eso lo hace la profesional al aprobarlo.
  const subirComprobante = async (turnoId: string, file: File): Promise<void> => {
    if (!supabaseEnabled || !supabase) {
      showToast('📎 Comprobante recibido (modo demo, no se guardó el archivo).');
      return;
    }

    const path = `${turnoId}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, file);
    if (uploadError) {
      showToast('❌ No se pudo subir el comprobante. Probá de nuevo.');
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage.from('comprobantes').getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('turnos')
      .update({ comprobante_transferencia_url: publicUrlData.publicUrl })
      .eq('id', turnoId);

    if (updateError) {
      showToast('❌ No se pudo guardar el comprobante en el turno.');
      throw updateError;
    }

    setTurnos((prev) =>
      prev.map((t) => (t.id === turnoId ? { ...t, comprobanteTransferenciaUrl: publicUrlData.publicUrl } : t))
    );
    showToast('📎 Comprobante enviado — la profesional lo va a revisar.');
  };

  // La profesional (nunca Yosy) aprueba el comprobante y recién ahí el
  // turno pasa a confirmado — mismo efecto que el webhook de MP, pero
  // disparado a mano.
  const aprobarComprobante = async (turnoId: string): Promise<void> => {
    if (supabaseEnabled && supabase) {
      const { error } = await supabase
        .from('turnos')
        .update({ estado: 'sena_confirmada', aprobado_por_profesional: true })
        .eq('id', turnoId);
      if (error) {
        showToast('❌ No se pudo aprobar el comprobante.');
        return;
      }
    }

    setTurnos((prev) =>
      prev.map((t) => (t.id === turnoId ? { ...t, estado: 'sena_confirmada', aprobadoPorProfesional: true } : t))
    );
    showToast('✅ Comprobante aprobado — turno confirmado.');
  };

  // Auto-edición de horario: la profesional (o Yosy) cambia sus días y sus
  // horarios fijos desde el panel. Se persiste en el jsonb horario_disponible.
  const guardarHorario = async (
    profesionalId: string,
    horarioDisponible: DisponibilidadSemanal,
    horariosFijos: { [dia: string]: string[] | null }
  ): Promise<void> => {
    if (supabaseEnabled && supabase) {
      const { error } = await supabase
        .from('profesionales')
        .update({ horario_disponible: horarioToRow(horarioDisponible, horariosFijos) })
        .eq('id', profesionalId);
      if (error) {
        showToast('❌ No se pudo guardar el horario.');
        return;
      }
    }
    setProfesionales((prev) =>
      prev.map((p) => (p.id === profesionalId ? { ...p, horarioDisponible, horariosFijos } : p))
    );
    showToast('✓ Horario guardado');
  };

  // Bloqueo manual de horario (Fase 6): Yosy bloquea para cualquiera, cada
  // profesional solo para sí misma — esa restricción se aplica en la UI
  // (AdminAgenda), acá solo se persiste.
  const crearBloqueo = async (data: Omit<BloqueoHorario, 'id'>): Promise<void> => {
    if (supabaseEnabled && supabase) {
      const { data: row, error } = await supabase
        .from('bloqueos_horario')
        .insert(bloqueoToInsertRow(data))
        .select()
        .single();

      if (error || !row) {
        showToast('❌ No se pudo crear el bloqueo.');
        return;
      }
      setBloqueos((prev) => [...prev, bloqueoFromRow(row)]);
    } else {
      setBloqueos((prev) => [...prev, { ...data, id: `bloq-${Date.now()}` }]);
    }
    showToast('🚫 Horario bloqueado');
  };

  const eliminarBloqueo = async (id: string): Promise<void> => {
    if (supabaseEnabled && supabase) {
      const { error } = await supabase.from('bloqueos_horario').delete().eq('id', id);
      if (error) {
        showToast('❌ No se pudo quitar el bloqueo.');
        return;
      }
    }
    setBloqueos((prev) => prev.filter((b) => b.id !== id));
    showToast('Bloqueo eliminado');
  };

  // Recordatorios por turno (Fase 7) — Yosy activa cada plantilla
  // individualmente, no hay un selector global. Sigue sin mandar WhatsApp
  // real, solo queda registrado.
  const toggleRecordatorio = async (
    turnoId: string,
    plantilla: '48h' | '24h' | '4h',
    activar: boolean
  ): Promise<void> => {
    const activadoEn = activar ? new Date().toISOString() : null;

    if (supabaseEnabled && supabase) {
      const { error } = await supabase
        .from('recordatorios_config')
        .upsert(
          { turno_id: turnoId, plantilla, activado: activar, activado_en: activadoEn },
          { onConflict: 'turno_id,plantilla' }
        );
      if (error) {
        showToast('❌ No se pudo actualizar el recordatorio.');
        return;
      }
    }

    setRecordatoriosConfig((prev) => {
      const existe = prev.some((r) => r.turnoId === turnoId && r.plantilla === plantilla);
      if (existe) {
        return prev.map((r) =>
          r.turnoId === turnoId && r.plantilla === plantilla ? { ...r, activado: activar, activadoEn } : r
        );
      }
      return [...prev, { turnoId, plantilla, activado: activar, activadoEn }];
    });
    showToast(activar ? `✓ Recordatorio ${plantilla} activado` : `Recordatorio ${plantilla} desactivado`);
  };

  // Busca una clienta por nombre entre las ya cargadas; si no existe, la crea
  // en Supabase. Antes de esto, una reserva de alguien nuevo se anotaba
  // siempre bajo la clienta demo 'cli-01' — con persistencia real hay que
  // dar de alta a la clienta de verdad.
  const buscarOCrearClienta = async (nombre: string, telefono: string, email?: string): Promise<string> => {
    const existente = clientas.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (existente) return existente.id;

    if (supabaseEnabled && supabase) {
      const nuevaClienta: Omit<Clienta, 'historialTurnos'> = {
        id: `cli-${Date.now()}`,
        nombre,
        telefono,
        email: email || undefined,
        fechaRegistro: new Date().toISOString().slice(0, 10),
        esVIP: false,
        nivelVIP: 'Clienta',
        puntosAcumulados: 0,
      };
      const { data: row, error } = await supabase
        .from('clientas')
        .insert(clientaToInsertRow(nuevaClienta))
        .select()
        .single();

      if (!error && row) {
        const clienta = clientaFromRow(row);
        setClientas((prev) => [clienta, ...prev]);
        return clienta.id;
      }
    }

    return 'cli-01';
  };

  const activarFlujoRecuperacion = (clientaId: string) => {
    setClientasEnRiesgo((prev) =>
      prev.map((c) =>
        c.clientaId === clientaId ? { ...c, flujoRecuperacionActivado: true } : c
      )
    );
    showToast('✉️ Mensaje de recuperación de clienta enviado automáticamente');
  };

  const canjearBeneficio = (clientaId: string, beneficio: BeneficioVIP): boolean => {
    const clienta = clientas.find((c) => c.id === clientaId);
    if (!clienta) return false;

    if (clienta.puntosAcumulados < beneficio.puntosNecesarios) {
      showToast('❌ Puntos insuficientes para este canje');
      return false;
    }

    setClientas((prev) =>
      prev.map((c) =>
        c.id === clientaId
          ? { ...c, puntosAcumulados: c.puntosAcumulados - beneficio.puntosNecesarios }
          : c
      )
    );
    showToast(`🎉 ¡Beneficio "${beneficio.nombre}" canjeado con éxito!`);
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        rolActivo,
        setRolActivo,
        profesionalActivoId,
        setProfesionalActivoId,
        turnos,
        clientas,
        profesionales,
        servicios,
        bloqueos,
        recordatoriosConfig,
        beneficiosVIP,
        clientasEnRiesgo,
        toastMessage,
        showToast,
        crearTurno,
        actualizarEstadoTurno,
        reprogramarTurno,
        subirComprobante,
        aprobarComprobante,
        crearBloqueo,
        eliminarBloqueo,
        toggleRecordatorio,
        guardarHorario,
        buscarOCrearClienta,
        activarFlujoRecuperacion,
        canjearBeneficio,
        pinModalRol,
        abrirPinModal,
        cerrarPinModal,
        verificarPin,
        cambiarUsuario,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
};
