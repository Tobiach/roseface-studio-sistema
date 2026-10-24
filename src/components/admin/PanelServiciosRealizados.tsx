// src/components/admin/PanelServiciosRealizados.tsx
//
// Panel del modal de turno para confirmar que la clienta vino y cargar los
// servicios extra que se hizo en el momento (muchas suman algo distinto
// presencialmente). El total que se guarda alimenta Comisiones y Caja, que
// leen Turno.montoTotal — no hace falta nada especial en esos paneles.
import React, { useMemo, useState } from 'react';
import { Plus, X, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import type { Profesional, Servicio, ServicioExtra, Turno } from '../../types';

interface Props {
  turno: Turno;
  servicioBase?: Servicio;
  profesional?: Profesional;
  servicios: Servicio[];
  // 'confirmar' = el turno todavía no se completó; 'editar' = ya estaba completado.
  modo: 'confirmar' | 'editar';
  // En modo 'editar' (turno ya completado), cambiar el servicio es solo de Yosy
  // (mismo criterio que "Editar reserva" — cambia comisiones ya liquidadas). El
  // servidor lo exige igual; esto solo evita mostrar una opción que va a rebotar.
  puedeCambiarServicio: boolean;
  onGuardar: (cambios: { servicioId?: string; extras: ServicioExtra[] }) => Promise<void>;
  onCancelar: () => void;
}

const OPCION_MANUAL = '__manual__';

export const PanelServiciosRealizados: React.FC<Props> = ({
  turno,
  servicioBase,
  profesional,
  servicios,
  modo,
  puedeCambiarServicio,
  onGuardar,
  onCancelar,
}) => {
  const [extras, setExtras] = useState<ServicioExtra[]>(turno.serviciosExtra ?? []);
  const [opcion, setOpcion] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [guardando, setGuardando] = useState(false);
  // 24/10/2026 (pedido de Tobias): se puede corregir qué servicio PRINCIPAL se
  // hizo de verdad (reservó Clásicas, se hizo Híbridas) — no solo sumar extras.
  const [cambiandoServicio, setCambiandoServicio] = useState(false);
  const [servicioElegidoId, setServicioElegidoId] = useState(turno.servicioId);

  const serviciosQueHaceLaProfesional = useMemo(
    () => (profesional ? servicios.filter((s) => s.profesionalesQueLoRealizan.includes(profesional.id)) : servicios),
    [servicios, profesional]
  );
  const servicioElegido = servicios.find((s) => s.id === servicioElegidoId) ?? servicioBase;
  const cambioServicio = servicioElegidoId !== turno.servicioId;

  // montoTotal ya incluye los extras guardados antes: se descuentan para
  // mostrar el precio del servicio reservado (o el nuevo, si se cambió).
  const precioBase = cambioServicio
    ? servicioElegido?.precio ?? 0
    : turno.montoTotal - (turno.serviciosExtra ?? []).reduce((a, e) => a + e.precio, 0);
  const total = precioBase + extras.reduce((a, e) => a + e.precio, 0);
  // 15/10/2026 (pedido de Tobias): la seña ya se cobró de antemano (por
  // Mercado Pago o por transferencia, según el circuito) — lo que falta
  // cobrarle a la clienta EN el estudio es el total (con los extras ya
  // sumados) menos esa seña, nunca el total completo de nuevo.
  const saldoACobrar = Math.max(0, total - turno.montoSena);

  const serviciosPorCategoria = useMemo(() => {
    const grupos = new Map<string, Servicio[]>();
    for (const s of servicios) grupos.set(s.categoria, [...(grupos.get(s.categoria) ?? []), s]);
    return Array.from(grupos.entries());
  }, [servicios]);

  const elegirOpcion = (valor: string) => {
    setOpcion(valor);
    if (valor.startsWith('adicional:')) {
      const adicional = profesional?.adicionales?.[Number(valor.slice('adicional:'.length))];
      if (adicional) {
        setNombre(adicional.nombre);
        setPrecio(String(adicional.precio));
      }
    } else if (valor.startsWith('servicio:')) {
      const servicio = servicios.find((s) => s.id === valor.slice('servicio:'.length));
      if (servicio) {
        setNombre(servicio.nombre);
        setPrecio(String(servicio.precio));
      }
    } else {
      setNombre('');
      setPrecio('');
    }
  };

  const precioNumerico = Number(precio);
  const puedeAgregar = nombre.trim().length > 0 && precio !== '' && Number.isFinite(precioNumerico) && precioNumerico >= 0;

  const agregar = () => {
    if (!puedeAgregar) return;
    setExtras((prev) => [
      ...prev,
      {
        nombre: nombre.trim(),
        precio: Math.round(precioNumerico),
        servicioId: opcion.startsWith('servicio:') ? opcion.slice('servicio:'.length) : null,
      },
    ]);
    setOpcion('');
    setNombre('');
    setPrecio('');
  };

  const guardar = async () => {
    setGuardando(true);
    await onGuardar({ servicioId: cambioServicio ? servicioElegidoId : undefined, extras });
    setGuardando(false);
  };

  return (
    <div className="space-y-3 pt-2 border-t border-pink-100">
      <label className="text-xs font-bold text-rf-black block">
        {modo === 'confirmar' ? '¿Qué servicios se hizo?' : 'Servicios realizados'}
      </label>

      <div className="rounded-xl border border-pink-200 divide-y divide-pink-100 text-xs">
        {cambiandoServicio ? (
          <div className="px-3 py-2 space-y-1.5">
            <select
              value={servicioElegidoId}
              onChange={(e) => setServicioElegidoId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-pink-200 text-xs bg-white"
            >
              {serviciosQueHaceLaProfesional.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {formatCurrency(s.precio)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setServicioElegidoId(turno.servicioId);
                setCambiandoServicio(false);
              }}
              className="text-[10px] text-gray-400 hover:text-rf-danger cursor-pointer"
            >
              Cancelar cambio
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="min-w-0">
              {servicioElegido?.nombre ?? 'Servicio reservado'}{' '}
              <span className="text-gray-400">{cambioServicio ? '(lo que realmente se hizo)' : '(reservado)'}</span>
              {puedeCambiarServicio && (
                <button
                  type="button"
                  onClick={() => setCambiandoServicio(true)}
                  className="ml-1.5 text-[10px] text-rf-rose-deep hover:underline cursor-pointer"
                >
                  cambiar
                </button>
              )}
            </span>
            <span className="font-semibold shrink-0">{formatCurrency(precioBase)}</span>
          </div>
        )}
        {extras.map((extra, i) => (
          <div key={`${extra.nombre}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="min-w-0 truncate">
              {extra.nombre} <span className="text-gray-400">(extra)</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="font-semibold">{formatCurrency(extra.precio)}</span>
              <button
                type="button"
                aria-label={`Quitar ${extra.nombre}`}
                onClick={() => setExtras((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-rf-danger cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3 py-2 bg-rf-cream">
          <span className="font-bold">Total del turno</span>
          <span className="font-bold text-rf-black">{formatCurrency(total)}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-gray-500">Seña ya cobrada ({turno.circuitoPago === 'transferencia' ? 'transferencia' : 'Mercado Pago'})</span>
          <span className="text-gray-500">− {formatCurrency(turno.montoSena)}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-rf-cream rounded-b-xl">
          <span className="font-bold">Saldo a cobrar en el estudio</span>
          <span className="font-bold text-rf-rose-deep">{formatCurrency(saldoACobrar)}</span>
        </div>
      </div>

      <div className="space-y-2 rounded-xl bg-rf-cream/60 border border-pink-100 p-3">
        <p className="text-[11px] font-bold text-rf-black">Sumar un servicio extra</p>
        <select
          value={opcion}
          onChange={(e) => elegirOpcion(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-pink-200 text-xs bg-white"
        >
          <option value="">Elegí de la lista…</option>
          {profesional?.adicionales && profesional.adicionales.length > 0 && (
            <optgroup label={`Adicionales de ${profesional.nombre}`}>
              {profesional.adicionales.map((a, i) => (
                <option key={a.nombre} value={`adicional:${i}`}>
                  {a.nombre} — {formatCurrency(a.precio)}
                </option>
              ))}
            </optgroup>
          )}
          {serviciosPorCategoria.map(([categoria, lista]) => (
            <optgroup key={categoria} label={categoria}>
              {lista.map((s) => (
                <option key={s.id} value={`servicio:${s.id}`}>
                  {s.nombre} — {formatCurrency(s.precio)}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={OPCION_MANUAL}>Otro (escribirlo a mano)</option>
        </select>

        <div className="grid grid-cols-[1fr_6.5rem] gap-2">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del servicio"
            className="px-3 py-2 rounded-xl border border-pink-200 text-xs bg-white"
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="Precio"
            className="px-3 py-2 rounded-xl border border-pink-200 text-xs bg-white"
          />
        </div>
        <Button type="button" variant="outline" size="sm" fullWidth disabled={!puedeAgregar} onClick={agregar}>
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar al turno</span>
        </Button>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancelar} disabled={guardando}>
          Volver
        </Button>
        <Button variant="primary" size="sm" onClick={guardar} disabled={guardando}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>
            {guardando ? 'Guardando…' : modo === 'confirmar' ? 'Confirmar que vino' : 'Guardar cambios'}
          </span>
        </Button>
      </div>
    </div>
  );
};
