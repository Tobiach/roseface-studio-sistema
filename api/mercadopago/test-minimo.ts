// api/mercadopago/test-minimo.ts
//
// TEMPORAL — diagnóstico del error PA_UNAUTHORIZED_RESULT_FROM_POLICIES.
// Crea una preferencia con el payload MÍNIMO posible (solo items +
// back_urls + auto_return, sin payer/metadata/notification_url) para
// aislar si el bloqueo lo dispara algún campo específico, como sugirió
// el soporte de Mercado Pago. Se borra después de la prueba.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    res.status(500).json({ error: 'MP_ACCESS_TOKEN no configurado' });
    return;
  }

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

  try {
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'test-minimo',
            title: 'Test diagnostico',
            quantity: 1,
            unit_price: 100,
            currency_id: 'ARS',
          },
        ],
        back_urls: {
          success: `${appUrl}/reserva`,
          pending: `${appUrl}/reserva`,
          failure: `${appUrl}/reserva`,
        },
        auto_return: 'approved',
      },
    });
    res.status(200).json({ ok: true, initPoint: result.init_point });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      status: error?.status,
      message: error?.message,
      cause: error?.cause ?? error?.causes ?? null,
    });
  }
}
