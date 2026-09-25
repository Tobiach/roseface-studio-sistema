// src/pages/admin/AdminClientasRecurrentes.tsx
// Antes era un widget adentro de AdminAgenda.tsx ("Avisos de Recurrencia") —
// promovido a su propia sección del panel (25/9/2026, pedido de Tobias),
// exclusiva de Yosy (nunca de una profesional individual, mismo criterio
// que Caja/VIP). El link que se manda ya trae el nombre/teléfono de esa
// clienta puntual precargados (ver ?nombre=&telefono= en Reserva.tsx) y
// ahora se manda con 1 click directo al WhatsApp de la clienta, en vez de
// copiarlo para pegarlo a mano.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Turno, Clienta, Servicio, Profesional } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { mensajeClientaRecurrente, buildWhatsAppUrlPara } from '../../lib/whatsapp';
import { Repeat, MessageCircle, Phone } from 'lucide-react';

export const AdminClientasRecurrentes: React.FC = () => {
  const { rolActivo, turnos, servicios, clientas, profesionales, showToast } = useApp();

  // Vista exclusiva de Yosy — mismo criterio que Caja/VIP (el router
  // también la bloquea por URL directa, esto es el resguardo del componente).
  if (rolActivo === 'profesional') {
    return <Navigate to="/admin/agenda" replace />;
  }

  // Clientas cuyo último turno completado de un servicio con ciclo
  // conocido (ej. retoque de pestañas ~21 días) está por cumplir ese
  // ciclo. Avisa ~4 días ANTES (no el día que ya se cumplió) para darle
  // tiempo a Yosy de escribirle y que la clienta pueda pagar la seña y
  // sacar turno antes de la fecha ideal — sigue apareciendo (cada vez más
  // urgente) si no se llegó a avisar a tiempo, hasta que reserva de nuevo.
  const DIAS_ANTICIPACION_RECURRENCIA = 4;
  const clientasRecurrentes = (() => {
    const hoy = new Date();
    const ultimoPorClientaYServicio = new Map<string, Turno>();
    for (const t of turnos) {
      if (t.estado !== 'completado') continue;
      const key = `${t.clientaId}|${t.servicioId}`;
      const actual = ultimoPorClientaYServicio.get(key);
      if (!actual || t.fecha > actual.fecha) ultimoPorClientaYServicio.set(key, t);
    }

    const resultados: { clienta: Clienta; servicio: Servicio; profesional?: Profesional; diasParaElCiclo: number }[] = [];
    for (const [, turno] of ultimoPorClientaYServicio) {
      const servicio = servicios.find((s) => s.id === turno.servicioId);
      if (!servicio?.cicloRecurrenciaDias) continue;
      const diasSinVisitar = Math.floor(
        (hoy.getTime() - new Date(`${turno.fecha}T12:00:00`).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diasSinVisitar < servicio.cicloRecurrenciaDias - DIAS_ANTICIPACION_RECURRENCIA) continue;
      const clienta = clientas.find((c) => c.id === turno.clientaId);
      if (!clienta) continue;
      resultados.push({
        clienta,
        servicio,
        profesional: profesionales.find((p) => p.id === turno.profesionalId),
        diasParaElCiclo: servicio.cicloRecurrenciaDias - diasSinVisitar,
      });
    }
    return resultados.sort((a, b) => a.diasParaElCiclo - b.diasParaElCiclo);
  })();

  const enviarPorWhatsApp = (clienta: Clienta, servicio: Servicio, profesional?: Profesional) => {
    if (!profesional) {
      showToast('❌ Esta clienta no tiene una profesional habitual asignada.');
      return;
    }
    const params = new URLSearchParams({
      profesionalId: profesional.id,
      nombre: clienta.nombre,
      telefono: clienta.telefono,
      origen: 'recurrencia',
    });
    const link = `${window.location.origin}/reserva?${params.toString()}`;
    const mensaje = mensajeClientaRecurrente({ nombreClienta: clienta.nombre, servicio: servicio.nombre, link });
    window.open(buildWhatsAppUrlPara(clienta.telefono, mensaje), '_blank');
  };

  return (
    <div className="space-y-6 font-admin">
      <div className="pb-4 border-b border-pink-100">
        <div className="flex items-center gap-2">
          <Badge variant="gold">Recurrencia</Badge>
          <span className="text-xs text-rf-charcoal font-medium">Control.Evo Engine</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-rf-black mt-1">
          Clientas Recurrentes
        </h1>
        <p className="text-xs text-rf-charcoal mt-1 max-w-xl">
          Clientas que ya deberían estar volviendo (retoque de pestañas, uñas, depilación, etc.) —
          avisa unos días antes de que se cumpla el ciclo para que te dé tiempo de escribirles.
        </p>
      </div>

      {clientasRecurrentes.length === 0 ? (
        <Card className="text-center py-10 space-y-2">
          <Repeat className="w-8 h-8 text-rf-rose-deep mx-auto" />
          <p className="text-sm text-rf-charcoal">
            Por ahora no hay ninguna clienta por avisar. Van a ir apareciendo acá a medida que se
            acerque la fecha de su próximo retoque.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientasRecurrentes.map(({ clienta, servicio, profesional, diasParaElCiclo }) => (
            <Card key={`${clienta.id}-${servicio.id}`} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-base text-rf-black">{clienta.nombre}</span>
                <Badge variant={diasParaElCiclo < 0 ? 'danger' : 'warning'} size="sm">
                  {diasParaElCiclo >= 0 ? `Faltan ${diasParaElCiclo} días` : `Atrasada ${Math.abs(diasParaElCiclo)} días`}
                </Badge>
              </div>
              <p className="text-xs text-rf-charcoal">
                {servicio.nombre} con {profesional?.nombre ?? 'su profesional habitual'}
              </p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                {clienta.telefono}
              </p>
              <button
                onClick={() => enviarPorWhatsApp(clienta, servicio, profesional)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Enviarle el link por WhatsApp</span>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
