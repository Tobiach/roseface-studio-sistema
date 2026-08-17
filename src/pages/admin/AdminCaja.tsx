// src/pages/admin/AdminCaja.tsx
import React from 'react';
import { format, parseISO, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatCurrency } from '../../lib/formatters';
import { TrendingUp, TrendingDown, BarChart3, Wallet } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';

export const AdminCaja: React.FC = () => {
  const { turnos, profesionales, clientas, servicios } = useApp();

  const hoy = new Date().toISOString().slice(0, 10);
  const hoyDate = parseISO(hoy);
  const ayer = format(subDays(hoyDate, 1), 'yyyy-MM-dd');
  const inicioSemana = format(startOfWeek(hoyDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const finSemana = format(endOfWeek(hoyDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const mesActual = hoy.slice(0, 7);

  const pagosDeHoy = turnos
    .filter((t) => t.fechaCreacion.slice(0, 10) === hoy && t.estado !== 'reservado' && t.estado !== 'cancelado')
    .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
  const totalPagosHoy = pagosDeHoy.reduce((sum, t) => sum + t.montoSena, 0);

  const getClientaNombre = (id: string) => clientas.find((c) => c.id === id)?.nombre ?? 'Clienta';
  const getServicioNombre = (id: string) => servicios.find((s) => s.id === id)?.nombre ?? 'Servicio';
  const getProfesionalNombre = (id: string) => profesionales.find((p) => p.id === id)?.nombre ?? '';

  // Facturación real: turnos no cancelados, agrupados por ventana de tiempo.
  // "Facturación" cuenta el valor total del turno (no solo la seña), sea
  // que ya se haya completado o esté reservado/confirmado para esa fecha.
  const turnosNoCancelados = turnos.filter((t) => t.estado !== 'cancelado');

  const facturacionHoy = turnosNoCancelados
    .filter((t) => t.fecha === hoy)
    .reduce((sum, t) => sum + t.montoTotal, 0);

  const facturacionAyer = turnosNoCancelados
    .filter((t) => t.fecha === ayer)
    .reduce((sum, t) => sum + t.montoTotal, 0);

  const variacionVsAyer =
    facturacionAyer > 0 ? Math.round(((facturacionHoy - facturacionAyer) / facturacionAyer) * 100) : null;

  const facturacionSemana = turnosNoCancelados
    .filter((t) => t.fecha >= inicioSemana && t.fecha <= finSemana)
    .reduce((sum, t) => sum + t.montoTotal, 0);

  const turnosDelMes = turnosNoCancelados.filter((t) => t.fecha.startsWith(mesActual));
  const facturacionMes = turnosDelMes.reduce((sum, t) => sum + t.montoTotal, 0);

  const turnosUltimos30Dias = turnos.filter(
    (t) => t.fecha >= format(subDays(hoyDate, 29), 'yyyy-MM-dd') && t.fecha <= hoy
  );
  const tasaCancelacion =
    turnosUltimos30Dias.length > 0
      ? (turnosUltimos30Dias.filter((t) => t.estado === 'cancelado').length / turnosUltimos30Dias.length) * 100
      : 0;
  const etiquetaTasaCancelacion =
    tasaCancelacion < 10 ? 'Baja' : tasaCancelacion < 20 ? 'Moderada' : 'Alta';

  // Evolución real de los últimos 30 días — facturación de turnos completados por día
  const dataFacturacion30Dias = Array.from({ length: 30 }).map((_, i) => {
    const diaISO = format(subDays(hoyDate, 29 - i), 'yyyy-MM-dd');
    const monto = turnos
      .filter((t) => t.fecha === diaISO && t.estado === 'completado')
      .reduce((sum, t) => sum + t.montoTotal, 0);
    return { dia: format(parseISO(diaISO), 'dd MMM', { locale: es }), monto };
  });

  // Ranking per professional
  const rankingProfesionales = profesionales.map((prof) => {
    const turnosProf = turnos.filter(
      (t) => t.profesionalId === prof.id && t.estado === 'completado'
    );
    const monto = turnosProf.reduce((sum, t) => sum + t.montoTotal, 0);
    return {
      nombre: prof.nombre,
      monto,
    };
  });

  const turnosCancelados = turnos
    .filter((t) => t.estado === 'cancelado')
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="space-y-8 font-admin">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="gold">Finanzas & Control</Badge>
            <span className="text-xs text-rf-charcoal font-medium">Control.Evo Engine</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-rf-black mt-1">
            Caja & KPIs Financieros
          </h1>
        </div>
      </div>

      {/* Pagos de Hoy — dato real, sale de los turnos con seña efectivamente cobrada hoy */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-rf-rose-deep" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-rf-black">Pagos de Hoy</h3>
          </div>
          <Badge variant="success">{formatCurrency(totalPagosHoy)}</Badge>
        </div>

        {pagosDeHoy.length === 0 ? (
          <p className="text-xs text-rf-charcoal">Todavía no se registraron pagos hoy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-rf-cream text-rf-charcoal uppercase font-bold text-[10px] border-b border-pink-100">
                <tr>
                  <th className="p-2.5">Hora del pago</th>
                  <th className="p-2.5">Clienta</th>
                  <th className="p-2.5">Servicio</th>
                  <th className="p-2.5">Profesional</th>
                  <th className="p-2.5">Estado</th>
                  <th className="p-2.5">Seña cobrada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100">
                {pagosDeHoy.map((t) => (
                  <tr key={t.id} className="hover:bg-pink-50/30">
                    <td className="p-2.5 font-semibold text-rf-black">
                      {t.fechaCreacion.slice(11, 16)} hs
                    </td>
                    <td className="p-2.5">{getClientaNombre(t.clientaId)}</td>
                    <td className="p-2.5">{getServicioNombre(t.servicioId)}</td>
                    <td className="p-2.5">{getProfesionalNombre(t.profesionalId)}</td>
                    <td className="p-2.5">
                      <StatusPill estado={t.estado} />
                    </td>
                    <td className="p-2.5 font-bold text-emerald-700">{formatCurrency(t.montoSena)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="space-y-2 border-l-4 border-l-rf-rose-deep">
          <span className="text-xs font-semibold text-rf-charcoal">
            Facturación Hoy ({format(hoyDate, 'dd MMM', { locale: es })})
          </span>
          <p className="text-2xl font-bold text-rf-black">{formatCurrency(facturacionHoy)}</p>
          {variacionVsAyer !== null ? (
            <span
              className={`text-[10px] font-bold flex items-center gap-1 ${
                variacionVsAyer >= 0 ? 'text-emerald-700' : 'text-rf-danger'
              }`}
            >
              {variacionVsAyer >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {variacionVsAyer >= 0 ? '+' : ''}
              {variacionVsAyer}% vs ayer
            </span>
          ) : (
            <span className="text-[10px] text-rf-charcoal">Sin facturación ayer para comparar</span>
          )}
        </Card>

        <Card className="space-y-2 border-l-4 border-l-rf-gold-bright">
          <span className="text-xs font-semibold text-rf-charcoal">Facturación Esta Semana</span>
          <p className="text-2xl font-bold text-rf-black">{formatCurrency(facturacionSemana)}</p>
          <span className="text-[10px] text-rf-charcoal">
            Semana del {format(parseISO(inicioSemana), 'dd/MM')} al {format(parseISO(finSemana), 'dd/MM')}
          </span>
        </Card>

        <Card className="space-y-2 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-rf-charcoal">
            Facturación {format(hoyDate, 'MMMM', { locale: es })}
          </span>
          <p className="text-2xl font-bold text-rf-black">{formatCurrency(facturacionMes)}</p>
          <span className="text-[10px] text-rf-charcoal">{turnosDelMes.length} turnos en el mes</span>
        </Card>

        <Card className="space-y-2 border-l-4 border-l-rf-danger">
          <span className="text-xs font-semibold text-rf-charcoal">Tasa de Cancelación (30 días)</span>
          <p className="text-2xl font-bold text-rf-black">{tasaCancelacion.toFixed(1)}%</p>
          <span className="text-[10px] text-rf-charcoal font-bold">
            {etiquetaTasaCancelacion} — seña no reembolsable
          </span>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Income Line Chart */}
        <Card className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rf-black">
              Evolución de Facturación (Últimos 30 días)
            </h3>
            <Badge variant="rose">ARS $</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataFacturacion30Dias}>
                <defs>
                  <linearGradient id="colorFacturacion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C46E88" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C46E88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Area
                  type="monotone"
                  dataKey="monto"
                  stroke="#C46E88"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorFacturacion)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Bar Chart per Professional */}
        <Card className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rf-black">
              Facturación por Profesional
            </h3>
            <BarChart3 className="w-4 h-4 text-rf-gold" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingProfesionales}>
                <XAxis dataKey="nombre" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="monto" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Cancellations & Deposit Retention Audit Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-pink-100">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-rf-black">
              Auditoría de Cancelaciones
            </h3>
            <p className="text-xs text-rf-charcoal">
              Turnos cancelados — la seña queda retenida en todos los casos
            </p>
          </div>
        </div>

        {turnosCancelados.length === 0 ? (
          <p className="text-xs text-rf-charcoal">No hay turnos cancelados registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-rf-cream text-rf-charcoal uppercase font-bold text-[10px] border-b border-pink-100">
                <tr>
                  <th className="p-3">Clienta</th>
                  <th className="p-3">Fecha Cita</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Monto Seña</th>
                  <th className="p-3">Notas Internas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100">
                {turnosCancelados.map((t) => (
                  <tr key={t.id} className="hover:bg-pink-50/30">
                    <td className="p-3 font-semibold text-rf-black">{getClientaNombre(t.clientaId)}</td>
                    <td className="p-3">{t.fecha}</td>
                    <td className="p-3">
                      <StatusPill estado={t.estado} />
                    </td>
                    <td className="p-3 font-bold text-rf-black">
                      {formatCurrency(t.montoSena)}
                    </td>
                    <td className="p-3 text-rf-charcoal italic">{t.notasInternas || 'Sin observaciones'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
