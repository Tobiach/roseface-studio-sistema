// src/components/ui/StatusPill.tsx
import React from 'react';
import { EstadoTurno } from '../../types';
import { Clock, CheckCircle2, BellRing, Check, XCircle } from 'lucide-react';

interface StatusPillProps {
  estado: EstadoTurno;
}

export const StatusPill: React.FC<StatusPillProps> = ({ estado }) => {
  const config = {
    reservado: {
      label: 'Reservado (Seña pendiente)',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Clock,
    },
    sena_confirmada: {
      label: 'Seña Confirmada',
      bg: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      icon: CheckCircle2,
    },
    recordatorio_enviado: {
      label: 'Recordatorio Enviado',
      bg: 'bg-purple-50 text-purple-800 border-purple-200',
      icon: BellRing,
    },
    completado: {
      label: 'Completado',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: Check,
    },
    cancelado_con_devolucion: {
      label: 'Cancelado (+48h Seña devuelta)',
      bg: 'bg-red-50 text-red-700 border-red-200',
      icon: XCircle,
    },
    cancelado_sin_devolucion: {
      label: 'Cancelado (-48h Seña retención)',
      bg: 'bg-red-100 text-red-900 border-red-300',
      icon: XCircle,
    },
  }[estado];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border whitespace-nowrap font-medium ${config.bg}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </span>
  );
};
