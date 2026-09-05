// api/verificar-pin.ts
//
// Gate liviano para entrar como Yosy (admin) o como una profesional
// puntual — NO es autenticación real (no hay password, sesión, ni
// hashing), es un parche a propósito mientras el login de verdad queda
// fuera de alcance. El PIN nunca se expone al navegador: la tabla
// codigos_acceso tiene RLS sin policies (bloqueada para la anon key),
// solo este endpoint con el service_role puede leerla.
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
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Supabase no configurado en el servidor' });
    return;
  }

  const pin = String((req.body as { pin?: string })?.pin ?? '').trim();
  if (!pin) {
    res.status(400).json({ ok: false });
    return;
  }

  const { data: codigo } = await supabaseAdmin
    .from('codigos_acceso')
    .select('rol, profesional_id')
    .eq('pin', pin)
    .maybeSingle();

  if (!codigo) {
    res.status(200).json({ ok: false });
    return;
  }

  let nombre: string | null = null;
  if (codigo.profesional_id) {
    const { data: prof } = await supabaseAdmin
      .from('profesionales')
      .select('nombre')
      .eq('id', codigo.profesional_id)
      .maybeSingle();
    nombre = prof?.nombre ?? null;
  }

  res.status(200).json({ ok: true, rol: codigo.rol, profesionalId: codigo.profesional_id, nombre });
}
