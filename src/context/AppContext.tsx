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
} from '../lib/supabaseMappers';

interface AppContextType {
  rolActivo: RolUsuario;
  setRolActivo: (rol: RolUsuario) => void;
  profesionalActivoId: string | null;
  setProfesionalActivoId: (id: string | null) => void;
  turnos: Turno[];
  clientas: Clienta[];
  profesionales: Profesional[];
  servicios: Servicio[];
  beneficiosVIP: BeneficioVIP[];
  clientasEnRiesgo: ClientaEnRiesgo[];
  toastMessage: string | null;
  showToast: (msg: string) => void;
  crearTurno: (data: Omit<Turno, 'id' | 'fechaCreacion'>) => Promise<Turno>;
  actualizarEstadoTurno: (id: string, nuevoEstado: EstadoTurno, notasInternas?: string) => Promise<void>;
  buscarOCrearClienta: (nombre: string, telefono: string) => Promise<string>;
  activarFlujoRecuperacion: (clientaId: string) => void;
  canjearBeneficio: (clientaId: string, beneficio: BeneficioVIP) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rolActivo, setRolActivo] = useState<RolUsuario>('clienta');
  const [profesionalActivoId, setProfesionalActivoId] = useState<string | null>(null);
  // Arranca con los mocks (dev sin Supabase configurado, o mientras carga el
  // fetch real) y se reemplaza por datos reales apenas responde Supabase.
  const [turnos, setTurnos] = useState<Turno[]>(mockTurnos);
  const [clientas, setClientas] = useState<Clienta[]>(mockClientas);
  const [profesionales, setProfesionales] = useState<Profesional[]>(mockProfesionales);
  const [servicios, setServicios] = useState<Servicio[]>(mockServicios);
  const [beneficiosVIP] = useState<BeneficioVIP[]>(mockBeneficiosVIP);
  const [clientasEnRiesgo, setClientasEnRiesgo] = useState<ClientaEnRiesgo[]>(mockClientasEnRiesgo);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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

      const [turnosRes, clientasRes, serviciosRes, profesionalesRes] = await Promise.all([
        supabase.from('turnos').select('*').order('fecha_creacion', { ascending: false }),
        supabase.from('clientas').select('*'),
        supabase.from('servicios').select('*'),
        supabase.from('profesionales').select('*'),
      ]);
      if (cancelado) return;

      if (turnosRes.data) setTurnos(turnosRes.data.map(turnoFromRow));
      if (clientasRes.data) setClientas(clientasRes.data.map(clientaFromRow));
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
              ? { ...p, modeloComision: operativo.modeloComision, horarioDisponible: operativo.horarioDisponible }
              : p;
          })
        );
      }
    })();

    return () => {
      cancelado = true;
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

  // Busca una clienta por nombre entre las ya cargadas; si no existe, la crea
  // en Supabase. Antes de esto, una reserva de alguien nuevo se anotaba
  // siempre bajo la clienta demo 'cli-01' — con persistencia real hay que
  // dar de alta a la clienta de verdad.
  const buscarOCrearClienta = async (nombre: string, telefono: string): Promise<string> => {
    const existente = clientas.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (existente) return existente.id;

    if (supabaseEnabled && supabase) {
      const nuevaClienta: Omit<Clienta, 'historialTurnos'> = {
        id: `cli-${Date.now()}`,
        nombre,
        telefono,
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
        beneficiosVIP,
        clientasEnRiesgo,
        toastMessage,
        showToast,
        crearTurno,
        actualizarEstadoTurno,
        buscarOCrearClienta,
        activarFlujoRecuperacion,
        canjearBeneficio,
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
