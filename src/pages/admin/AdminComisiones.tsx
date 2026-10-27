// src/pages/admin/AdminComisiones.tsx
import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calcularCierreSemanal, resumenReservasMercadoPago } from '../../lib/comisionesEngine';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/formatters';
import { hoyISO, sumarDiasISO } from '../../lib/disponibilidad';
import { DESCUENTO_MP_DESDE, DESCUENTO_MP_POR_RESERVA, descuentoMercadoPago } from '../../lib/pricing';
import {
  CircleDollarSign,
  Calendar,
  Building,
  UserCheck,
  Percent,
  KeyRound,
  CheckCircle,
  Info,
  CreditCard,
} from 'lucide-react';

const fmtCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export const AdminComisiones: React.FC = () => {
  const { profesionales, turnos, rolActivo, profesionalActivoId } = useApp();
  const esProfesional = rolActivo === 'profesional';

  // Lunes de la semana actual (lunes a domingo), calculado desde hoy.
  const { lunesActual, lunesPasado } = useMemo(() => {
    const hoy = hoyISO();
    const diaSemana = new Date(`${hoy}T12:00:00`).getDay(); // 0=domingo..6=sábado
    const offsetALunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const actual = sumarDiasISO(hoy, offsetALunes);
    return { lunesActual: actual, lunesPasado: sumarDiasISO(actual, -7) };
  }, []);

  // Rango de fechas del cierre — antes era un desplegable con 3 semanas de
  // agosto 2026 hardcodeadas (y después, 8 semanas calculadas desde hoy pero
  // topadas ahí): pasado ese tope no había forma de ver una semana más vieja,
  // ni una futura, ni un rango que no fuera "una semana exacta". Ahora son 2
  // accesos rápidos (semana actual/pasada) + un rango libre sin tope, mismo
  // patrón que "Rango a elección" de la Agenda (25/10, pedido de Tobias).
  const [semanaInicio, setSemanaInicio] = useState<string>(lunesActual);
  const [semanaFin, setSemanaFin] = useState<string>(sumarDiasISO(lunesActual, 6));
  const [presetActivo, setPresetActivo] = useState<'actual' | 'pasada' | 'rango'>('actual');

  const irASemanaActual = () => {
    setSemanaInicio(lunesActual);
    setSemanaFin(sumarDiasISO(lunesActual, 6));
    setPresetActivo('actual');
  };
  const irASemanaPasada = () => {
    setSemanaInicio(lunesPasado);
    setSemanaFin(sumarDiasISO(lunesPasado, 6));
    setPresetActivo('pasada');
  };

  // Un profesional solo ve su propio cierre — no el del resto del equipo
  const profesionalesVisibles = esProfesional
    ? profesionales.filter((p) => p.id === profesionalActivoId)
    : profesionales;

  // Compute closure for visible professionals
  const cierres = profesionalesVisibles.map((prof) =>
    calcularCierreSemanal(prof, turnos, semanaInicio, semanaFin)
  );

  // Consolidated totals
  const totalFacturacion = cierres.reduce((sum, c) => sum + c.facturacionTotal, 0);
  const totalBruta = cierres.reduce((sum, c) => sum + c.facturacionBruta, 0);
  const totalDescuentoMP = cierres.reduce((sum, c) => sum + c.descuentoMercadoPago, 0);
  const totalReservasMP = cierres.reduce((sum, c) => sum + c.reservasMercadoPago, 0);
  const totalComisionesPagadas = cierres.reduce((sum, c) => sum + c.montoComisionProfesional, 0);
  const totalNetoEstudio = cierres.reduce((sum, c) => sum + c.montoParaEstudio, 0);

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
            {esProfesional ? 'Mi Cierre Semanal' : 'Cierre Semanal de Comisiones'}
          </h1>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Calendar className="w-4 h-4 text-rf-rose-deep shrink-0" />
            <button
              onClick={irASemanaActual}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                presetActivo === 'actual'
                  ? 'bg-rf-rose-deep text-white border-rf-rose-deep'
                  : 'bg-white text-rf-charcoal border-pink-200 hover:border-rf-rose'
              }`}
            >
              Semana actual
            </button>
            <button
              onClick={irASemanaPasada}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                presetActivo === 'pasada'
                  ? 'bg-rf-rose-deep text-white border-rf-rose-deep'
                  : 'bg-white text-rf-charcoal border-pink-200 hover:border-rf-rose'
              }`}
            >
              Semana pasada
            </button>
            <button
              onClick={() => setPresetActivo('rango')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                presetActivo === 'rango'
                  ? 'bg-rf-rose-deep text-white border-rf-rose-deep'
                  : 'bg-white text-rf-charcoal border-pink-200 hover:border-rf-rose'
              }`}
            >
              Rango a elección
            </button>
          </div>

          {presetActivo === 'rango' ? (
            <div className="flex items-end gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-rf-charcoal block mb-1">Desde</label>
                <input
                  type="date"
                  value={semanaInicio}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSemanaInicio(v);
                    if (v > semanaFin) setSemanaFin(v);
                  }}
                  className="px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-rf-rose-deep"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-rf-charcoal block mb-1">Hasta</label>
                <input
                  type="date"
                  value={semanaFin}
                  min={semanaInicio}
                  onChange={(e) => setSemanaFin(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-pink-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-rf-rose-deep"
                />
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-rf-charcoal font-semibold">
              {fmtCorta(semanaInicio)} a {fmtCorta(semanaFin)}
            </p>
          )}
        </div>
      </div>

      {/* Aclaración del cargo de gestión — la ven todas (profesionales y dueña): no
          nombra porcentajes ni lo que se queda el estudio. */}
      <Card className="bg-violet-50/60 border-violet-200 space-y-1.5">
        <div className="flex items-center gap-2 text-violet-900 font-bold text-xs uppercase tracking-wider">
          <CreditCard className="w-4 h-4" />
          <span>Reservas con cargo de gestión</span>
        </div>
        <p className="text-xs text-violet-950 leading-relaxed">
          Estos servicios ya traen <strong>{formatCurrency(DESCUENTO_MP_POR_RESERVA)}</strong> de más en el precio,
          haya pagado la clienta la seña por Mercado Pago o por transferencia.
          Ese monto se <strong>resta de la facturación antes de calcular los porcentajes</strong> (cuando la reserva se
          marca como “Vino”), así el reparto sale justo {esProfesional ? 'para vos y para el estudio' : 'para cada profesional y para el estudio'}. Las
          reservas cobradas en efectivo en el estudio, sin seña adelantada, no tienen ese cargo. Abajo ves cuántas reservas
          con cargo de gestión tiene {esProfesional ? 'a tu nombre' : 'cada profesional'}, apenas la clienta paga.
        </p>
      </Card>

      {/* Explicación del cálculo — SOLO la dueña. Nombra los % y el modelo de
          cada una (ej. "Mili 55%, Roma 45%"), así que una profesional no
          debe verla nunca — no tiene que saber la modalidad ni el % de las
          demás, ni cuánto se queda el estudio. */}
      {!esProfesional && (
      <Card className="bg-sky-50/60 border-sky-200 space-y-2">
        <div className="flex items-center gap-2 text-sky-900 font-bold text-xs uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>¿Cómo se calcula la comisión de cada profesional?</span>
        </div>
        <ul className="text-xs text-sky-950 space-y-1.5 leading-relaxed">
          <li>
            • Solo se cuentan los turnos marcados como <strong>Completado</strong> dentro del período
            elegido — un turno reservado o cancelado no suma facturación.
            Si la clienta se hizo servicios extra en el momento, se cargan al confirmar que vino y suman al total del turno.
          </li>
          <li>
            • <strong>Modelo Porcentaje</strong> (ej. Mili 55%, Roma 45%): Rose Face cobra el turno
            completo y le paga a la profesional ese % sobre la facturación total generada; el resto
            queda para Rose Face.
          </li>
          <li>
            • <strong>Modelo Alquiler Fijo</strong> (ej. Cris, Ari):
            la profesional paga un monto semanal fijo y se queda con el 100% de lo que
            factura directamente — no se le retiene comisión sobre sus turnos.
          </li>
        </ul>
      </Card>
      )}

      {/* Consolidated Summary Banner — solo la dueña ve la facturación total del estudio */}
      {!esProfesional && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-pink-50 to-white space-y-2 border border-pink-200">
          <div className="flex items-center justify-between text-rf-charcoal text-xs font-semibold">
            <span>Facturación Bruta Generada</span>
            <CircleDollarSign className="w-4 h-4 text-rf-rose-deep" />
          </div>
          <p className="text-2xl font-bold text-rf-black">{formatCurrency(totalBruta)}</p>
          <p className="text-[11px] text-gray-500">
            {totalDescuentoMP > 0
              ? `− ${formatCurrency(totalDescuentoMP)} de cargo de gestión (${totalReservasMP} reserva${totalReservasMP === 1 ? '' : 's'}) → base de cálculo ${formatCurrency(totalFacturacion)}`
              : 'Total recaudado por servicios prestados'}
          </p>
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
      )}

      {/* Cards per Professional */}
      <div className="space-y-4">
        {!esProfesional && (
          <h2 className="text-sm font-bold uppercase tracking-wider text-rf-charcoal">
            Detalle por Profesional ({profesionalesVisibles.length})
          </h2>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cierres.map((cierre) => {
            const prof = profesionales.find((p) => p.id === cierre.profesionalId);
            if (!prof) return null;

            const esPorcentaje = prof.modeloComision.tipo === 'porcentaje';
            const mp = resumenReservasMercadoPago(prof.id, turnos, semanaInicio, semanaFin);
            const mpSemana = mp.atendidasSemana + mp.porAtenderSemana;
            const reservas = (n: number) => `${n} reserva${n === 1 ? '' : 's'}`;

            // Facturación de hoy (pedido 25/10): mismo criterio que el cierre semanal
            // (solo turnos completados), pero del día en curso.
            const turnosHoyProf = turnos.filter(
              (t) => t.profesionalId === prof.id && t.estado === 'completado' && t.fecha === hoyISO()
            );
            const facturacionHoyProf = turnosHoyProf.reduce((sum, t) => sum + t.montoTotal, 0);
            const reservasConCargoHoy = turnosHoyProf.filter((t) => descuentoMercadoPago(t) > 0).length;

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

                  {/* Reservas con cargo de gestión a nombre de esta profesional (las que ya
                      vinieron y las que todavía no): cada una trae el descuento, sea por MP o transferencia. */}
                  {(esPorcentaje || mp.totalReservas > 0) && (
                    <div className="rounded-xl bg-violet-50/70 border border-violet-200 p-2.5 text-[11px] text-violet-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-violet-900 uppercase tracking-wider text-[10px]">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Reservas con cargo de gestión</span>
                      </div>
                      <p>
                        En el período elegido: <strong>{reservas(mpSemana)}</strong> × {formatCurrency(DESCUENTO_MP_POR_RESERVA)} ={' '}
                        <strong>{formatCurrency(mpSemana * DESCUENTO_MP_POR_RESERVA)}</strong>
                      </p>
                      {mpSemana > 0 && (
                        <p className="text-violet-800">
                          {mp.atendidasSemana} ya atendida{mp.atendidasSemana === 1 ? '' : 's'} (se descuenta
                          {mp.atendidasSemana === 1 ? '' : 'n'}) · {mp.porAtenderSemana} por atender (se descuenta
                          {mp.porAtenderSemana === 1 ? '' : 'n'} cuando se marque “Vino”)
                        </p>
                      )}
                      <p>
                        Total desde el {DESCUENTO_MP_DESDE.slice(8, 10)}/{DESCUENTO_MP_DESDE.slice(5, 7)}:{' '}
                        <strong>{reservas(mp.totalReservas)}</strong> {esProfesional ? 'a tu nombre' : `a nombre de ${prof.nombre}`}
                      </p>
                    </div>
                  )}

                  {/* Facturación de hoy (pedido 25/10): da el pulso del día, no espera al cierre semanal. */}
                  <div className="rounded-xl bg-pink-50/70 border border-pink-100 p-2.5 text-[11px] text-rf-charcoal flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-rf-rose-deep">Facturación de hoy</span>
                    <span className="font-bold text-rf-black text-sm">
                      {formatCurrency(facturacionHoyProf)}
                      {reservasConCargoHoy > 0 && (
                        <span className="text-[10px] font-normal text-violet-800 block text-right">
                          incluye {reservasConCargoHoy} con cargo de gestión
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Calculations Details — a una profesional (modelo %) ya NO se le muestra el
                      total facturado ni la base de cálculo (25/10, pedido de Tobias: que no se vea
                      tan gráficamente cuánto facturó el estudio y cuánto va para ella) — solo el
                      cargo de gestión aplicado y, más abajo, su monto final a liquidar. */}
                  <div className="space-y-2 text-xs">
                    {!esProfesional && (
                      <div className="flex justify-between py-1 border-b border-pink-50">
                        <span className="text-rf-charcoal">Facturación Generada:</span>
                        <span className="font-semibold text-rf-black">
                          {formatCurrency(cierre.facturacionBruta)}
                        </span>
                      </div>
                    )}

                    {cierre.descuentoMercadoPago > 0 && (
                      <div className="flex justify-between py-1 border-b border-pink-50 text-violet-800">
                        <span>
                          Cargo de gestión ({cierre.reservasMercadoPago} reserva{cierre.reservasMercadoPago === 1 ? '' : 's'} × {formatCurrency(DESCUENTO_MP_POR_RESERVA)}):
                        </span>
                        <span className="font-semibold">− {formatCurrency(cierre.descuentoMercadoPago)}</span>
                      </div>
                    )}

                    {!esProfesional && cierre.descuentoMercadoPago > 0 && (
                      <div className="flex justify-between py-1 border-b border-pink-50">
                        <span className="text-rf-charcoal">Base para el cálculo:</span>
                        <span className="font-semibold text-rf-black">{formatCurrency(cierre.facturacionTotal)}</span>
                      </div>
                    )}

                    {esPorcentaje ? (
                      <>
                        <div className="flex justify-between py-1 border-b border-pink-50 bg-pink-50/50 px-2 rounded-lg">
                          <span className="font-semibold text-rf-rose-deep">
                            {esProfesional
                              ? `Tu monto a liquidar (${prof.modeloComision.porcentajeProfesional}%):`
                              : `A Pagar a ${prof.nombre} (${prof.modeloComision.porcentajeProfesional}%):`}
                          </span>
                          <span className="font-bold text-rf-rose-deep">
                            {formatCurrency(cierre.montoComisionProfesional)}
                          </span>
                        </div>
                        {/* El corte del estudio NUNCA se muestra a la profesional —
                            solo le corresponde saber su propio monto a liquidar. */}
                        {!esProfesional && (
                          <div className="flex justify-between py-1 border-b border-pink-50">
                            <span className="text-rf-charcoal">
                              Rose Face ({100 - prof.modeloComision.porcentajeProfesional}%):
                            </span>
                            <span className="font-bold text-emerald-800">
                              {formatCurrency(cierre.montoParaEstudio)}
                            </span>
                          </div>
                        )}
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
                        <div className="flex justify-between py-1 bg-pink-50/50 px-2 rounded-lg">
                          <span className="font-semibold text-rf-rose-deep">
                            {esProfesional ? 'Tu monto a liquidar:' : 'Ingreso Neto para Rose Face:'}
                          </span>
                          <span className="font-bold text-rf-rose-deep">
                            {formatCurrency(esProfesional ? cierre.facturacionTotal : cierre.montoParaEstudio)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="pt-3 border-t border-pink-100 flex items-center text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Liquidado
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
