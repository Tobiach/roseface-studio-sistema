// src/components/layout/NotificacionesBell.tsx
// Campanita de notificaciones en el panel de Yosy (25/9/2026) — muestra los
// mismos eventos que disparan el mail automático a rosefacestudio@gmail.com
// (un turno que pasó a "sena_confirmada", por Mercado Pago o por
// transferencia aprobada), para verlos sin salir del sitio. El badge cuenta
// los que todavía no vio — se marca como visto al abrir la campanita.
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateReadable } from '../../lib/formatters';
import { Bell } from 'lucide-react';

const CLAVE_ULTIMA_VISTA = 'rf_notificaciones_vistas_desde';

export const NotificacionesBell: React.FC = () => {
  const { turnos, servicios, clientas, profesionales } = useApp();
  const [abierta, setAbierta] = useState(false);
  const [vistasDesde, setVistasDesde] = useState<string>(() => {
    try {
      return localStorage.getItem(CLAVE_ULTIMA_VISTA) ?? new Date(0).toISOString();
    } catch {
      return new Date(0).toISOString();
    }
  });

  const confirmadosRecientes = turnos
    .filter((t) => t.estado === 'sena_confirmada')
    .sort((a, b) => (a.fechaCreacion < b.fechaCreacion ? 1 : -1))
    .slice(0, 8);

  const sinVer = confirmadosRecientes.filter((t) => t.fechaCreacion > vistasDesde).length;

  const abrir = () => {
    setAbierta((v) => !v);
    const ahora = new Date().toISOString();
    setVistasDesde(ahora);
    try {
      localStorage.setItem(CLAVE_ULTIMA_VISTA, ahora);
    } catch {
      // localStorage puede fallar (privado/bloqueado) — no es crítico acá.
    }
  };

  // Cerrar al tocar afuera.
  useEffect(() => {
    if (!abierta) return;
    const cerrar = () => setAbierta(false);
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, [abierta]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={abrir}
        aria-label="Notificaciones"
        className="relative p-2 rounded-lg text-rf-charcoal hover:text-rf-rose-deep hover:bg-rf-cream transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {sinVer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rf-rose-deep text-white text-[9px] font-bold flex items-center justify-center">
            {sinVer > 9 ? '9+' : sinVer}
          </span>
        )}
      </button>

      {abierta && (
        <div className="absolute left-0 top-full mt-2 w-72 max-h-96 overflow-y-auto bg-white rounded-2xl border border-pink-200 shadow-xl z-50 p-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-rf-charcoal px-2 py-1.5">
            Turnos confirmados recientes
          </p>
          {confirmadosRecientes.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-3">Todavía no hay ninguno.</p>
          ) : (
            <div className="space-y-1">
              {confirmadosRecientes.map((t) => {
                const clienta = clientas.find((c) => c.id === t.clientaId);
                const servicio = servicios.find((s) => s.id === t.servicioId);
                const profesional = profesionales.find((p) => p.id === t.profesionalId);
                return (
                  <div key={t.id} className="px-2 py-2 rounded-xl hover:bg-rf-cream text-xs">
                    <p className="font-bold text-rf-black">{clienta?.nombre ?? 'Clienta'}</p>
                    <p className="text-[11px] text-rf-charcoal">
                      {servicio?.nombre ?? 'Servicio'} con {profesional?.nombre ?? '—'}
                    </p>
                    <p className="text-[10px] text-gray-400">{formatDateReadable(t.fecha)}</p>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-gray-400 px-2 pt-2 border-t border-pink-50 mt-1">
            Estos mismos avisos también te llegan por mail a rosefacestudio@gmail.com.
          </p>
        </div>
      )}
    </div>
  );
};
