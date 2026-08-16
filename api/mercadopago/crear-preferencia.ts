// api/mercadopago/crear-preferencia.ts
//
// Rose Face Studio — Fase 3 del roadmap (Reservas + Operación real).
// Crea la preferencia de pago de la seña en Mercado Pago y devuelve la URL
// de Checkout Pro (init_point) a la que el frontend redirige a la clienta.
//
// Requiere MP_ACCESS_TOKEN configurado como variable de entorno del servidor
// (Vercel Environment Variables). NUNCA debe ser un token de producción hasta
// que Rose Face firme el contrato — usar solo credenciales de TEST hasta entonces.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';

interface CrearPreferenciaBody {
  turnoId: string;
  servicioId: string;
  servicioNombre: string;
  profesionalId: string;
  profesionalNombre: string;
  fecha: string;
  hora: string;
  montoSena: number;
  montoTotal: number;
  clienta: { nombre: string; telefono?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    res.status(500).json({ error: 'MP_ACCESS_TOKEN no configurado en el servidor' });
    return;
  }

  const body = req.body as Partial<CrearPreferenciaBody>;
  const { turnoId, servicioId, servicioNombre, profesionalId, profesionalNombre, fecha, hora, montoSena, montoTotal, clienta } = body ?? {};

  if (!turnoId || !servicioId || !profesionalId || !fecha || !hora || !montoSena || !clienta?.nombre) {
    res.status(400).json({ error: 'Faltan datos de la reserva para crear la preferencia' });
    return;
  }

  try {
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

    // Va en la URL de vuelta para poder armar un mensaje de confirmación
    // personalizado aunque el navegador vuelva desde el dominio externo de
    // Mercado Pago (ahí se pierde el estado en memoria de la SPA).
    const resumenParams = new URLSearchParams({
      turnoId,
      servicio: servicioNombre || '',
      profesional: profesionalNombre || '',
      fecha,
      hora,
      montoSena: String(montoSena),
      montoTotal: String(montoTotal ?? ''),
      nombre: clienta.nombre,
    }).toString();

    const result = await preference.create({
      body: {
        items: [
          {
            id: servicioId,
            title: `Seña — ${servicioNombre || 'Turno Rose Face Studio'}`,
            quantity: 1,
            unit_price: Number(montoSena),
            currency_id: 'ARS',
          },
        ],
        payer: {
          name: clienta.nombre,
          ...(clienta.telefono ? { phone: { number: String(clienta.telefono) } } : {}),
        },
        external_reference: turnoId,
        metadata: { turnoId, servicioId, profesionalId, fecha, hora },
        back_urls: {
          success: `${appUrl}/reserva/confirmacion?${resumenParams}&status=approved`,
          pending: `${appUrl}/reserva/confirmacion?${resumenParams}&status=pending`,
          failure: `${appUrl}/reserva`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/mercadopago/webhook`,
      },
    });

    res.status(200).json({ initPoint: result.init_point, preferenceId: result.id });
  } catch (error) {
    console.error('[mercadopago/crear-preferencia] Error creando preferencia:', error);
    res.status(500).json({ error: 'No se pudo crear la preferencia de pago' });
  }
}
