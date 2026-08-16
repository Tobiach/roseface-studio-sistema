// api/mercadopago/webhook.ts
//
// Rose Face Studio — Fase 3 del roadmap (Reservas + Operación real).
// Recibe las notificaciones de pago de Mercado Pago. Alcance de esta fase:
// solo loguear la notificación y confirmar recepción con 200 OK (obligatorio
// para que Mercado Pago no reintente el envío). La actualización real del
// turno queda como stub hasta que el proyecto tenga persistencia (Supabase).
import type { VercelRequest, VercelResponse } from '@vercel/node';

// TODO: cuando Supabase esté conectado, reemplazar este stub por un UPDATE
// real de la tabla `turnos` (buscar por turnoId = external_reference del
// pago) llevando el estado a 'sena_confirmada' y guardando idTransaccionMP.
async function actualizarEstadoTurno(turnoId: string, idTransaccionMP: string) {
  console.log(
    `[stub] actualizarEstadoTurno(turnoId=${turnoId}, estado=sena_confirmada, idTransaccionMP=${idTransaccionMP}) — pendiente de Supabase`
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  // TODO: verificar la firma de la notificación contra MP_WEBHOOK_SECRET
  // antes de confiar en el contenido, una vez que Mercado Pago provea el
  // header de firma para la cuenta de Rose Face Studio.

  console.log('[mercadopago/webhook] Notificación recibida:', JSON.stringify({ body: req.body, query: req.query }));

  const paymentId = req.body?.data?.id ?? req.query?.['data.id'];
  const turnoId = req.body?.external_reference ?? req.query?.external_reference;

  if (paymentId && turnoId) {
    await actualizarEstadoTurno(String(turnoId), String(paymentId));
  }

  res.status(200).json({ received: true });
}
