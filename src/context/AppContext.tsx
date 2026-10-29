// src/context/AppContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
import { llevaCuentaBancaria, cuentaBancariaParaTurno, mensajeParaTurno } from '../lib/recordatorios';
import { abrirChatWhatsApp, esDispositivoMovil } from '../lib/whatsapp';
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
  // Confirma que la clienta vino (o corrige el desglose de un turno ya completado):
  // servicio PRINCIPAL realmente hecho (si cambió) + extras. Pasa por
  // api/editar-turno.ts con token (24/10/2026 — antes iba sin token por
  // actualizar-estado-turno.ts). Devuelve true si se guardó.
  completarTurno: (id: string, opciones?: { servicioId?: string; serviciosExtra?: ServicioExtra[] }) => Promise<boolean>;
  // Registra (o deshace) que se abonó la seña de un turno cargado a mano. Exige
  // PIN reciente (token de sesión); devuelve true si se guardó.
  marcarSenaManual: (id: string, abonada: boolean) => Promise<boolean>;
  // true si hay una sesión con token vigente (o no hay base real, donde no hace falta).
  sesionConToken: boolean;
  // Cuándo se trajeron por última vez los datos reales de la base y si la última carga falló
  // (si falla, lo que se ve puede ser viejo o de ejemplo). `actualizadoEn` es null si nunca cargó.
  estadoDatos: { error: boolean; actualizadoEn: number | null };
  // Vuelve a traer turnos, clientas, bloqueos y recordatorios de la base ahora mismo.
  refrescarDatos: () => Promise<void>;
  // Marca el recordatorio como enviado y abre el WhatsApp de la clienta con el mensaje armado.
  // En los de seña (72h / 48h) le suma un link de pago de Mercado Pago atado al turno.
  enviarRecordatorioWhatsApp: (
    turno: Turno,
    plantilla: PlantillaRecordatorio,
    clienta: { nombre: string; telefono: string },
    servicioNombre: string
  ) => Promise<void>;
  // Editar una reserva ya hecha (servicio, día, hora, profesional, precio), cancelarla con
  // motivo o reactivarla. Todo pasa por api/editar-turno.ts (exige PIN reciente) y el
  // servidor recalcula el total. Devuelven true si se guardó.
  editarTurno: (id: string, cambios: CambiosTurno) => Promise<{ ok: boolean; resumen?: string[]; advertencias?: string[] }>;
  cancelarTurno: (id: string, motivo?: string) => Promise<boolean>;
  reactivarTurno: (id: string) => Promise<boolean>;
  // Deshace un "Vino" marcado por error: el turno vuelve a pendiente y deja de sumar a las comisiones.
  reabrirTurno: (id: string) => Promise<boolean>;
  // Corrige nombre / teléfono / mail de la clienta de ese turno (la lista de clientas se actualiza sola).
  editarClienta: (
    turnoId: string,
    datos: DatosClienta
  ) => Promise<{ ok: boolean; advertencias?: string[] }>;
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

// Datos de contacto que se pueden corregir desde un turno (api/editar-turno.ts, acción "clienta").
export interface DatosClienta {
  nombre?: string;
  telefono?: string;
  email?: string;
}

// Lo que se puede cambiar de una reserva (api/editar-turno.ts). Los montos solo los acepta Yosy.
export interface CambiosTurno {
  servicioId?: string;
  profesionalId?: string;
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  montoTotal?: number;
  montoSena?: number;
  serviciosExtra?: ServicioExtra[];
  nota?: string;
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
  const [estadoDatos, setEstadoDatos] = useState<{ error: boolean; actualizadoEn: number | null }>({ error: false, actualizadoEn: null });
  const refrescarRef = useRef<(forzar?: boolean) => Promise<void>>(async () => {});

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

      // Si la base no respondió bien se avisa en pantalla: antes quedaban los datos de ejemplo
      // (o los viejos) sin ninguna señal y parecía que las reservas "no se guardaron".
      setEstadoDatos(
        turnosRes.error || clientasRes.error
          ? { error: true, actualizadoEn: null }
          : { error: false, actualizadoEn: Date.now() }
      );

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
    const refrescar = async (forzar = false) => {
      if ((document.hidden && !forzar) || !supabase) return;
      let t, c, r, b;
      try {
        [t, c, r, b] = await Promise.all([
          supabase.from('turnos').select('*').order('fecha_creacion', { ascending: false }),
          supabase.from('clientas').select('*'),
          supabase.from('recordatorios_config').select('*'),
          supabase.from('bloqueos_horario').select('*'),
        ]);
      } catch {
        if (!cancelado) setEstadoDatos((prev) => ({ ...prev, error: true }));
        return;
      }
      if (cancelado) return;
      setEstadoDatos((prev) => (t.error || c.error ? { ...prev, error: true } : { error: false, actualizadoEn: Date.now() }));
      if (t.data) setTurnos(t.data.map(turnoFromRow));
      if (c.data) setClientas(c.data.map(clientaFromRow));
      if (r.data) setRecordatoriosConfig(r.data.map(recordatorioFromRow));
      if (b.data) setBloqueos(b.data.map(bloqueoFromRow));
    };
    const intervalo = setInterval(() => refrescar(), 45000);
    refrescarRef.current = refrescar;

