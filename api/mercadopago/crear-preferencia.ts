// api/mercadopago/crear-preferencia.ts
//
// Rose Face Studio — Grupo 1 del roadmap (persistencia real).
// El servidor es la única fuente de verdad del monto: el navegador solo
// manda qué servicio/profesional/fecha/hora eligió la clienta, nunca un
// monto. El precio se lee de Supabase acá mismo. La seña es un monto fijo
// (ver MONTO_SENA_FIJO más abajo), no un porcentaje del servicio.
// El turno se crea en este paso (estado 'reservado'), no en el navegador.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

// Duplicado a propósito de src/lib/pricing.ts: Vercel no empaqueta código
// compartido fuera de cada función individual (mismo motivo por el que
// getSupabaseAdmin va inline acá abajo).
const MONTO_SENA_FIJO = 20000;

// Hold del horario mientras la clienta está en el checkout de MP. Pasado
// este tiempo sin confirmación de pago, el horario se libera para otra
// clienta (Fase 3 del roadmap).
const HOLD_MINUTOS = 15;

// Vercel no empaqueta carpetas compartidas fuera de cada función individual
// (probado: api/_lib/ no llega al bundle) — el cliente admin va inline acá.
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface CrearPreferenciaBody {
  servicioId: string;
  profesionalId: string;
  fecha: string;
  hora: string;
  horaFin: string;
  clienta: { nombre: string; telefono?: string };
}

