// src/pages/admin/AdminVIP.tsx
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockReferidos } from '../../data/mockFidelizacion';
import {
  Crown,
  Gift,
  Users,
  AlertTriangle,
  Send,
  Cake,
  Share2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const AdminVIP: React.FC = () => {
  const {
    clientas,
    beneficiosVIP,
    clientasEnRiesgo,
    activarFlujoRecuperacion,
    canjearBeneficio,
    showToast,
  } = useApp();

  const clientasVIP = clientas.filter((c) => c.esVIP);

  // Clients with birthdays in current or upcoming month
  const clientasCumpleanios = clientas.filter((c) => c.fechaNacimiento?.includes('-08-'));

  const getClientaNombre = (id: string) => {
    const c = clientas.find((cli) => cli.id === id);
    return c ? c.nombre : 'Clienta';
  };

  return (
    <div className="space-y-8 font-admin">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="gold" icon={<Crown className="w-3 h-3" />}>
              Fidelización VIP
            </Badge>
            <span className="text-xs text-rf-charcoal font-medium">Control.Evo Engine</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-rf-black mt-1">
            Ecosistema VIP & Retención
          </h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="space-y-2 border-l-4 border-l-rf-gold-bright">
          <span className="text-xs font-semibold text-rf-charcoal">Clientas VIP Activas</span>
          <p className="text-2xl font-bold text-rf-black">{clientasVIP.length} clientas</p>
          <span className="text-[10px] text-rf-rose-deep font-bold">Niveles VIP & VIP+</span>
        </Card>

        <Card className="space-y-2 border-l-4 border-l-rf-rose-deep">
          <span className="text-xs font-semibold text-rf-charcoal">Puntos Sumados este Mes</span>
          <p className="text-2xl font-bold text-rf-black">4.850 pts</p>
          <span className="text-[10px] text-emerald-700 font-bold">+20% vs mes pasado</span>
        </Card>

        <Card className="space-y-2 border-l-4 border-l-purple-500">
          <span className="text-xs font-semibold text-rf-charcoal">Canjes Realizados</span>
          <p className="text-2xl font-bold text-rf-black">18 beneficios</p>
          <span className="text-[10px] text-rf-charcoal">Descuentos y regalos</span>
        </Card>

        <Card className="space-y-2 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-rf-charcoal">Clientas en Riesgo (&gt;45 días)</span>
          <p className="text-2xl font-bold text-amber-900">{clientasEnRiesgo.length} clientas</p>
          <span className="text-[10px] text-amber-800 font-bold">Sin visitar el studio</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Clientas en Riesgo & Recuperación (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rf-black flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Módulo de Recuperación de Clientas</span>
            </h2>
          </div>

          <div className="space-y-3">
            {clientasEnRiesgo.map((riesgo) => {
              const clienta = clientas.find((c) => c.id === riesgo.clientaId);
              if (!clienta) return null;

              return (
                <Card key={riesgo.clientaId} className="space-y-3 bg-amber-50/40 border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-rf-black">{clienta.nombre}</h3>
                      <p className="text-xs text-rf-charcoal">
                        Último servicio: <strong className="text-rf-black">{riesgo.ultimoServicio}</strong>
                      </p>
                    </div>

                    <Badge variant="warning">{riesgo.diasSinVisitar} días sin venir</Badge>
                  </div>

                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-medium">
                      WhatsApp: {clienta.telefono}
                    </span>

                    <Button
                      variant={riesgo.flujoRecuperacionActivado ? 'outline' : 'gold'}
                      size="sm"
                      disabled={riesgo.flujoRecuperacionActivado}
                      onClick={() => activarFlujoRecuperacion(riesgo.clientaId)}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {riesgo.flujoRecuperacionActivado
                          ? 'Mensaje Enviado ✓'
                          : 'Activar Recuperación'}
                      </span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Próximos Cumpleaños (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rf-black flex items-center gap-2">
              <Cake className="w-4 h-4 text-rf-rose-deep" />
              <span>Próximos Cumpleaños (Mes de Agosto)</span>
            </h2>
          </div>

          <div className="space-y-3">
            {clientasCumpleanios.map((clienta) => (
              <Card key={clienta.id} className="space-y-3 bg-pink-50/40 border-pink-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rf-blush flex items-center justify-center text-rf-rose-deep font-bold text-sm">
                      🎂
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-rf-black">{clienta.nombre}</h3>
                      <p className="text-xs text-rf-charcoal">
                        Cumpleaños: <strong>15 de Agosto</strong>
                      </p>
                    </div>
                  </div>

                  <Badge variant="gold">Bono 30% OFF Activo</Badge>
                </div>

                <div className="pt-2 border-t border-pink-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-rf-charcoal italic">
                    Beneficio automático enviado por WhatsApp
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      showToast(`🎂 Saludo de cumpleaños enviado a ${clienta.nombre}`)
                    }
                  >
                    <span>Enviar Saludo</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Referrals & Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Programa de Referidos (6 cols) */}
        <Card className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-pink-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rf-black flex items-center gap-2">
              <Share2 className="w-4 h-4 text-rf-gold" />
              <span>Programa de Referidos "Boca a Boca"</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {mockReferidos.map((ref) => (
              <div
                key={ref.id}
                className="p-3 bg-rf-cream rounded-xl border border-pink-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-rf-black">
                    {getClientaNombre(ref.clientaReferenteId)} referenció a{' '}
                    <span className="text-rf-rose-deep">{getClientaNombre(ref.clientaReferidaId)}</span>
                  </p>
                  <p className="text-[10px] text-gray-500">Fecha: {ref.fecha}</p>
                </div>

                <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                  +200 Pts Otorgados
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Benefits Catalog (6 cols) */}
        <Card className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-pink-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rf-black flex items-center gap-2">
              <Gift className="w-4 h-4 text-rf-rose-deep" />
              <span>Catálogo de Beneficios VIP</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {beneficiosVIP.map((ben) => (
              <div key={ben.id} className="p-3 bg-white rounded-xl border border-pink-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="gold" size="sm">
                    {ben.puntosNecesarios > 0 ? `${ben.puntosNecesarios} pts` : 'Gratis'}
                  </Badge>
                </div>
                <h4 className="font-bold text-rf-black">{ben.nombre}</h4>
                <p className="text-[11px] text-rf-charcoal leading-tight">{ben.descripcion}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