    // Al volver a la pantalla (ej. en el celular, después de mandar un WhatsApp o de tener la
    // pestaña dormida) se trae todo de nuevo en el momento, sin esperar al próximo ciclo.
    const alVolver = () => {
      if (document.visibilityState === 'visible') refrescar();
    };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  const refrescarDatos = async () => {
    await refrescarRef.current(true);
  };

  const crearTurno = async (data: Omit<Turno, 'id' | 'fechaCreacion'>): Promise<Turno> => {
    if (supabaseEnabled && supabase) {
      const { data: row, error } = await supabase
        .from('turnos')
        .insert(turnoToInsertRow(data))
        .select()
        .single();

      if (error || !row) {
        // Antes siempre decía "no se pudo registrar" sin explicar por qué: el
        // motivo más común es que esa profesional ya tiene un turno que empieza
        // a la misma hora (la base lo prohíbe: índice turno_unico_por_horario).
        const motivo = (error as { code?: string; message?: string } | null) ?? {};
        showToast(
          motivo.code === '23505' && motivo.message?.includes('turno_unico_por_horario')
            ? '❌ Esa profesional ya tiene un turno que empieza a esa hora. Elegí otro horario.'
            : motivo.code === '23503'
            ? '❌ No se encontró a la clienta de este turno. Probá de nuevo.'
            : `❌ No se pudo registrar la reserva${motivo.message ? ` (${motivo.message.slice(0, 90)})` : ''}. Probá de nuevo.`
        );
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

  // Las acciones que exigen PIN reciente (registrar una seña, generar un link de pago)
  // piden volver a ingresarlo cuando la sesión no tiene token vigente.
  const pedirPinDeNuevo = () => {
    showToast('🔑 Volvé a ingresar tu PIN para seguir (la sesión venció).');
    setSesionToken(null);
    abrirPinModal(rolActivo === 'admin' ? 'admin' : 'profesional');
  };

  const marcarSenaManual = async (id: string, abonada: boolean): Promise<boolean> => {
    if (supabaseEnabled && supabase) {
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

  const enviarRecordatorioWhatsApp = async (
    turno: Turno,
    plantilla: PlantillaRecordatorio,
    clienta: { nombre: string; telefono: string },
    servicioNombre: string
  ): Promise<void> => {
    // Sin teléfono no hay a quién mandarle el mensaje (wa.me quedaría vacío).
    if (!clienta.telefono.replace(/\D/g, '')) {
      showToast('📵 Esta clienta no tiene teléfono cargado: tocá "Editar datos" en el turno para agregarlo.');
      return;
    }
    // En la computadora la pestaña de WhatsApp Web se abre YA, dentro del click: si se abriera
    // después, el navegador la bloquearía como ventana emergente. En el celular no se abre
    // ninguna pestaña: se abre la app directo (ver abrirChatWhatsApp).
    const ventana = esDispositivoMovil() ? null : window.open('', '_blank');
    // La cuenta bancaria del día se arma al instante (no hace falta pedirle nada al
    // servidor, a diferencia del viejo link de Mercado Pago que esto reemplaza).
    const cuentaBancaria = llevaCuentaBancaria(turno, plantilla) ? cuentaBancariaParaTurno(turno) : undefined;

    // Se espera el registro del recordatorio para que, si hiciera falta mostrar un aviso
    // después, sea el último toast (si no, "recordatorio activado" lo taparía).
    await toggleRecordatorio(turno.id, plantilla, true);
    abrirChatWhatsApp(clienta.telefono, mensajeParaTurno(turno, plantilla, clienta.nombre, servicioNombre, cuentaBancaria), ventana);
  };

  interface RespuestaEdicion {
    ok: boolean;
    turno?: Record<string, unknown>;
    clienta?: Record<string, unknown>;
    resumen?: string[];
    advertencias?: string[];
    error?: string;
  }

  // Llamada común a api/editar-turno.ts: exige PIN reciente y devuelve la fila ya guardada,
  // con la que se actualiza el estado de la app (calendario, agenda, caja y comisiones
  // leen de ahí, así que se reflejan solos).
  const llamarEdicion = async (
    id: string,
    cuerpo: Record<string, unknown>,
    cambioDeHorario = false
  ): Promise<RespuestaEdicion> => {
    if (!supabaseEnabled || !supabase) {
      showToast('❌ Editar reservas no está disponible sin conexión a la base.');
      return { ok: false };
    }
    if (!sesionToken) {
      pedirPinDeNuevo();
      return { ok: false };
    }
    try {
      const resp = await fetch('/api/editar-turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesionToken}` },
        body: JSON.stringify({ turnoId: id, ...cuerpo }),
      });
      if (resp.status === 401) {
        pedirPinDeNuevo();
        return { ok: false };
      }
      const data = (await resp.json().catch(() => ({}))) as RespuestaEdicion;
      if (!resp.ok || !data.ok || (!data.turno && !data.clienta)) {
        showToast(`❌ ${data.error ?? 'No se pudo guardar el cambio.'}`);
        return { ok: false };
      }
      if (data.turno) {
        const actualizado = turnoFromRow(data.turno);
        setTurnos((prev) => prev.map((t) => (t.id === id ? actualizado : t)));
      }
      if (data.clienta) {
        const actualizada = clientaFromRow(data.clienta);
        setClientas((prev) => prev.map((c) => (c.id === actualizada.id ? actualizada : c)));
      }
      // Los recordatorios ya mandados eran para el día/hora anterior (el servidor los reinicia).
      if (cambioDeHorario) setRecordatoriosConfig((prev) => prev.filter((r) => r.turnoId !== id));
      return data;
    } catch {
      showToast('❌ No se pudo guardar el cambio.');
      return { ok: false };
    }
  };

  const editarTurno = async (id: string, cambios: CambiosTurno) => {
    const r = await llamarEdicion(id, { accion: 'editar', ...cambios }, cambios.fecha !== undefined || cambios.horaInicio !== undefined);
    if (r.ok) showToast('✓ Reserva actualizada');
    return { ok: r.ok, resumen: r.resumen, advertencias: r.advertencias };
  };

  const cancelarTurno = async (id: string, motivo?: string) => {
    const r = await llamarEdicion(id, { accion: 'cancelar', motivo });
    if (r.ok) showToast('Turno cancelado (la seña no se reembolsa)');
    return r.ok;
  };

  const reactivarTurno = async (id: string) => {
    const r = await llamarEdicion(id, { accion: 'reactivar' });
    if (r.ok) showToast('✓ Turno reactivado');
    return r.ok;
  };

  const reabrirTurno = async (id: string) => {
    const r = await llamarEdicion(id, { accion: 'reabrir' });
    if (r.ok) showToast('↩️ Listo: el turno volvió a pendiente y ya no suma a las comisiones');
    return r.ok;
  };

  const completarTurno = async (id: string, opciones: { servicioId?: string; serviciosExtra?: ServicioExtra[] } = {}) => {
    const r = await llamarEdicion(id, { accion: 'completar', ...opciones });
    if (r.ok) showToast('✓ Turno completado y servicios registrados');
    return r.ok;
  };

  const editarClienta = async (turnoId: string, datos: DatosClienta) => {
    const r = await llamarEdicion(turnoId, { accion: 'clienta', cliente: datos });
    if (r.ok) {
      showToast('✓ Datos de la clienta actualizados');
      (r.advertencias ?? []).forEach((a) => showToast(`⚠️ ${a}`));
    }
    return { ok: r.ok, advertencias: r.advertencias };
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

  // La profesional dueña del turno (circuito transferencia) o Yosy (cualquier
  // circuito, en especial el de Mercado Pago cuando la clienta transfirió en
  // vez de pagar por MP — 29/10/2026) aprueba el comprobante y recién ahí el
  // turno pasa a confirmado — mismo efecto que el webhook de MP, pero
  // disparado a mano. Escritura migrada a /api/aprobar-comprobante.ts
  // (26/9/2026, docs/SEGURIDAD_PENDIENTE.md): antes era un UPDATE directo con el
  // anon key; ahora además exige el token de sesión (29/10/2026, antes no
  // pedía ninguno — cualquiera que supiera el id de un turno podía aprobarlo).
  const aprobarComprobante = async (turnoId: string): Promise<void> => {
    if (supabaseEnabled && supabase) {
      if (!sesionToken) {
        pedirPinDeNuevo();
        return;
      }
      try {
        const resp = await fetch('/api/aprobar-comprobante', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesionToken}` },
          body: JSON.stringify({ turnoId }),
        });
        if (resp.status === 401) {
          pedirPinDeNuevo();
          return;
        }
        const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!resp.ok || !data.ok) {
          showToast(`❌ ${data.error ?? 'No se pudo aprobar el comprobante.'}`);
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

      // Antes acá se devolvía 'cli-01' (una clienta demo que ya no existe en la
      // base) y el turno fallaba después con un error de clave foránea que nadie
      // entendía. Con base real, si no se pudo crear la clienta se corta y se avisa.
      showToast(`❌ No se pudo crear a la clienta${error?.message ? ` (${error.message.slice(0, 90)})` : ''}. Probá de nuevo.`);
      throw error ?? new Error('Insert de clienta sin datos');
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
        completarTurno,
        marcarSenaManual,
        sesionConToken: !supabaseEnabled || !!sesionToken,
        estadoDatos,
        refrescarDatos,
        enviarRecordatorioWhatsApp,
        editarTurno,
        cancelarTurno,
        reactivarTurno,
        reabrirTurno,
        editarClienta,
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
