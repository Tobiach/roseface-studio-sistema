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

function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Duplicado de aprobar-comprobante.ts (Vercel no comparte código entre funciones).
async function avisarleAYosy(asunto: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Rose Face Studio <onboarding@resend.dev>', to: 'rosefacestudio@gmail.com', subject: asunto, html }),
    });
  } catch (err) {
    console.error('[guardar-comprobante] No se pudo mandar el mail a Yosy:', err);
  }
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
    .select('id, estado, circuito_pago, clienta_id, servicio_id, profesional_id, fecha, hora_inicio')
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

  // 30/10/2026 (pedido de Tobias): avisarle a Yosy apenas llega el
  // comprobante, no solo cuando se aprueba — así puede corroborarlo contra
  // el teléfono y el servicio reservado sin tener que ir a mirar el panel.
  try {
    const [{ data: clienta }, { data: servicio }, { data: profesional }] = await Promise.all([
      supabaseAdmin.from('clientas').select('nombre, telefono').eq('id', turno.clienta_id).single(),
      supabaseAdmin.from('servicios').select('nombre').eq('id', turno.servicio_id).single(),
      supabaseAdmin.from('profesionales').select('nombre').eq('id', turno.profesional_id).single(),
    ]);

    const nombreClienta = escapeHtml(clienta?.nombre ?? '—');
    const telefonoClienta = escapeHtml(clienta?.telefono ?? '—');
    const nombreServicio = escapeHtml(servicio?.nombre ?? 'servicio');
    const nombreProfesional = escapeHtml(profesional?.nombre ?? 'la profesional');
    const linkComprobante = escapeHtml(url);
    // Mili/Roma sin MP: Yosy es quien aprueba (ver api/aprobar-comprobante.ts),
    // así que su panel SÍ le muestra este turno en "Comprobantes a Revisar".
    // Alquiler fijo (Cris/Ari/etc.): ese pago es entre la clienta y la
    // profesional — el panel de Yosy no lista estos, por eso el mail es solo
    // informativo acá, no una invitación a confirmarlo ella misma.
    const accion = turno.circuito_pago === 'mercado_pago'
      ? '<p>Confirmalo desde tu panel, en "Comprobantes a Revisar".</p>'
      : `<p>Este es el pago de ${nombreProfesional} con su clienta — avisale a ella para que lo revise y lo confirme.</p>`;

    await avisarleAYosy(
      `Nuevo comprobante para revisar — ${nombreServicio} el ${turno.fecha}`,
      `<p>Una clienta subió el comprobante de la transferencia de su turno.</p>
       <ul>
         <li><strong>Clienta:</strong> ${nombreClienta} (${telefonoClienta})</li>
         <li><strong>Servicio:</strong> ${nombreServicio}</li>
         <li><strong>Profesional:</strong> ${nombreProfesional}</li>
         <li><strong>Fecha:</strong> ${turno.fecha} a las ${turno.hora_inicio} hs</li>
       </ul>
       <p><a href="${linkComprobante}">Ver la foto del comprobante</a></p>
       ${accion}`
    );
  } catch (err) {
    // El comprobante ya quedó guardado arriba — que falle el mail no revierte eso.
    console.error('[guardar-comprobante] Comprobante guardado pero falló el aviso por mail:', err);
  }

  res.status(200).json({ ok: true });
}
