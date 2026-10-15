// api/actualizar-estado-turno.ts
//
// Paso 1 del plan crítico de docs/SEGURIDAD_PENDIENTE.md (26/9/2026), prioridad
// 3 (la de más superficie de uso: marcar completado/cancelado desde
// AdminAgenda, y el fallback de demo de Reserva.tsx cuando no hay Mercado
// Pago real disponible). Antes era un UPDATE directo desde el navegador con
// el anon key — cualquiera podía marcar cualquier turno como completado,
// cancelado o con la seña confirmada, sin pasar por ningún panel.
//
// Nota: esto no agrega autenticación real (sigue sin haber sesión que
// distinga "lo pide Yosy/la profesional desde el panel" de "lo pide
// cualquiera") — eso es el Paso 3, deferred. Lo que sí resuelve: ya no se
// puede llamar directo a Supabase con el anon key público; hay que pasar
// por este endpoint, que al menos valida que el estado sea uno de los
// válidos y que el turno exista.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// 11/10/2026 — auditoría de seguridad: 'sena_confirmada' se sacó a propósito
// de los estados permitidos acá. Este endpoint no verifica que haya un pago
// real detrás (no hay sesión, cualquiera con la URL pública puede llamarlo
// con cualquier turnoId) — sin este límite, cualquiera podía marcar
// cualquier turno como "seña pagada" sin pagar nada. Esa transición ahora
// SOLO puede pasar por los 2 caminos que sí verifican plata de verdad:
// api/mercadopago/webhook.ts (confirma contra la API real de MP) y
// api/aprobar-comprobante.ts (requiere comprobante ya subido). Ni
// AdminAgenda.tsx ni ningún otro uso legítimo de este endpoint necesitaba
// 'sena_confirmada' — confirmado por grep antes de sacarlo.
const ESTADOS_VALIDOS = ['reservado', 'recordatorio_enviado', 'completado', 'cancelado'] as const;
type EstadoTurno = (typeof ESTADOS_VALIDOS)[number];

// Servicios extra cargados al confirmar que la clienta vino (ver
// ServicioExtra en src/types). Se limpia todo acá: nada del navegador se
// guarda tal cual. Devuelve null si algo no cierra.
interface ServicioExtra {
  nombre: string;
  precio: number;
  servicioId?: string | null;
}

const MAX_EXTRAS = 20;
const MAX_PRECIO_EXTRA = 5_000_000;

function validarExtras(valor: unknown): ServicioExtra[] | null {
  if (!Array.isArray(valor) || valor.length > MAX_EXTRAS) return null;
  const limpios: ServicioExtra[] = [];
  for (const item of valor) {
    const { nombre, precio, servicioId } = (item ?? {}) as Partial<ServicioExtra>;
    const nombreLimpio = typeof nombre === 'string' ? nombre.trim().slice(0, 80) : '';
    if (!nombreLimpio) return null;
    if (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0 || precio > MAX_PRECIO_EXTRA) return null;
    limpios.push({
      nombre: nombreLimpio,
      precio: Math.round(precio),
      servicioId: typeof servicioId === 'string' && servicioId ? servicioId.slice(0, 64) : null,
    });
  }
  return limpios;
}

const sumar = (extras: ServicioExtra[]) => extras.reduce((acc, e) => acc + (Number(e.precio) || 0), 0);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Supabase no configurado en el servidor' });
    return;
  }

  const { turnoId, nuevoEstado, notasInternas, serviciosExtra } = (req.body ?? {}) as {
    turnoId?: string;
    nuevoEstado?: string;
    notasInternas?: string;
    serviciosExtra?: unknown;
  };

  const traeExtras = serviciosExtra !== undefined;
  const estadoValido = !!nuevoEstado && ESTADOS_VALIDOS.includes(nuevoEstado as EstadoTurno);

  // Con extras, el estado es opcional (se puede editar el desglose de un turno
  // ya completado); sin extras, el estado sigue siendo obligatorio como siempre.
  if (!turnoId || (nuevoEstado !== undefined && !estadoValido) || (!traeExtras && !estadoValido)) {
    res.status(400).json({ ok: false, error: 'Faltan datos o el estado no es válido' });
    return;
  }

  const patch: Record<string, unknown> = {};
  if (estadoValido) patch.estado = nuevoEstado;
  if (notasInternas !== undefined) patch.notas_internas = notasInternas;

  let montoTotalNuevo: number | undefined;
  let extrasLimpios: ServicioExtra[] | undefined;

  if (traeExtras) {
    extrasLimpios = validarExtras(serviciosExtra);
    if (!extrasLimpios) {
      res.status(400).json({ ok: false, error: 'Los servicios extra no son válidos' });
      return;
    }

    // El total lo calcula el servidor a partir de lo que ya tiene el turno —
    // el navegador nunca manda un monto, solo el desglose de extras. El
    // total actual ya incluye los extras previos, así que se descuentan para
    // recuperar el precio base antes de volver a sumar la lista nueva.
    const { data: turno, error: errLectura } = await supabaseAdmin
      .from('turnos')
      .select('estado, monto_total, servicios_extra')
      .eq('id', turnoId)
      .maybeSingle();
    if (errLectura) {
      console.error('[actualizar-estado-turno] No se pudo leer el turno', turnoId, errLectura);
      res.status(500).json({
        ok: false,
        error: 'No se pudieron leer los extras del turno (¿falta la columna servicios_extra en Supabase?)',
      });
      return;
    }
    if (!turno) {
      res.status(404).json({ ok: false, error: 'El turno no existe' });
      return;
    }
    if (turno.estado === 'cancelado') {
      res.status(400).json({ ok: false, error: 'No se pueden cargar extras a un turno cancelado' });
      return;
    }

    const extrasPrevios = Array.isArray(turno.servicios_extra) ? (turno.servicios_extra as ServicioExtra[]) : [];
    const base = Number(turno.monto_total) - sumar(extrasPrevios);
    montoTotalNuevo = Math.max(0, base) + sumar(extrasLimpios);
    patch.monto_total = montoTotalNuevo;
    patch.servicios_extra = extrasLimpios;
  }

  const { error } = await supabaseAdmin.from('turnos').update(patch).eq('id', turnoId);
  if (error) {
    console.error('[actualizar-estado-turno] Error actualizando turno', turnoId, error);
    res.status(500).json({ ok: false, error: 'No se pudo actualizar el turno' });
    return;
  }

  res.status(200).json({ ok: true, montoTotal: montoTotalNuevo, serviciosExtra: extrasLimpios });
}
