// api/notificar-turno-confirmado.ts
//
// Mail a Yosy cuando se confirma un turno por el circuito de transferencia
// (25/9/2026) — la profesional aprueba el comprobante desde su panel
// (client-side, `aprobarComprobante` en AppContext.tsx) y ese código llama
// a este endpoint después. No puede mandar el mail directo desde el
// navegador: el API key de Resend no puede viajar al bundle público.
//
// A propósito NO incluye el monto ni datos del comprobante — mismo
// criterio de privacidad que el resto del sistema: en el circuito de
// transferencia, Yosy nunca ve la plata, solo que el turno quedó
// confirmado (doble circuito de pago del PDF firmado).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Vercel no empaqueta carpetas compartidas fuera de cada función individual
// (probado: api/_lib/ no llega al bundle) — duplicado a propósito, mismo
// motivo que en crear-preferencia.ts y webhook.ts.
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function avisarleAYosy(asunto: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Rose Face Studio <onboarding@resend.dev>',
        to: 'rosefacestudio@gmail.com',
        subject: asunto,
        html,
      }),
    });
  } catch (err) {
    console.error('[avisarleAYosy] No se pudo mandar el mail:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { turnoId } = (req.body ?? {}) as { turnoId?: string };
  if (!supabaseAdmin || !turnoId) {
    res.status(200).json({ ok: false });
    return;
  }

  try {
    const { data: turno } = await supabaseAdmin
      .from('turnos')
      .select('clienta_id, servicio_id, profesional_id, fecha, hora_inicio, circuito_pago')
      .eq('id', turnoId)
      .single();

    if (!turno) {
      res.status(200).json({ ok: false });
      return;
    }

    const [{ data: clienta }, { data: servicio }, { data: profesional }] = await Promise.all([
      supabaseAdmin.from('clientas').select('nombre, telefono').eq('id', turno.clienta_id).single(),
      supabaseAdmin.from('servicios').select('nombre').eq('id', turno.servicio_id).single(),
      supabaseAdmin.from('profesionales').select('nombre').eq('id', turno.profesional_id).single(),
    ]);

    await avisarleAYosy(
      `Nuevo turno confirmado — ${servicio?.nombre ?? 'servicio'} el ${turno.fecha}`,
      `<p>Se confirmó un turno por transferencia (aprobado por ${profesional?.nombre ?? 'la profesional'}).</p>
       <ul>
         <li><strong>Clienta:</strong> ${clienta?.nombre ?? '—'} (${clienta?.telefono ?? '—'})</li>
         <li><strong>Servicio:</strong> ${servicio?.nombre ?? '—'}</li>
         <li><strong>Profesional:</strong> ${profesional?.nombre ?? '—'}</li>
         <li><strong>Fecha:</strong> ${turno.fecha} a las ${turno.hora_inicio} hs</li>
       </ul>
       <p style="color:#888;font-size:12px">El monto de este turno es entre la clienta y ${profesional?.nombre ?? 'la profesional'} — no se incluye acá.</p>`
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[notificar-turno-confirmado] Error:', error);
    res.status(200).json({ ok: false });
  }
}
