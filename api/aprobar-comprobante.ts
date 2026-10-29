// api/aprobar-comprobante.ts
//
// Paso 1 del plan crítico de docs/SEGURIDAD_PENDIENTE.md (26/9/2026): la
// escritura más peligrosa de todo el sistema (marcar un turno como
// "sena_confirmada" + "aprobado_por_profesional") ya no la hace el
// navegador con el anon key — la hace este endpoint con el service_role.
// Antes, cualquiera con el anon key (público, viaja en el bundle) podía
// llamar directo a Supabase y falsificar un turno "pagado" sin pagar.
//
// Reemplaza el UPDATE que hacía `aprobarComprobante` en AppContext.tsx, y
// absorbe la lógica de mail que antes vivía en notificar-turno-confirmado.ts
// (ese archivo queda sin uso y se borra — nada más lo llamaba).
//
// 29/10/2026: dos cambios. (1) Exige el token de sesión de
// api/verificar-pin.ts (antes no pedía ninguno — cualquiera que supiera el
// id de un turno con comprobante podía aprobarlo). (2) Ahora también acepta
// el circuito "mercado_pago" (Mili/Roma cuando la clienta no tiene MP y
// transfiere a la cuenta de Rose Face del día) — pero ESE circuito solo lo
// puede aprobar Yosy, nunca la profesional: a diferencia del circuito
// transferencia (donde la plata es entre la clienta y la profesional, Yosy
// no se mete), acá el ingreso se reparte por comisión y afecta el cierre
// semanal, así que la aprobación tiene que pasar por la dueña.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

interface Sesion {
  rol: 'admin' | 'profesional';
  pid: string | null;
}

// Duplicado de api/editar-turno.ts (Vercel no comparte código entre funciones).
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

// Doble reserva (10/10/2026, pedido de Tobias): si la misma clienta tiene
// otro turno activo (cualquier profesional/servicio/fecha), se suma acá para
// que el mail a Yosy muestre ambas reservas juntas — ej. pestañas y uñas.
// Duplicado en webhook.ts por el mismo motivo de siempre.
async function otrosTurnosActivosHtml(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  clientaId: string,
  turnoIdActual: string
): Promise<string> {
  const { data: otros } = await supabaseAdmin
    .from('turnos')
    .select('fecha, hora_inicio, servicio_id, profesional_id')
    .eq('clienta_id', clientaId)
    .neq('id', turnoIdActual)
    .neq('estado', 'cancelado');

  if (!otros || otros.length === 0) return '';

  const [{ data: servicios }, { data: profesionales }] = await Promise.all([
    supabaseAdmin.from('servicios').select('id, nombre'),
    supabaseAdmin.from('profesionales').select('id, nombre'),
  ]);

  const items = otros
    .map((o) => {
      const nombreServ = escapeHtml(servicios?.find((s) => s.id === o.servicio_id)?.nombre ?? 'servicio');
      const nombreProf = escapeHtml(profesionales?.find((p) => p.id === o.profesional_id)?.nombre ?? '—');
      return `<li>${nombreServ} con ${nombreProf} el ${o.fecha} a las ${o.hora_inicio} hs</li>`;
    })
    .join('');

  return `<p style="color:#B23A48"><strong>⚠️ Esta clienta tiene otra reserva activa:</strong></p><ul>${items}</ul>`;
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
  const esAdmin = sesion.rol === 'admin';

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
  if (turnoActual.circuito_pago === 'mercado_pago') {
    // Mili/Roma sin MP: afecta la comisión del cierre semanal, aprueba solo Yosy.
    if (!esAdmin) {
      res.status(403).json({ ok: false, error: 'Solo Yosy puede aprobar este comprobante' });
      return;
    }
  } else if (turnoActual.circuito_pago === 'transferencia') {
    // Alquiler fijo: la plata es entre la clienta y la profesional — la aprueba
    // ella misma (o Yosy, por si hace falta ayudarla).
    if (!esAdmin && sesion.pid !== turnoActual.profesional_id) {
      res.status(403).json({ ok: false, error: 'Ese turno no es de tu agenda' });
      return;
    }
  } else {
    res.status(400).json({ ok: false, error: 'Este turno no acepta comprobante de transferencia' });
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
    const otrosHtml = await otrosTurnosActivosHtml(supabaseAdmin, turnoActual.clienta_id, turnoId);

    await avisarleAYosy(
      `Nuevo turno confirmado — ${nombreServicio} el ${turnoActual.fecha}`,
      `<p>Se confirmó un turno por transferencia (aprobado por ${nombreProfesional}).</p>
       <ul>
         <li><strong>Clienta:</strong> ${nombreClienta} (${telefonoClienta})</li>
         <li><strong>Servicio:</strong> ${nombreServicio}</li>
         <li><strong>Profesional:</strong> ${nombreProfesional}</li>
         <li><strong>Fecha:</strong> ${turnoActual.fecha} a las ${turnoActual.hora_inicio} hs</li>
       </ul>
       <p style="color:#888;font-size:12px">El monto de este turno es entre la clienta y ${nombreProfesional} — no se incluye acá.</p>${otrosHtml}`
    );
  } catch (err) {
    // El turno ya quedó confirmado arriba — que falle el mail no revierte la aprobación.
    console.error('[aprobar-comprobante] Turno aprobado pero falló el aviso por mail:', err);
  }

  res.status(200).json({ ok: true });
}
