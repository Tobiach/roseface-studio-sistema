// src/components/ui/RitualTimeline.tsx
import React from 'react';
import { EstadoTurno } from '../../types';
import { Check, Clock, Bell, Sparkles, XCircle } from 'lucide-react';

interface RitualTimelineProps {
  estado: EstadoTurno;
  compact?: boolean;
}

interface Step {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  { id: 'reservado', label: 'Reservado', sublabel: 'Seña pendiente', icon: Clock },
  { id: 'sena_confirmada', label: 'Seña Confirmada', sublabel: '30% verificado', icon: Check },
  { id: 'recordatorio_enviado', label: 'Recordatorio', sublabel: '24hs antes', icon: Bell },
  { id: 'completado', label: 'Completado', sublabel: 'Turno finalizado', icon: Sparkles },
];

function getStepIndex(estado: EstadoTurno): number {
  switch (estado) {
    case 'reservado':
      return 0;
    case 'sena_confirmada':
      return 1;
    case 'recordatorio_enviado':
      return 2;
    case 'completado':
      return 3;
    case 'cancelado':
      return -1;
    default:
      return 0;
  }
}

export const RitualTimeline: React.FC<RitualTimelineProps> = ({ estado, compact = false }) => {
  const currentIndex = getStepIndex(estado);
  const isCancelled = estado.startsWith('cancelado');

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 bg-red-50 text-rf-danger border border-red-200 px-3 py-1.5 rounded-full text-xs font-medium">
        <XCircle className="w-4 h-4" />
        <span>Cancelado</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div
                title={`${step.label} (${step.sublabel})`}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-rf-gold text-white'
                    : isCurrent
                    ? 'bg-rf-gold-bright text-rf-black animate-gold-pulse ring-2 ring-rf-gold-bright/50 scale-110'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Icon className="w-3 h-3" />
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-3 sm:w-4 transition-colors ${
                    idx < currentIndex ? 'bg-rf-gold' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full py-4 px-2">
      <div className="relative flex items-center justify-between">
        {/* Connecting background bar */}
        <div className="absolute left-6 right-6 top-5 h-1 bg-gray-200 -z-0 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rf-gold to-rf-gold-bright transition-all duration-500"
            style={{
              width: `${(Math.max(0, currentIndex) / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  isDone
                    ? 'bg-rf-gold text-white shadow-sm'
                    : isCurrent
                    ? 'bg-rf-gold-bright text-rf-black shadow-md ring-4 ring-yellow-200/80 animate-gold-pulse scale-110'
                    : 'bg-white border-2 border-gray-200 text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`mt-2 text-xs font-semibold text-center ${
                  isCurrent ? 'text-rf-black font-bold' : isDone ? 'text-rf-charcoal' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[10px] text-gray-400 font-normal hidden sm:block">
                {step.sublabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
