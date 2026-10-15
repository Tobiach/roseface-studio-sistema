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
  ServicioExtra,
  BloqueoHorario,
  RecordatorioConfig,
  PlantillaRecordatorio,
} from '../types';
import { mockTurnos } from '../data/mockTurnos';
import { mockClientas } from '../data/mockClientas';
import { mockProfesionales } from '../data/mockProfesionales';
import { mockServicios } from '../data/mockServicios';
import { mockBeneficiosVIP, mockClientasEnRiesgo } from '../data/mockFidelizacion';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { ordenarServicios } from '../lib/ordenServicios';
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
  registrarTurnoLocal: (turno: Turno) => void;
  actualizarEstadoTurno: (id: string, nuevoEstado: EstadoTurno, notasInternas?: string) => Promise<void>;
  // Confirma que la clienta vino (o corrige el desglose de un turno ya completado)
  // con los servicios extra hechos presencialmente. Devuelve true si se guardó.
  guardarServiciosTurno: (id: string, extras: ServicioExtra[], nuevoEstado?: EstadoTurno) => Promise<boolean>;
  // Registra (o deshace) que se abonó la seña de un turno cargado a mano. Exige
  // PIN reciente (token de sesión); devuelve true si se guardó.
  marcarSenaManual: (id: string, abonada: boolean) => Promise<boolean>;
  // true si hay una sesión con token vigente (o no hay base real, donde no hace falta).
  sesionConToken: boolean;
  reprogramarTurno: (id: string, fecha: string, horaInicio: string, horaFin: string) => Promise<void>;
  subirComprobante: (turnoId: string, file: File) => Promise<void>;
  aprobarComprobante: (turnoId: string) => Promise<void>;
  crearBloqueo: (data: Omit<BloqueoHorario, 'id'>) => Promise<void>;
  eliminarBloqueo: (id: string) => Promise<void>;
  toggleRecordatorio: (turnoId: string, plantilla: PlantillaRecordatorio, activar: boolean) => Promise<void>;
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
function leerAccesoGuardado(): { rol: RolUsuario; profesionalId: string | null; token: string | null } {
  try {
    const raw = localStorage.getItem(CLAVE_ACCESO);
    if (!raw) return { rol: 'clienta', profesionalId: null, token: null };
    const guardado = JSON.parse(raw) as { rol?: RolUsuario; profesionalId?: string; token?: string };
    return { rol: guardado.rol ?? 'clienta', profesionalId: guardado.profesionalId ?? null, token: guardado.token ?? null };
  } catch {
    return { rol: 'clienta', profesionalId: null, token: null };
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accesoInicial] = useState(leerAccesoGuardado);
  const [rolActivo, setRolActivo] = useState<RolUsuario>(accesoInicial.rol);
  const [profesionalActivoId, setProfesionalActivoId] = useState<string | null>(accesoInicial.profesionalId);
  // Token firmado que entrega /api/verificar-pin (vale 12 hs). Las sesiones
  // iniciadas antes de que existiera no lo tienen: hay que volver a ingresar el PIN.
  const [sesionToken, setSesionToken] = useState<string | null>(accesoInicial.token);
  // Arranca con los mocks (dev sin Supabase configurado, o mientras carga el
  // fetch real) y se reemplaza por datos reales apenas responde Supabase.
  const [turnos, setTurnos] = useState<Turno[]>(mockTurnos);
  const [clientas, setClientas] = useState<Clienta[]>(mockClientas);
  // Las profesionales con `activa: false` (ya no trabajan en el estudio)
  // nunca entran al estado: así no aparecen en ninguna lista, selector,
  // liquidación ni perfil de la app, sin tener que filtrar pantalla por pantalla.
  const [profesionales, setProfesionales] = useState<Profesional[]>(
    mockProfesionales.filter((p) => p.activa !== false)
  );
  const [servicios, setServicios] = useState<Servicio[]>(ordenarServicios(mockServicios));
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
      setSesionToken(data.token ?? null);
      try {
        localStorage.setItem(
          CLAVE_ACCESO,
          JSON.stringify({ rol: data.rol, profesionalId: data.profesionalId ?? undefined, token: data.token ?? undefined })
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
    setSesionToken(null);
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
        setServicios(ordenarServicios(serviciosRes.data.map(servicioFromRow)));
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

  // Para el turno que ya creó el SERVIDOR en /api/mercadopago/crear-preferencia
  // (circuito transferencia): la SPA no vuelve a insertarlo, solo lo suma acá
  // para que calcularHorariosDisponibles() lo vea ocupado de inmediato si la
  // misma clienta vuelve a "Reservar Turno" en la misma sesión, sin esperar a
  // un refetch completo (que solo pasa al recargar la página).
  const registrarTurnoLocal = (turno: Turno) => {
    setTurnos((prev) => [turno, ...prev]);
  };

  // Migrado a /api/actualizar-estado-turno.ts (26/9/2026,
  // docs/SEGURIDAD_PENDIENTE.md prioridad 3) — antes era un UPDATE directo con
  // el anon key, que cualquiera podía llamar para marcar cualquier turno
  // como completado/cancelado/con la seña confirmada.
  const actualizarEstadoTurno = async (id: string, nuevoEstado: EstadoTurno, notasInternas?: string) => {
    if (supabaseEnabled && supabase) {
      try {
        const resp = await fetch('/api/actualizar-estado-turno', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turnoId: id, nuevoEstado, notasInternas }),
        });
        const data = (await resp.json().catch(() => ({}))) as { ok?: boolean };
        if (!resp.ok || !data.ok) {
          showToast('❌ No se pudo actualizar el turno.');
          return;
        }
      } catch {
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

  // Servicios extra hechos en el momento (ver ServicioExtra en types). El
  // total lo calcula el servidor (api/actualizar-estado-turno.ts) y vuelve en
  // la respuesta — así lo que se ve en pantalla es lo mismo que quedó guardado
  // y que usan Comisiones y Caja (todo lee Turno.montoTotal).
  const guardarServiciosTurno = async (
    id: string,
    extras: ServicioExtra[],
    nuevoEstado?: EstadoTurno
  ): Promise<boolean> => {
    let montoTotal: number | undefined;
    let extrasGuardados = extras;

    if (supabaseEnabled && supabase) {
      try {
        const resp = await fetch('/api/actualizar-estado-turno', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turnoId: id, nuevoEstado, serviciosExtra: extras }),
        });
        const data = (await resp.json().catch(() => ({}))) as {
          ok?: boolean;
          montoTotal?: number;
          serviciosExtra?: ServicioExtra[];
        };
        if (!resp.ok || !data.ok) {
          showToast('❌ No se pudieron guardar los servicios del turno.');
          return false;
        }
        montoTotal = data.montoTotal;
        extrasGuardados = data.serviciosExtra ?? extras;
      } catch {
        showToast('❌ No se pudieron guardar los servicios del turno.');
        return false;
      }
    }

    setTurnos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        // Sin servidor (demo local) el total se recalcula acá con la misma regla.
        const sumaPrevia = (t.serviciosExtra ?? []).reduce((a, e) => a + e.precio, 0);
        const sumaNueva = extrasGuardados.reduce((a, e) => a + e.precio, 0);
        return {
          ...t,
          estado: nuevoEstado ?? t.estado,
          serviciosExtra: extrasGuardados,
          montoTotal: montoTotal ?? t.montoTotal - sumaPrevia + sumaNueva,
        };
      })
    );
    showToast(nuevoEstado === 'completado' ? '✓ Turno completado y servicios registrados' : '✓ Servicios del turno actualizados');
    return true;
  };

  const marcarSenaManual = async (id: string, abonada: boolean): Promise<boolean> => {
    if (supabaseEnabled && supabase) {
      const pedirPinDeNuevo = () => {
        showToast('🔑 Para registrar la seña volvé a ingresar tu PIN (la sesión venció).');
        setSesionToken(null);
        abrirPinModal(rolActivo === 'admin' ? 'admin' : 'profesional');
      };
      if (!sesionToken) {
        pedirPinDeNuevo();
        return false;
      }
      try {
        const resp = await fetch('/api/marcar-sena-manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesionToken}` },
          body: JSON.stringify({ turnoId: id, abonada }),
        });
        if (resp.status === 401) {
          pedirPinDeNuevo();
          return false;
        }
        const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!resp.ok || !data.ok) {
          showToast(`❌ ${data.error ?? 'No se pudo registrar la seña.'}`);
          return false;
        }
      } catch {
        showToast('❌ No se pudo registrar la seña.');
        return false;
      }
    }

    setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, aprobadoPorProfesional: abonada } : t)));
    showToast(abonada ? '✓ Seña registrada como pagada' : 'Seña marcada como pendiente');
    return true;
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
  // el turno, eso lo hace la profesional al aprobarlo. El UPDATE en
  // `turnos` migrado a /api/guardar-comprobante.ts (26/9/2026,
  // docs/SEGURIDAD_PENDIENTE.md prioridad 2): el upload en sí sigue siendo del
  // cliente (bucket con sus propias políticas), pero pisar el campo en la
  // tabla ya no lo puede hacer cualquiera con el anon key.
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

    const resp = await fetch('/api/guardar-comprobante', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnoId, url: publicUrlData.publicUrl }),
    });
    const data = (await resp.json().catch(() => ({}))) as { ok?: boolean };
    if (!resp.ok || !data.ok) {
      showToast('❌ No se pudo guardar el comprobante en el turno.');
      throw new Error('No se pudo guardar el comprobante en el turno');
    }

    setTurnos((prev) =>
      prev.map((t) => (t.id === turnoId ? { ...t, comprobanteTransferenciaUrl: publicUrlData.publicUrl } : t))
    );
    showToast('📎 Comprobante enviado — la profesional lo va a revisar.');
  };

  // La profesional (nunca Yosy) aprueba el comprobante y recién ahí el
  // turno pasa a confirmado — mismo efecto que el webhook de MP, pero
  // disparado a mano. Escritura migrada a /api/aprobar-comprobante.ts
  // (26/9/2026, docs/SEGURIDAD_PENDIENTE.md): antes era un UPDATE directo con el
  // anon key, que cualquiera podía llamar sin pasar por la profesional.
  const aprobarComprobante = async (turnoId: string): Promise<void> => {
    if (supabaseEnabled && supabase) {
      try {
        const resp = await fetch('/api/aprobar-comprobante', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turnoId }),
        });
        const data = (await resp.json().catch(() => ({}))) as { ok?: boolean };
        if (!resp.ok || !data.ok) {
          showToast('❌ No se pudo aprobar el comprobante.');
          return;
        }
      } catch {
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
    plantilla: PlantillaRecordatorio,
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
        registrarTurnoLocal,
        actualizarEstadoTurno,
        guardarServiciosTurno,
        marcarSenaManual,
        sesionConToken: !supabaseEnabled || !!sesionToken,
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