const ESTADO_CANCELADO = 'cancelado';

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

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Supabase no configurado en el servidor' });
    return;
  }

  const body = req.body as Partial<CrearPreferenciaBody>;
  const { servicioId, profesionalId, fecha, hora, horaFin, clienta } = body ?? {};

  if (!servicioId || !profesionalId || !fecha || !hora || !horaFin || !clienta?.nombre) {
    res.status(400).json({ error: 'Faltan datos de la reserva' });
    return;
  }

  try {
    const [{ data: servicio, error: servicioError }, { data: profesional, error: profesionalError }] =
      await Promise.all([
        supabaseAdmin.from('servicios').select('*').eq('id', servicioId).single(),
        supabaseAdmin.from('profesionales').select('id, nombre').eq('id', profesionalId).single(),
      ]);

    if (servicioError || !servicio) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }
    if (profesionalError || !profesional) {
      res.status(404).json({ error: 'Profesional no encontrada' });
      return;
    }
    if (!servicio.profesionales_que_lo_realizan.includes(profesionalId)) {
      res.status(400).json({ error: 'Esa profesional no realiza este servicio' });
      return;
    }

    const montoTotal = Number(servicio.precio);
    const montoSena = MONTO_SENA_FIJO;

    // Confirmar que el horario sigue libre — el índice único de la base es
    // la última barrera, esto evita pegarle a Mercado Pago innecesariamente.
    const { data: turnosDelDia, error: turnosError } = await supabaseAdmin
      .from('turnos')
      .select('id, hora_inicio, hora_fin, estado, expira_en')
      .eq('profesional_id', profesionalId)
      .eq('fecha', fecha);

    if (turnosError) {
      res.status(500).json({ error: 'No se pudo verificar disponibilidad' });
      return;
    }

    const seSuperponeConHorario = (t: { hora_inicio: string; hora_fin: string }) =>
      hora < String(t.hora_fin).slice(0, 5) && horaFin > String(t.hora_inicio).slice(0, 5);

    // Un 'reservado' cuyo hold de 15 min ya venció no debe seguir bloqueando
    // el horario. El índice único de la base solo excluye 'cancelado', así
    // que para liberar el horario de verdad hay que flipearlo — no alcanza
    // con ignorarlo acá (el insert de más abajo lo rechazaría igual).
    const ahora = new Date();
    const expiradosQueChocan = (turnosDelDia ?? []).filter(
      (t) =>
        t.estado === 'reservado' &&
        t.expira_en &&
        new Date(t.expira_en) < ahora &&
        seSuperponeConHorario(t)
    );
    if (expiradosQueChocan.length > 0) {
      await supabaseAdmin
        .from('turnos')
        .update({ estado: ESTADO_CANCELADO, notas_internas: 'Cancelado automáticamente: hold de 15 min vencido sin confirmar el pago.' })
        .in('id', expiradosQueChocan.map((t) => t.id));
    }
    const idsLiberados = new Set(expiradosQueChocan.map((t) => t.id));

    const seSuperpone = (turnosDelDia ?? [])
      .filter((t) => t.estado !== ESTADO_CANCELADO && !idsLiberados.has(t.id))
      .some(seSuperponeConHorario);

    if (seSuperpone) {
      res.status(409).json({ error: 'Ese horario ya no está disponible' });
      return;
    }

    // Clienta: buscar por nombre o dar de alta
    let clientaId: string;
    const { data: clientaExistente } = await supabaseAdmin
      .from('clientas')
      .select('id')
      .ilike('nombre', clienta.nombre)
      .limit(1)
      .maybeSingle();

    if (clientaExistente) {
      clientaId = clientaExistente.id;
    } else {
      const { data: nuevaClienta, error: clientaError } = await supabaseAdmin
        .from('clientas')
        .insert({
          id: `cli-${Date.now()}`,
          nombre: clienta.nombre,
          telefono: clienta.telefono ?? '',
          fecha_registro: new Date().toISOString().slice(0, 10),
          es_vip: false,
          nivel_vip: 'Clienta',
          puntos_acumulados: 0,
        })
        .select('id')
        .single();

      if (clientaError || !nuevaClienta) {
        res.status(500).json({ error: 'No se pudo registrar la clienta' });
        return;
      }
      clientaId = nuevaClienta.id;
    }

    const { data: turno, error: turnoError } = await supabaseAdmin
      .from('turnos')
      .insert({
        clienta_id: clientaId,
        profesional_id: profesionalId,
        servicio_id: servicioId,
        fecha,
        hora_inicio: hora,
        hora_fin: horaFin,
        estado: 'reservado',
        monto_total: montoTotal,
        monto_sena: montoSena,
        sena_verificada_automaticamente: false,
        origen_reserva: 'web',
        notas_internas: `Reserva web cliente: ${clienta.nombre} (${clienta.telefono ?? ''})`,
        expira_en: new Date(Date.now() + HOLD_MINUTOS * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (turnoError || !turno) {
      if (turnoError?.code === '23505') {
        res.status(409).json({ error: 'Ese horario ya no está disponible' });
        return;
      }
      console.error('[mercadopago/crear-preferencia] Error insertando turno:', turnoError);
      res.status(500).json({ error: 'No se pudo crear el turno' });
      return;
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

    // Va en la URL de vuelta para armar un mensaje de confirmación
    // personalizado aunque el navegador vuelva desde el dominio externo de
    // Mercado Pago (ahí se pierde el estado en memoria de la SPA).
    const resumenParams = new URLSearchParams({
      turnoId: String(turno.id),
      servicio: servicio.nombre,
      profesional: profesional.nombre,
      fecha,
      hora,
      montoSena: String(montoSena),
      montoTotal: String(montoTotal),
      nombre: clienta.nombre,
    }).toString();

    const result = await preference.create({
      body: {
        items: [
          {
            id: servicioId,
            title: `Seña — ${servicio.nombre}`,
            quantity: 1,
            unit_price: montoSena,
            currency_id: 'ARS',
          },
        ],
        payer: {
          name: clienta.nombre,
          ...(clienta.telefono ? { phone: { number: String(clienta.telefono) } } : {}),
        },
        external_reference: String(turno.id),
        metadata: { turnoId: turno.id, servicioId, profesionalId, fecha, hora },
        back_urls: {
          success: `${appUrl}/reserva/confirmacion?${resumenParams}&status=approved`,
          pending: `${appUrl}/reserva/confirmacion?${resumenParams}&status=pending`,
          failure: `${appUrl}/reserva`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/mercadopago/webhook`,
      },
    });

    res.status(200).json({ initPoint: result.init_point });
  } catch (error) {
    console.error('[mercadopago/crear-preferencia] Error:', error);
    res.status(500).json({ error: 'No se pudo crear la preferencia de pago' });
  }
}
