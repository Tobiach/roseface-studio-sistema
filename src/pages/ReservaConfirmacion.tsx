// src/pages/ReservaConfirmacion.tsx
import React from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { Turno, EstadoTurno } from '../types';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { RitualTimeline } from '../components/ui/RitualTimeline';
import { formatCurrency, formatDateReadable } from '../lib/formatters';
import {
  CheckCircle,
  Calendar,
  Clock,
  User,
  Bell,
  Sparkles,
  MapPin,
  ArrowRight,
} from 'lucide-react';

interface ResumenReserva {
  nombreClienta: string;
  servicio: string;
  profesional: string;
  fecha: string;
  horaInicio: string;
  montoSena: number;
  montoTotal: number;
  estado: EstadoTurno;
}

export const ReservaConfirmacion: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { servicios, profesionales } = useApp();

  // Camino 1: vino del flujo simulado (navigate interno, con state de React)
  const turnoDelState = (location.state as { turno?: Turno })?.turno;

  // Camino 2: vino de un pago real en Mercado Pago — la SPA recargó desde un
  // dominio externo y perdió el estado en memoria, así que la reserva viaja
  // en los query params que armó /api/mercadopago/crear-preferencia
  const turnoIdDesdeMP = searchParams.get('turnoId');

  const resumen: ResumenReserva | null = turnoDelState
    ? {
        nombreClienta: '',
        servicio: servicios.find((s) => s.id === turnoDelState.servicioId)?.nombre ?? '',
        profesional: profesionales.find((p) => p.id === turnoDelState.profesionalId)?.nombre ?? '',
        fecha: turnoDelState.fecha,
        horaInicio: turnoDelState.horaInicio,
        montoSena: turnoDelState.montoSena,
        montoTotal: turnoDelState.montoTotal,
        estado: turnoDelState.estado,
      }
    : turnoIdDesdeMP
    ? {
        nombreClienta: searchParams.get('nombre') ?? '',
        servicio: searchParams.get('servicio') ?? '',
        profesional: searchParams.get('profesional') ?? '',
        fecha: searchParams.get('fecha') ?? '',
        horaInicio: searchParams.get('hora') ?? '',
        montoSena: Number(searchParams.get('montoSena') ?? 0),
        montoTotal: Number(searchParams.get('montoTotal') ?? 0),
        estado: searchParams.get('status') === 'approved' ? 'sena_confirmada' : 'reservado',
      }
    : null;

  const pagoPendiente = resumen?.estado === 'reservado' && !!turnoIdDesdeMP;
  const porcentajeSena =
    resumen && resumen.montoTotal > 0 ? Math.round((resumen.montoSena / resumen.montoTotal) * 100) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Celebration Header */}
      <div className="text-center space-y-4">
        <div
          className={`w-20 h-20 mx-auto rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-bounce ${
            pagoPendiente ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
          }`}
        >
          <CheckCircle className="w-10 h-10" />
        </div>
        <Badge variant={pagoPendiente ? 'warning' : 'gold'} icon={<Sparkles className="w-3.5 h-3.5" />}>
          {pagoPendiente ? 'Pago en revisión' : '¡Seña Confirmada y Turno Reservado!'}
        </Badge>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-rf-black">
          {resumen?.nombreClienta
            ? `¡Gracias, ${resumen.nombreClienta}! Nos vemos pronto en Rose Face Studio.`
            : '¡Nos vemos pronto en Rose Face Studio!'}
        </h1>
        <p className="text-sm text-rf-charcoal max-w-md mx-auto leading-relaxed">
          {pagoPendiente
            ? 'Tu pago está en revisión por Mercado Pago. En cuanto se acredite te confirmamos por WhatsApp.'
            : 'Tu pago de seña se verificó automáticamente. Te enviamos la confirmación por WhatsApp y el recordatorio te va a llegar antes del turno.'}
        </p>
      </div>

      {/* Signature Ritual Timeline Component showing current state */}
      <Card className="space-y-4 bg-gradient-to-b from-pink-50/50 to-white">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-rf-rose-deep">
            Estado de tu Turno en el Ritual Roseface
          </span>
          <Badge variant="success">Paso 2 / 4 Activo</Badge>
        </div>

        <RitualTimeline estado={resumen?.estado ?? 'sena_confirmada'} />
      </Card>

      {/* Reservation Details Card */}
      {resumen && resumen.servicio && resumen.profesional && (
        <Card className="space-y-4">
          <h3 className="font-display font-bold text-lg text-rf-black pb-2 border-b border-pink-100">
            Detalle de tu Cita
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-gray-400 block font-medium">Servicio</span>
              <p className="font-bold text-rf-black text-sm">{resumen.servicio}</p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 block font-medium">Especialista</span>
              <p className="font-bold text-rf-black text-sm">{resumen.profesional}</p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 block font-medium">Fecha</span>
              <p className="font-semibold text-rf-black flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-rf-rose-deep" />
                {formatDateReadable(resumen.fecha)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 block font-medium">Horario</span>
              <p className="font-semibold text-rf-black flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rf-rose-deep" />
                {resumen.horaInicio} hs
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-pink-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 block">
                Seña {pagoPendiente ? 'a confirmar' : 'Abonada'}
                {porcentajeSena !== null ? ` (${porcentajeSena}%)` : ''}
              </span>
              <span className="font-bold text-emerald-700 text-sm">{formatCurrency(resumen.montoSena)}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 block">Saldo Restante a abonar en el studio</span>
              <span className="font-bold text-rf-black text-sm">
                {formatCurrency(resumen.montoTotal - resumen.montoSena)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Studio Location Reminder */}
      <div className="bg-rf-cream p-4 rounded-2xl border border-pink-200/60 flex items-center gap-3 text-xs text-rf-charcoal">
        <MapPin className="w-5 h-5 text-rf-rose-deep shrink-0" />
        <div>
          <span className="font-bold text-rf-black block">¿Dónde estamos?</span>
          <span>Av. Acoyte 25, C1405BFA Cdad. Autónoma de Buenos Aires.</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/" className="w-full sm:w-auto">
          <Button variant="primary" fullWidth size="lg">
            <span>Volver al inicio</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
