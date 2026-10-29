// api/mercadopago/crear-link-pago.ts
//
// RETIRADO (29/10/2026): el panel ya no llama a este endpoint — el recordatorio
// de seña de Mili/Roma manda la cuenta bancaria del día en vez de este link
// (ver src/lib/cuentasBancarias.ts, pedido de Tobias: "ya no se van a mandar
// los links de MP"). El archivo queda tal cual por si hiciera falta volver
// atrás (no rompe nada estando ahí sin uso); no está pensado para borrarse sin
// que Tobias lo pida.
//
// Link de pago de Mercado Pago para la seña de un turno CARGADO A MANO que ya
// existe (17/10/2026, "opción A"). Se pide desde el panel al mandar el
// recordatorio de seña de 72h / 48h por WhatsApp: la clienta paga directo
// desde el link, sin volver a elegir servicio, día ni profesional — el link
// queda atado al turno existente (external_reference = id del turno), y el
// webhook (api/mercadopago/webhook.ts) lo confirma solo apenas se aprueba el
// pago, igual que una reserva hecha por el sitio.
//
// A diferencia de crear-preferencia.ts (público, lo usa la clienta), este
// endpoint lo usa solo el personal: exige el token de sesión que entrega
// api/verificar-pin.ts. El monto sale del turno guardado en la base — el
// navegador nunca manda un monto.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Vercel no empaqueta carpetas compartidas fuera de cada función individual
// (probado: api/_lib/ no llega al bundle) — el cliente admin y el verificador
// de token van inline acá, igual que en api/marcar-sena-manual.ts.
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface Sesion {
  rol: 'admin' | 'profesional';
  pid: string | null;
}

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
    res.status(401).json({ ok: false, motivo: 'sesion', error: 'Sesión vencida: volvé a ingresar tu PIN' });
    return;
  }

  const { turnoId } = (req.body ?? {}) as { turnoId?: string | number };
  if (!turnoId) {
    res.status(400).json({ ok: false, error: 'Falta el turno' });
    return;
  }

  const { data: turno } = await supabaseAdmin
    .from('turnos')
    .select('id, clienta_id, profesional_id, servicio_id, fecha, hora_inicio, estado, origen_reserva, monto_sena, monto_total, aprobado_por_profesional')
    .eq('id', turnoId)
    .maybeSingle();

  if (!turno) {
    res.status(404).json({ ok: false, error: 'El turno no existe' });
    return;
  }
  // Una profesional solo genera links de su propia agenda.
  if (sesion.rol === 'profesional' && turno.profesional_id !== sesion.pid) {
    res.status(403).json({ ok: false, error: 'Ese turno no es de tu agenda' });
    return;
  }
  if (turno.origen_reserva !== 'manual') {
    res.status(400).json({ ok: false, motivo: 'no_aplica', error: 'Este turno ya se paga al reservar por el sitio' });
    return;
  }
  if (turno.estado === 'cancelado' || turno.estado === 'completado') {
    res.status(400).json({ ok: false, motivo: 'no_aplica', error: 'Ese turno ya está cerrado' });
    return;
  }
  if (turno.estado === 'sena_confirmada' || turno.aprobado_por_profesional) {
    res.status(400).json({ ok: false, motivo: 'no_aplica', error: 'La seña de este turno ya figura como pagada' });
    return;
  }
  const montoSena = Number(turno.monto_sena);
  if (!Number.isFinite(montoSena) || montoSena <= 0 || montoSena > Number(turno.monto_total)) {
    res.status(400).json({ ok: false, motivo: 'no_aplica', error: 'Este turno no tiene una seña válida cargada' });
    return;
  }

  // No generar un link para un horario que ya pasó. Argentina es UTC-3 sin horario de verano.
  const horaTexto = String(turno.hora_inicio);
  const horaInicio = horaTexto.length === 5 ? `${horaTexto}:00` : horaTexto.slice(0, 8);
  const inicioMs = new Date(`${turno.fecha}T${horaInicio}-03:00`).getTime();
  if (!Number.isFinite(inicioMs) || inicioMs <= Date.now()) {
    res.status(409).json({ ok: false, motivo: 'no_aplica', error: 'Ese turno ya pasó' });
    return;
  }

  try {
    const [{ data: profesional }, { data: servicio }, { data: clienta }] = await Promise.all([
      supabaseAdmin.from('profesionales').select('id, nombre, modelo_comision').eq('id', turno.profesional_id).single(),
      supabaseAdmin.from('servicios').select('id, nombre').eq('id', turno.servicio_id).single(),
      supabaseAdmin.from('clientas').select('nombre, telefono').eq('id', turno.clienta_id).single(),
    ]);
    if (!profesional || !servicio) {
      res.status(404).json({ ok: false, error: 'No se encontró el servicio o la profesional del turno' });
      return;
    }

    // Mismo criterio que crear-preferencia.ts: porcentaje → Mercado Pago (a la
    // cuenta del estudio); alquiler fijo → transferencia directa a la
    // profesional, que no pasa por acá.
    if (profesional.modelo_comision?.tipo === 'alquiler_fijo') {
      res.status(400).json({
        ok: false,
        motivo: 'no_aplica',
        error: `${profesional.nombre} cobra por transferencia a su cuenta, no por Mercado Pago`,
      });
      return;
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      res.status(500).json({ ok: false, error: 'MP_ACCESS_TOKEN no configurado en el servidor' });
      return;
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    const hora = String(turno.hora_inicio).slice(0, 5);

    // Misma página de vuelta que una reserva del sitio: arma el mensaje de
    // confirmación con estos datos aunque el navegador vuelva de Mercado Pago.
    const resumenParams = new URLSearchParams({
      turnoId: String(turno.id),
      servicio: servicio.nombre,
      profesional: profesional.nombre,
      fecha: turno.fecha,
      hora,
      montoSena: String(montoSena),
      montoTotal: String(turno.monto_total),
      nombre: clienta?.nombre ?? '',
    }).toString();

    const result = await preference.create({
      body: {
        items: [
          {
            id: String(turno.servicio_id),
            title: `Seña — ${servicio.nombre}`,
            quantity: 1,
            unit_price: montoSena,
            currency_id: 'ARS',
          },
        ],
        payer: {
          ...(clienta?.nombre ? { name: clienta.nombre } : {}),
          ...(clienta?.telefono ? { phone: { number: String(clienta.telefono) } } : {}),
        },
        external_reference: String(turno.id),
        metadata: { turnoId: turno.id, servicioId: turno.servicio_id, profesionalId: turno.profesional_id, fecha: turno.fecha, hora, origen: 'link_recordatorio' },
        back_urls: {
          success: `${appUrl}/reserva/confirmacion?${resumenParams}&status=approved`,
          pending: `${appUrl}/reserva/confirmacion?${resumenParams}&status=pending`,
          failure: `${appUrl}/`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/mercadopago/webhook`,
        // El link deja de valer cuando empieza el turno.
        expires: true,
        expiration_date_to: new Date(inicioMs).toISOString(),
      },
    });

    if (!result.init_point) {
      res.status(500).json({ ok: false, error: 'Mercado Pago no devolvió el link de pago' });
      return;
    }
    res.status(200).json({ ok: true, initPoint: result.init_point });
  } catch (error) {
    console.error('[mercadopago/crear-link-pago] Error:', error);
    res.status(500).json({ ok: false, error: 'No se pudo crear el link de pago' });
  }
}
