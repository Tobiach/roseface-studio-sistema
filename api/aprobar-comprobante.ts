// api/aprobar-comprobante.ts
//
// Paso 1 del plan crítico de SEGURIDAD_PENDIENTE.md (26/9/2026): la
// escritura más peligrosa de todo el sistema (marcar un turno como
// "sena_confirmada" + "aprobado_por_profesional") ya no la hace el
// navegador con el anon key — la hace este endpoint con el service_role.
// Antes, cualquiera con el anon key (público, viaja en el bundle) podía
// llamar directo a Supabase y falsificar un turno "pagado" sin pagar.
//
// Reemplaza el UPDATE que hacía `aprobarComprobante` en AppContext.tsx, y
// absorbe la lógica de mail que antes vivía en notificar-turno-confirmado.ts
// (ese archivo queda sin uso y se borra — nada más lo llamaba).
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

function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Supabase no configurado en el servidor' });
    return;
  }

  const { turnoId } = (req.body ?? {}) as { turnoId?: string };
  if (!turnoId) {
    res.status(400).json({ ok: false, error: 'Falta turnoId' });
    return;
  }

  // Solo tiene sentido aprobar un turno que todavía está esperando revisión
  // del comprobante — evita reprocesar un turno ya confirmado o cancelado.
  const { data: turnoActual, error: turnoActualError } = await supabaseAdmin
    .from('turnos')
    .select('id, estado, clienta_id, servicio_id, profesional_id, fecha, hora_inicio, circuito_pago, comprobante_transferencia_url')
    .eq('id', turnoId)
    .single();

  if (turnoActualError || !turnoActual) {
    res.status(404).json({ ok: false, error: 'Turno no encontrado' });
    return;
  }
  if (turnoActual.circuito_pago !== 'transferencia') {
    res.status(400).json({ ok: false, error: 'Este turno no es del circuito de transferencia' });
    return;
  }
  if (!turnoActual.comprobante_transferencia_url) {
    res.status(400).json({ ok: false, error: 'Este turno todavía no tiene comprobante subido' });
    return;
  }
  if (turnoActual.estado === 'sena_confirmada') {
    res.status(200).json({ ok: true, yaEstaba: true });
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('turnos')
    .update({ estado: 'sena_confirmada', aprobado_por_profesional: true })
    .eq('id', turnoId);

  if (updateError) {
    console.error('[aprobar-comprobante] Error actualizando turno', turnoId, updateError);
    res.status(500).json({ ok: false, error: 'No se pudo aprobar el comprobante' });
    return;
  }

  try {
    const [{ data: clienta }, { data: servicio }, { data: profesional }] = await Promise.all([
      supabaseAdmin.from('clientas').select('nombre, telefono').eq('id', turnoActual.clienta_id).single(),
      supabaseAdmin.from('servicios').select('nombre').eq('id', turnoActual.servicio_id).single(),
      supabaseAdmin.from('profesionales').select('nombre').eq('id', turnoActual.profesional_id).single(),
    ]);

    const nombreClienta = escapeHtml(clienta?.nombre ?? '—');
    const telefonoClienta = escapeHtml(clienta?.telefono ?? '—');
    const nombreServicio = escapeHtml(servicio?.nombre ?? 'servicio');
    const nombreProfesional = escapeHtml(profesional?.nombre ?? 'la profesional');

    await avisarleAYosy(
      `Nuevo turno confirmado — ${nombreServicio} el ${turnoActual.fecha}`,
      `<p>Se confirmó un turno por transferencia (aprobado por ${nombreProfesional}).</p>
       <ul>
         <li><strong>Clienta:</strong> ${nombreClienta} (${telefonoClienta})</li>
         <li><strong>Servicio:</strong> ${nombreServicio}</li>
         <li><strong>Profesional:</strong> ${nombreProfesional}</li>
         <li><strong>Fecha:</strong> ${turnoActual.fecha} a las ${turnoActual.hora_inicio} hs</li>
       </ul>
       <p style="color:#888;font-size:12px">El monto de este turno es entre la clienta y ${nombreProfesional} — no se incluye acá.</p>`
    );
  } catch (err) {
    // El turno ya quedó confirmado arriba — que falle el mail no revierte la aprobación.
    console.error('[aprobar-comprobante] Turno aprobado pero falló el aviso por mail:', err);
  }

  res.status(200).json({ ok: true });
}
