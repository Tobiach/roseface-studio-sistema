// src/context/AppContext.tsx
import React, { createContext, useContext, useState } from 'react';
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

interface AppContextType {
  rolActivo: RolUsuario;
  setRolActivo: (rol: RolUsuario) => void;
  turnos: Turno[];
  clientas: Clienta[];
  profesionales: Profesional[];
  servicios: Servicio[];
  beneficiosVIP: BeneficioVIP[];
  clientasEnRiesgo: ClientaEnRiesgo[];
  toastMessage: string | null;
  showToast: (msg: string) => void;
  crearTurno: (data: Omit<Turno, 'id' | 'fechaCreacion'>) => Turno;
  actualizarEstadoTurno: (id: string, nuevoEstado: EstadoTurno, notasInternas?: string) => void;
  activarFlujoRecuperacion: (clientaId: string) => void;
  canjearBeneficio: (clientaId: string, beneficio: BeneficioVIP) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rolActivo, setRolActivo] = useState<RolUsuario>('clienta');
  const [turnos, setTurnos] = useState<Turno[]>(mockTurnos);
  const [clientas, setClientas] = useState<Clienta[]>(mockClientas);
  const [profesionales] = useState<Profesional[]>(mockProfesionales);
  const [servicios] = useState<Servicio[]>(mockServicios);
  const [beneficiosVIP] = useState<BeneficioVIP[]>(mockBeneficiosVIP);
  const [clientasEnRiesgo, setClientasEnRiesgo] = useState<ClientaEnRiesgo[]>(mockClientasEnRiesgo);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const crearTurno = (data: Omit<Turno, 'id' | 'fechaCreacion'>): Turno => {
    const newId = `tur-${Date.now()}`;
    const nuevoTurno: Turno = {
      ...data,
      id: newId,
      fechaCreacion: new Date().toISOString(),
    };

    setTurnos((prev) => [nuevoTurno, ...prev]);
    showToast(`✨ Turno reservado con éxito para el ${nuevoTurno.fecha}`);
    return nuevoTurno;
  };

  const actualizarEstadoTurno = (id: string, nuevoEstado: EstadoTurno, notasInternas?: string) => {
    setTurnos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            estado: nuevoEstado,
            notasInternas: notasInternas !== undefined ? notasInternas : t.notasInternas,
          };
        }
        return t;
      })
    );
    showToast(`Estado de turno actualizado a: ${nuevoEstado.replace('_', ' ')}`);
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
