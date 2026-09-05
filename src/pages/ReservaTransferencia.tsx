// src/pages/ReservaTransferencia.tsx
//
// Circuito de pago por transferencia (Fase 5): lo usan las profesionales de
// alquiler fijo (Martina, Sofía, Alexandra, Camila, Valentina). La clienta
// transfiere por su cuenta al alias/CBU de la profesional y sube acá el
// comprobante — recién cuando la profesional lo aprueba en su propio panel
// el turno pasa a confirmado. Yosy no ve ni gestiona este pago.
import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDateReadable } from '../lib/formatters';
import { Landmark, Copy, Upload, CheckCircle2, ArrowRight, Calendar, Clock } from 'lucide-react';

export const ReservaTransferencia: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { subirComprobante, showToast } = useApp();

  const turnoId = searchParams.get('turnoId');
  const aliasCbu = searchParams.get('aliasCbu') ?? '';
  const servicio = searchParams.get('servicio') ?? '';
  const profesional = searchParams.get('profesional') ?? '';
  const fecha = searchParams.get('fecha') ?? '';
  const hora = searchParams.get('hora') ?? '';
  const montoSena = Number(searchParams.get('montoSena') ?? 0);
  const nombre = searchParams.get('nombre') ?? '';

  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const copiarAlias = () => {
    navigator.clipboard?.writeText(aliasCbu);
    showToast('📋 Alias copiado');
  };

  const handleSubir = async () => {
    if (!turnoId || !archivo) return;
    setSubiendo(true);
    try {
      await subirComprobante(turnoId, archivo);
      setEnviado(true);
    } catch {
      // subirComprobante ya muestra el toast de error
    } finally {
      setSubiendo(false);
    }
  };

  if (!turnoId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-rf-charcoal">No encontramos los datos de esta reserva.</p>
        <Link to="/reserva">
          <Button variant="primary">Volver a reservar</Button>
        </Link>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <Badge variant="gold">Comprobante enviado</Badge>
        <h1 className="font-display text-2xl font-bold text-rf-black">
          {nombre ? `¡Gracias, ${nombre}!` : '¡Listo!'}
        </h1>
        <p className="text-sm text-rf-charcoal leading-relaxed">
          {profesional} va a revisar tu comprobante y confirmar el turno. Te avisamos por WhatsApp
          apenas quede confirmado.
        </p>
        <Link to="/" className="inline-block">
          <Button variant="primary" size="lg">
            <span>Volver al inicio</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <Badge variant="warning">Falta un paso — transferencia pendiente</Badge>
        <h1 className="font-display text-2xl font-bold text-rf-black">Transferí tu seña</h1>
        <p className="text-sm text-rf-charcoal">
          Tu turno de {servicio} con {profesional} quedó reservado. Para confirmarlo, transferí la
          seña y subí el comprobante acá abajo.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-xs pb-3 border-b border-pink-100">
          <div className="space-y-1">
            <span className="text-gray-400 block font-medium">Fecha</span>
            <p className="font-semibold text-rf-black flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-rf-rose-deep" /> {formatDateReadable(fecha)}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-gray-400 block font-medium">Horario</span>
            <p className="font-semibold text-rf-black flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-rf-rose-deep" /> {hora} hs
            </p>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sky-800 font-bold text-xs uppercase tracking-wider">
            <Landmark className="w-4 h-4" />
            <span>Datos para transferir</span>
          </div>
          <div className="flex items-center justify-between bg-white rounded-xl border border-sky-200 px-3 py-2.5">
            <div>
              <span className="text-[11px] text-gray-400 block">Alias / CBU de {profesional}</span>
              <span className="font-bold text-rf-black text-sm">{aliasCbu}</span>
            </div>
            <button
              onClick={copiarAlias}
              className="text-sky-700 hover:text-sky-900 cursor-pointer p-2"
              aria-label="Copiar alias"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-900">Monto a transferir</span>
            <span className="font-extrabold text-sky-900 text-lg">{formatCurrency(montoSena)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-rf-black block">
            Subí el comprobante de transferencia
          </label>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-pink-200 rounded-2xl py-6 cursor-pointer hover:border-rf-rose-deep transition-colors">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
            <Upload className="w-4 h-4 text-rf-rose-deep" />
            <span className="text-xs font-semibold text-rf-charcoal">
              {archivo ? archivo.name : 'Elegí una foto o PDF del comprobante'}
            </span>
          </label>
        </div>

        <Button
          variant="primary"
          fullWidth
          size="lg"
          disabled={!archivo || subiendo}
          onClick={handleSubir}
        >
          {subiendo ? 'Enviando comprobante...' : 'Enviar comprobante'}
        </Button>

        <p className="text-[11px] text-rf-charcoal italic text-center">
          La seña confirma tu turno y no es reembolsable ante cancelación.
        </p>
      </Card>
    </div>
  );
};
