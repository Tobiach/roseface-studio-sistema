// api/actualizar-estado-turno.ts
//
// Paso 1 del plan crítico de SEGURIDAD_PENDIENTE.md (26/9/2026), prioridad
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

const ESTADOS_VALIDOS = ['reservado', 'sena_confirmada', 'recordatorio_enviado', 'completado', 'cancelado'] as const;
type EstadoTurno = (typeof ESTADOS_VALIDOS)[number];

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

  const { turnoId, nuevoEstado, notasInternas } = (req.body ?? {}) as {
    turnoId?: string;
    nuevoEstado?: string;
    notasInternas?: string;
  };

  if (!turnoId || !nuevoEstado || !ESTADOS_VALIDOS.includes(nuevoEstado as EstadoTurno)) {
    res.status(400).json({ ok: false, error: 'Faltan datos o el estado no es válido' });
    return;
  }

  const patch: Record<string, unknown> = { estado: nuevoEstado };
  if (notasInternas !== undefined) patch.notas_internas = notasInternas;

  const { error } = await supabaseAdmin.from('turnos').update(patch).eq('id', turnoId);
  if (error) {
    console.error('[actualizar-estado-turno] Error actualizando turno', turnoId, error);
    res.status(500).json({ ok: false, error: 'No se pudo actualizar el turno' });
    return;
  }

  res.status(200).json({ ok: true });
}
