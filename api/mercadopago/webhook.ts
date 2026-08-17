// api/mercadopago/webhook.ts
//
// Rose Face Studio — Grupo 1 del roadmap (persistencia real).
// Recibe las notificaciones de pago de Mercado Pago, verifica que la firma
// sea auténtica, vuelve a consultar el pago contra la API de MP (nunca
// confía en el body de la notificación solo) y, si está aprobado, confirma
// el turno correspondiente en Supabase.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';

// Documentación de la firma: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/security/signature
function firmaValida(req: VercelRequest): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const signatureHeader = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  if (!signatureHeader || !requestId) return false;

  const partes = String(signatureHeader)
    .split(',')
    .reduce<Record<string, string>>((acc, parte) => {
      const [key, value] = parte.split('=').map((s) => s.trim());
      if (key && value) acc[key] = value;
      return acc;
    }, {});

  const ts = partes.ts;
  const v1 = partes.v1;
  const dataId = (req.query['data.id'] as string | undefined) ?? req.body?.data?.id;
  if (!ts || !v1 || !dataId) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  if (hmac.length !== v1.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  if (!firmaValida(req)) {
    console.warn('[mercadopago/webhook] Firma inválida o faltante — notificación descartada');
    res.status(401).json({ error: 'Firma inválida' });
    return;
  }

  const paymentId = (req.query['data.id'] as string | undefined) ?? req.body?.data?.id;
  const tipo = (req.query.type as string | undefined) ?? req.body?.type;

  // Solo nos interesan las notificaciones de pago
  if (tipo !== 'payment' || !paymentId) {
    res.status(200).json({ received: true });
    return;
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  const supabaseAdmin = getSupabaseAdmin();
  if (!accessToken || !supabaseAdmin) {
    console.error('[mercadopago/webhook] Falta MP_ACCESS_TOKEN o Supabase — no se pudo procesar');
    res.status(200).json({ received: true });
    return;
  }

  try {
    const pagoResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!pagoResponse.ok) {
      console.error('[mercadopago/webhook] No se pudo consultar el pago', paymentId, pagoResponse.status);
      res.status(200).json({ received: true });
      return;
    }

    const pago = await pagoResponse.json();
    const turnoId = pago.external_reference;

    if (pago.status === 'approved' && turnoId) {
      const { error } = await supabaseAdmin
        .from('turnos')
        .update({
          estado: 'sena_confirmada',
          sena_verificada_automaticamente: true,
          id_transaccion_mp: String(paymentId),
        })
        .eq('id', turnoId);

      if (error) {
        console.error('[mercadopago/webhook] Error actualizando turno', turnoId, error);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[mercadopago/webhook] Error procesando notificación:', error);
    res.status(200).json({ received: true });
  }
}
