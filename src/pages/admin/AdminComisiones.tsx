// src/pages/admin/AdminComisiones.tsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calcularCierreSemanal } from '../../lib/comisionesEngine';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/formatters';
import {
  CircleDollarSign,
  Calendar,
  Download,
  Building,
  UserCheck,
  Percent,
  KeyRound,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

export const AdminComisiones: React.FC = () => {
  const { profesionales, turnos, showToast } = useApp();
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<string>('2026-08-04 a 2026-08-10');

  // Compute closure for all professionals
  const cierres = profesionales.map((prof) =>
    calcularCierreSemanal(prof, turnos, '2026-08-04', '2026-08-10')
  );

  // Consolidated totals
  const totalFacturacion = cierres.reduce((sum, c) => sum + c.facturacionTotal, 0);
  const totalComisionesPagadas = cierres.reduce((sum, c) => sum + c.montoComisionProfesional, 0);
  const totalNetoEstudio = cierres.reduce((sum, c) => sum + c.montoParaEstudio, 0);

  const handleExportarCierre = () => {
    showToast('📄 Cierre semanal exportado en PDF / Excel con éxito');
  };

  return (
    <div className="space-y-8 font-admin">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="gold">Motor de Comisiones</Badge>
            <span className="text-xs text-rf-charcoal font-medium">Control.Evo Engine</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-rf-black mt-1">
            Cierre Semanal de Comisiones
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-rf-rose-deep" />
            <select
              value={semanaSeleccionada}
              onChange={(e) => setSemanaSeleccionada(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="2026-08-04 a 2026-08-10">Semana: 04/08 a 10/08 (Actual)</option>
              <option value="2026-07-28 a 2026-08-03">Semana: 28/07 a 03/08</option>
            </select>
          </div>

          <Button variant="gold" size="sm" onClick={handleExportarCierre}>
            <Download className="w-4 h-4" />
            <span>Exportar Cierre</span>
          </Button>
        </div>
      </div>

      {/* Consolidated Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-pink-50 to-white space-y-2 border border-pink-200">
          <div className="flex items-center justify-between text-rf-charcoal text-xs font-semibold">
            <span>Facturación Bruta Generada</span>
            <CircleDollarSign className="w-4 h-4 text-rf-rose-deep" />
          </div>
          <p className="text-2xl font-bold text-rf-black">{formatCurrency(totalFacturacion)}</p>
          <p className="text-[11px] text-gray-500">Total recaudado por servicios prestados</p>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white space-y-2 border border-amber-200">
          <div className="flex items-center justify-between text-amber-900 text-xs font-semibold">
            <span>Comisiones a Pagar al Equipo</span>
            <UserCheck className="w-4 h-4 text-rf-gold-bright" />
          </div>
          <p className="text-2xl font-bold text-amber-900">
            {formatCurrency(totalComisionesPagadas)}
          </p>
          <p className="text-[11px] text-amber-800/80">Liquidación a profesionales por porcentaje</p>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white space-y-2 border border-emerald-200">
          <div className="flex items-center justify-between text-emerald-900 text-xs font-semibold">
            <span>Ganancia Neta para el Estudio</span>
            <Building className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-800">
            {formatCurrency(totalNetoEstudio)}
          </p>
          <p className="text-[11px] text-emerald-700">Comisiones estudio + alquileres fijos</p>
        </Card>
      </div>

      {/* Cards per Professional */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-rf-charcoal">
          Detalle por Profesional ({profesionales.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cierres.map((cierre) => {
            const prof = profesionales.find((p) => p.id === cierre.profesionalId);
            if (!prof) return null;

            const esPorcentaje = prof.modeloComision.tipo === 'porcentaje';

            return (
              <Card key={cierre.id} className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Top Bar with Avatar and Model Badge */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-pink-100">
                    <div className="flex items-center gap-3">
                      <img
                        src={prof.fotoUrl}
                        alt={prof.nombre}
                        className="w-12 h-12 rounded-full object-cover border-2 border-rf-gold"
                      />
                      <div>
                        <h3 className="font-bold text-base text-rf-black">{prof.nombre}</h3>
                        <p className="text-[11px] text-rf-charcoal">
                          {cierre.turnosRealizados} turnos realizada/os
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={esPorcentaje ? 'rose' : 'gold'}
                      icon={
                        esPorcentaje ? (
                          <Percent className="w-3 h-3" />
                        ) : (
                          <KeyRound className="w-3 h-3" />
                        )
                      }
                    >
                      {esPorcentaje
                        ? `Comisión ${prof.modeloComision.porcentajeProfesional}%`
                        : 'Alquiler Fijo'}
                    </Badge>
                  </div>

                  {/* Calculations Details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-pink-50">
                      <span className="text-rf-charcoal">Facturación Generada:</span>
                      <span className="font-semibold text-rf-black">
                        {formatCurrency(cierre.facturacionTotal)}
                      </span>
                    </div>

                    {esPorcentaje ? (
                      <>
                        <div className="flex justify-between py-1 border-b border-pink-50 bg-pink-50/50 px-2 rounded-lg">
                          <span className="font-semibold text-rf-rose-deep">
                            A Pagar a {prof.nombre} ({prof.modeloComision.porcentajeProfesional}%):
                          </span>
                          <span className="font-bold text-rf-rose-deep">
                            {formatCurrency(cierre.montoComisionProfesional)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-pink-50">
                          <span className="text-rf-charcoal">
                            Estudio ({100 - prof.modeloComision.porcentajeProfesional}%):
                          </span>
                          <span className="font-bold text-emerald-800">
                            {formatCurrency(cierre.montoParaEstudio)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between py-1 border-b border-pink-50 bg-amber-50/50 px-2 rounded-lg">
                          <span className="font-semibold text-amber-900">
                            Alquiler Fijo Semanal:
                          </span>
                          <span className="font-bold text-amber-900">
                            {formatCurrency(prof.modeloComision.montoSemanal)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-rf-charcoal">Ingreso Neto para Estudio:</span>
                          <span className="font-bold text-emerald-800">
                            {formatCurrency(cierre.montoParaEstudio)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Status & Action */}
                <div className="pt-3 border-t border-pink-100 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Liquidado
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      showToast(`Detalle enviado a ${prof.nombre} por WhatsApp`)
                    }
                  >
                    Enviar Recibo
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
