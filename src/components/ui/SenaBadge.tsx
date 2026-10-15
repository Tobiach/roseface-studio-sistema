// src/components/ui/SenaBadge.tsx
//
// Cartel explícito de si la seña de un turno ya está paga o falta pagarla
// (pedido de Yosy 15/10/2026: que se vea de un vistazo, sin tener que
// interpretar el estado del turno). La regla vive en estadoSena().
import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Badge } from './Badge';
import { estadoSena } from '../../lib/recordatorios';
import { formatCurrency } from '../../lib/formatters';
import type { Turno } from '../../types';

interface SenaBadgeProps {
  turno: Pick<Turno, 'origenReserva' | 'estado' | 'aprobadoPorProfesional' | 'montoSena'>;
  size?: 'sm' | 'md';
}

export const SenaBadge: React.FC<SenaBadgeProps> = ({ turno, size = 'sm' }) => {
  const estado = estadoSena(turno);
  if (estado === 'no_aplica') return null;
  const monto = turno.montoSena > 0 ? ` · ${formatCurrency(turno.montoSena)}` : '';

  return estado === 'pagada' ? (
    <Badge variant="success" size={size} icon={<CheckCircle2 className="w-3 h-3" />}>
      Seña pagada{monto}
    </Badge>
  ) : (
    <Badge variant="warning" size={size} icon={<Clock className="w-3 h-3" />}>
      Seña pendiente{monto}
    </Badge>
  );
};
