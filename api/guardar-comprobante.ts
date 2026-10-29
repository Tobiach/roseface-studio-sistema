// api/guardar-comprobante.ts
//
// Paso 1 del plan crítico de docs/SEGURIDAD_PENDIENTE.md (26/9/2026), prioridad
// 2: el UPLOAD del archivo a Supabase Storage sigue siendo del cliente (ese
// bucket tiene sus propias políticas, no el mismo problema de RLS de las
// tablas), pero el UPDATE de `turnos.comprobante_transferencia_url` que
// pasaba después con el anon key se mueve acá, server-side con el
// service_role. Antes, cualquiera podía pisar ese campo en cualquier turno
// sin haber subido nada.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseAdmin || !supabaseUrl) {
    res.status(500).json({ error: 'Supabase no configurado en el servidor' });
    return;
  }

  const { turnoId, url } = (req.body ?? {}) as { turnoId?: string; url?: string };
  if (!turnoId || !url) {
    res.status(400).json({ ok: false, error: 'Faltan turnoId o url' });
    return;
  }

  // El comprobante tiene que apuntar al bucket público de este mismo
  // proyecto de Supabase — evita que alguien mande cualquier URL externa.
  const prefijoEsperado = `${supabaseUrl}/storage/v1/object/public/comprobantes/`;
  if (!url.startsWith(prefijoEsperado)) {
    res.status(400).json({ ok: false, error: 'URL de comprobante inválida' });
    return;
  }

  const { data: turno, error: turnoError } = await supabaseAdmin
    .from('turnos')
    .select('id, estado, circuito_pago')
    .eq('id', turnoId)
    .single();

  if (turnoError || !turno) {
    res.status(404).json({ ok: false, error: 'Turno no encontrado' });
    return;
  }
  // 29/10/2026: también se acepta en el circuito "mercado_pago" cuando la
  // clienta eligió "no tengo Mercado Pago" y transfiere a la cuenta de Rose
  // Face del día (ver api/mercadopago/crear-preferencia.ts) — circuitoPago
  // no cambia, sigue siendo el que define la comisión.
  if (turno.circuito_pago !== 'transferencia' && turno.circuito_pago !== 'mercado_pago') {
    res.status(400).json({ ok: false, error: 'Este turno no acepta comprobante de transferencia' });
    return;
  }
  if (turno.estado !== 'reservado') {
    res.status(400).json({ ok: false, error: 'Este turno ya no está esperando comprobante' });
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('turnos')
    .update({ comprobante_transferencia_url: url })
    .eq('id', turnoId);

  if (updateError) {
    console.error('[guardar-comprobante] Error actualizando turno', turnoId, updateError);
    res.status(500).json({ ok: false, error: 'No se pudo guardar el comprobante en el turno' });
    return;
  }

  res.status(200).json({ ok: true });
}
