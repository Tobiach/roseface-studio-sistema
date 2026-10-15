// api/marcar-sena-manual.ts
//
// Registra (o deshace) que la seña de un turno CARGADO A MANO ya fue abonada.
// Los turnos del sitio nunca pasan por acá: su seña la confirman solo el
// webhook de Mercado Pago o la aprobación de comprobante (ver
// api/actualizar-estado-turno.ts, 11/10/2026). En un turno manual no hay
// ningún sistema de pago que lo verifique — lo atesta Yosy o la profesional —
// y por eso este endpoint, a diferencia de los otros, exige el token de sesión
// que entrega api/verificar-pin.ts: sin PIN válido reciente no se puede
// marcar nada. Se guarda en `aprobado_por_profesional` (no toca el estado del
// turno, así no se mezcla con Caja ni con las notificaciones de pagos reales).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface Sesion {
  rol: 'admin' | 'profesional';
  pid: string | null;
}

// Verifica firma y vencimiento del token que emite api/verificar-pin.ts.
function leerSesion(token: string | undefined, secreto: string): Sesion | null {
  if (!token) return null;
  const [payload, firma] = token.split('.');
  if (!payload || !firma) return null;
  const esperada = createHmac('sha256', secreto).update(`rf-sesion-v1.${payload}`).digest();
  const recibida = Buffer.from(firma, 'base64url');
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  try {
    const datos = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { rol?: string; pid?: string | null; exp?: number };
    if (!datos.exp || datos.exp < Date.now()) return null;
    if (datos.rol !== 'admin' && datos.rol !== 'profesional') return null;
    return { rol: datos.rol, pid: datos.pid ?? null };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const secreto = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseAdmin || !secreto) {
    res.status(500).json({ error: 'Supabase no configurado en el servidor' });
    return;
  }

  const autorizacion = req.headers.authorization ?? '';
  const sesion = leerSesion(autorizacion.startsWith('Bearer ') ? autorizacion.slice(7) : undefined, secreto);
  if (!sesion) {
    res.status(401).json({ ok: false, error: 'Sesión vencida: volvé a ingresar tu PIN' });
    return;
  }

  const { turnoId, abonada } = (req.body ?? {}) as { turnoId?: string | number; abonada?: unknown };
  if (!turnoId || typeof abonada !== 'boolean') {
    res.status(400).json({ ok: false, error: 'Faltan datos' });
    return;
  }

  const { data: turno } = await supabaseAdmin
    .from('turnos')
    .select('origen_reserva, estado, profesional_id')
    .eq('id', turnoId)
    .maybeSingle();
  if (!turno) {
    res.status(404).json({ ok: false, error: 'El turno no existe' });
    return;
  }
  if (turno.origen_reserva !== 'manual') {
    res.status(400).json({ ok: false, error: 'Solo se puede registrar a mano la seña de turnos cargados a mano' });
    return;
  }
  if (turno.estado === 'cancelado' || turno.estado === 'completado') {
    res.status(400).json({ ok: false, error: 'Ese turno ya está cerrado' });
    return;
  }
  // Una profesional solo toca los turnos de su propia agenda.
  if (sesion.rol === 'profesional' && turno.profesional_id !== sesion.pid) {
    res.status(403).json({ ok: false, error: 'Ese turno no es de tu agenda' });
    return;
  }

  const { error } = await supabaseAdmin.from('turnos').update({ aprobado_por_profesional: abonada }).eq('id', turnoId);
  if (error) {
    console.error('[marcar-sena-manual] Error actualizando turno', turnoId, error);
    res.status(500).json({ ok: false, error: 'No se pudo registrar la seña' });
    return;
  }

  res.status(200).json({ ok: true, abonada });
}
