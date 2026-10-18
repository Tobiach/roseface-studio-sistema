// api/editar-turno.ts
//
// Editar una reserva ya hecha (17/10/2026): cambiar servicio (y con eso el
// total que se factura), día, hora, profesional (solo Yosy), precio/seña (solo
// Yosy), cancelar con motivo y reactivar un turno cancelado. Lo usan Yosy y las
// profesionales desde la Agenda.
//
// Como acá se toca plata (monto_total decide las comisiones), TODO pasa por el
// servidor y exige el token de sesión de api/verificar-pin.ts. El navegador
// manda qué quiere cambiar, nunca el total: el servidor lo recalcula leyendo el
// precio del servicio en Supabase. Permisos:
//   - Yosy (admin): cualquier turno, y es la única que puede cambiar la
//     profesional, corregir el precio/seña a mano o tocar un turno ya completado.
//   - Profesional: solo turnos de su agenda, no completados, y sin cambiar
//     la profesional ni el precio a mano.
// Cada cambio deja una línea en notas_internas (quién, cuándo, qué cambió) y, si
// lo hizo una profesional, le avisa a Yosy por mail.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Vercel no empaqueta código compartido entre funciones: el cliente admin, el
// verificador de token y calcularMontoSena van inline (ver api/marcar-sena-manual.ts
// y api/mercadopago/crear-preferencia.ts, de donde se duplican).
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

const MONTO_SENA_FIJO = 30000;
function calcularMontoSena(servicio: { precio: number; categoria: string; requiere_sena?: boolean }): number {
  if (servicio.requiere_sena === false) return 0;
  if (servicio.categoria === 'Depilación Láser') return Number(servicio.precio);
  return Math.min(MONTO_SENA_FIJO, Number(servicio.precio));
}

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
    console.error('[editar-turno] No se pudo mandar el mail a Yosy:', err);
  }
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_MONTO = 5_000_000;
const MAX_NOTAS = 4000;

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const aHora = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const hhmm = (valor: unknown) => String(valor).slice(0, 5);
const plata = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

type Fila = Record<string, any>;

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
  const esAdmin = sesion.rol === 'admin';

  const body = (req.body ?? {}) as {
    turnoId?: string | number;
    accion?: string;
    servicioId?: string;
    profesionalId?: string;
    fecha?: string;
    horaInicio?: string;
    horaFin?: string;
    montoTotal?: number;
    montoSena?: number;
    nota?: string;
    motivo?: string;
  };
  const { turnoId, accion } = body;
  if (!turnoId || (accion !== 'editar' && accion !== 'cancelar' && accion !== 'reactivar')) {
    res.status(400).json({ ok: false, error: 'Faltan datos o la acción no es válida' });
    return;
  }

  const { data: turno } = await supabaseAdmin.from('turnos').select('*').eq('id', turnoId).maybeSingle();
  if (!turno) {
    res.status(404).json({ ok: false, error: 'El turno no existe' });
    return;
  }
  if (!esAdmin && turno.profesional_id !== sesion.pid) {
    res.status(403).json({ ok: false, error: 'Ese turno no es de tu agenda' });
    return;
  }

  // Quién lo hizo, para el registro del turno y el mail a Yosy.
  let quien = 'Yosy';
  if (!esAdmin) {
    const { data: prof } = await supabaseAdmin.from('profesionales').select('nombre').eq('id', sesion.pid).maybeSingle();
    quien = prof?.nombre ?? 'Profesional';
  }
  const ahoraArg = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const sello = `${fechaCorta(ahoraArg.slice(0, 10))} ${ahoraArg.slice(11, 16)}`;
  const agregarAlRegistro = (linea: string) => {
    const previo = turno.notas_internas ? `${turno.notas_internas}\n` : '';
    return `${previo}[${sello} · ${quien}] ${linea}`.slice(-MAX_NOTAS);
  };

  // ---------- CANCELAR
  if (accion === 'cancelar') {
    if (turno.estado === 'cancelado') {
      res.status(400).json({ ok: false, error: 'Ese turno ya está cancelado' });
      return;
    }
    if (turno.estado === 'completado') {
      res.status(400).json({ ok: false, error: 'Ese turno ya está completado, no se puede cancelar' });
      return;
    }
    const motivo = typeof body.motivo === 'string' ? body.motivo.trim().slice(0, 300) : '';
    const patch: Fila = {
      estado: 'cancelado',
      notas_internas: agregarAlRegistro(`Turno cancelado${motivo ? `: ${motivo}` : ''}`),
    };
    // Un turno manual con la seña ya confirmada guarda ese dato en la marca de "seña
    // pagada", así si se reactiva después no vuelve a figurar como pendiente.
    if (turno.origen_reserva === 'manual' && turno.estado === 'sena_confirmada') patch.aprobado_por_profesional = true;

    const { data: fila, error } = await supabaseAdmin.from('turnos').update(patch).eq('id', turnoId).select('*').single();
    if (error || !fila) {
      console.error('[editar-turno] Error cancelando', turnoId, error);
      res.status(500).json({ ok: false, error: 'No se pudo cancelar el turno' });
      return;
    }
    if (!esAdmin) {
      await avisarleAYosy(
        `${quien} canceló un turno — ${fila.fecha}`,
        `<p><strong>${escapeHtml(quien)}</strong> canceló un turno (${escapeHtml(String(fila.fecha))} a las ${escapeHtml(hhmm(fila.hora_inicio))}).${motivo ? ` Motivo: ${escapeHtml(motivo)}` : ''}</p>`
      );
    }
    res.status(200).json({ ok: true, turno: fila });
    return;
  }

  // ---------- REACTIVAR
  if (accion === 'reactivar') {
    if (turno.estado !== 'cancelado') {
      res.status(400).json({ ok: false, error: 'Ese turno no está cancelado' });
      return;
    }
    // Un turno del sitio que ya tenía el pago confirmado vuelve con la seña confirmada;
    // el resto vuelve como reservado (en los manuales la marca de "seña pagada" se conserva).
    const teniaPago = turno.origen_reserva === 'web' && (turno.id_transaccion_mp || turno.aprobado_por_profesional);
    const { data: fila, error } = await supabaseAdmin
      .from('turnos')
      .update({
        estado: teniaPago ? 'sena_confirmada' : 'reservado',
        notas_internas: agregarAlRegistro('Turno reactivado'),
      })
      .eq('id', turnoId)
      .select('*')
      .single();
    if (error?.code === '23505') {
      res.status(409).json({ ok: false, error: 'Ese horario ya lo ocupa otro turno: primero movelo o cancelalo' });
      return;
    }
    if (error || !fila) {
      console.error('[editar-turno] Error reactivando', turnoId, error);
      res.status(500).json({ ok: false, error: 'No se pudo reactivar el turno' });
      return;
    }
    res.status(200).json({ ok: true, turno: fila });
    return;
  }

  // ---------- EDITAR
  if (turno.estado === 'cancelado') {
    res.status(400).json({ ok: false, error: 'Ese turno está cancelado: reactivalo antes de editarlo' });
    return;
  }
  if (turno.estado === 'completado' && !esAdmin) {
    res.status(403).json({ ok: false, error: 'Solo Yosy puede editar un turno ya completado (cambia las comisiones de esa semana)' });
    return;
  }

  const cambiaProfesional = !!body.profesionalId && body.profesionalId !== turno.profesional_id;
  if (cambiaProfesional && !esAdmin) {
    res.status(403).json({ ok: false, error: 'Solo Yosy puede cambiar la profesional de un turno' });
    return;
  }
  if ((body.montoTotal !== undefined || body.montoSena !== undefined) && !esAdmin) {
    res.status(403).json({ ok: false, error: 'Solo Yosy puede corregir el precio o la seña a mano' });
    return;
  }

  const profesionalId = cambiaProfesional ? (body.profesionalId as string) : turno.profesional_id;
  const cambiaServicio = !!body.servicioId && body.servicioId !== turno.servicio_id;
  const servicioId = cambiaServicio ? (body.servicioId as string) : turno.servicio_id;

  const [{ data: servicio }, { data: profesional }, { data: servicioViejo }] = await Promise.all([
    supabaseAdmin.from('servicios').select('*').eq('id', servicioId).maybeSingle(),
    supabaseAdmin.from('profesionales').select('id, nombre').eq('id', profesionalId).maybeSingle(),
    cambiaServicio
      ? supabaseAdmin.from('servicios').select('nombre').eq('id', turno.servicio_id).maybeSingle()
      : Promise.resolve({ data: null as Fila | null }),
  ]);
  if (!servicio) {
    res.status(404).json({ ok: false, error: 'No se encontró ese servicio' });
    return;
  }
  if (!profesional) {
    res.status(404).json({ ok: false, error: 'No se encontró esa profesional' });
    return;
  }
  if ((cambiaServicio || cambiaProfesional) && !(servicio.profesionales_que_lo_realizan ?? []).includes(profesionalId)) {
    res.status(400).json({ ok: false, error: `${profesional.nombre} no realiza ${servicio.nombre}` });
    return;
  }

  // Día y hora
  const fecha = body.fecha ?? turno.fecha;
  const horaInicio = body.horaInicio ?? hhmm(turno.hora_inicio);
  if (!FECHA_RE.test(fecha) || Number.isNaN(new Date(`${fecha}T12:00:00`).getTime()) || !HORA_RE.test(horaInicio)) {
    res.status(400).json({ ok: false, error: 'La fecha o la hora no son válidas' });
    return;
  }
  const duracionActual = aMinutos(hhmm(turno.hora_fin)) - aMinutos(hhmm(turno.hora_inicio));
  const horaFin =
    body.horaFin ?? aHora(aMinutos(horaInicio) + (cambiaServicio ? Number(servicio.duracion_minutos) : duracionActual > 0 ? duracionActual : 30));
  if (!HORA_RE.test(horaFin) || aMinutos(horaFin) <= aMinutos(horaInicio)) {
    res.status(400).json({ ok: false, error: 'La hora de fin tiene que ser posterior a la de inicio' });
    return;
  }
  const cambiaHorario = fecha !== turno.fecha || horaInicio !== hhmm(turno.hora_inicio);
  const cambiaFin = horaFin !== hhmm(turno.hora_fin);
  if ((cambiaHorario || cambiaProfesional) && !esAdmin) {
    // Una profesional no mueve un turno a un horario que ya pasó (Argentina es UTC-3).
    if (new Date(`${fecha}T${horaInicio}:00-03:00`).getTime() <= Date.now()) {
      res.status(409).json({ ok: false, error: 'No se puede mover un turno a un horario que ya pasó' });
      return;
    }
  }

  // Plata: el total se recalcula acá. Los extras ya cargados se conservan.
  const extras = Array.isArray(turno.servicios_extra) ? (turno.servicios_extra as Fila[]) : [];
  const sumaExtras = extras.reduce((acc, e) => acc + (Number(e.precio) || 0), 0);
  const totalActual = Number(turno.monto_total);
  let montoTotal = totalActual;
  if (body.montoTotal !== undefined) {
    if (typeof body.montoTotal !== 'number' || !Number.isFinite(body.montoTotal) || body.montoTotal < 0 || body.montoTotal > MAX_MONTO) {
      res.status(400).json({ ok: false, error: 'El precio no es válido' });
      return;
    }
    montoTotal = Math.round(body.montoTotal);
  } else if (cambiaServicio) {
    montoTotal = Number(servicio.precio) + sumaExtras;
  }

  const senaPendiente =
    turno.origen_reserva === 'manual'
      ? turno.estado !== 'sena_confirmada' && !turno.aprobado_por_profesional
      : turno.estado === 'reservado';
  const senaActual = Number(turno.monto_sena);
  let montoSena = senaActual;
  if (body.montoSena !== undefined) {
    if (typeof body.montoSena !== 'number' || !Number.isFinite(body.montoSena) || body.montoSena < 0 || body.montoSena > MAX_MONTO) {
      res.status(400).json({ ok: false, error: 'La seña no es válida' });
      return;
    }
    montoSena = Math.round(body.montoSena);
  } else if (cambiaServicio && senaPendiente) {
    // La seña que todavía no se pagó sigue a la regla del servicio nuevo; la que ya se pagó no se toca.
    montoSena = Math.min(calcularMontoSena(servicio), montoTotal);
  }
  const advertencias: string[] = [];
  if (montoSena > montoTotal) {
    if (!senaPendiente) advertencias.push(`La seña ya pagada (${plata(montoSena)}) es mayor que el nuevo total (${plata(montoTotal)}).`);
    else montoSena = montoTotal;
  }

  // Choque de horario: la base solo rechaza el MISMO inicio; se chequea antes para dar un error claro.
  if (cambiaHorario || cambiaProfesional) {
    const { data: delDia } = await supabaseAdmin
      .from('turnos')
      .select('id, hora_inicio, estado, expira_en')
      .eq('profesional_id', profesionalId)
      .eq('fecha', fecha)
      .neq('id', turnoId)
      .neq('estado', 'cancelado');
    const choque = (delDia ?? []).find(
      (t) => hhmm(t.hora_inicio) === horaInicio && !(t.estado === 'reservado' && t.expira_en && new Date(t.expira_en) < new Date())
    );
    if (choque) {
      res.status(409).json({ ok: false, error: `${profesional.nombre} ya tiene un turno que empieza a las ${horaInicio} ese día` });
      return;
    }
  }

  const hayCambios =
    cambiaServicio || cambiaProfesional || cambiaHorario || cambiaFin || montoTotal !== totalActual || montoSena !== senaActual;
  if (!hayCambios) {
    res.status(400).json({ ok: false, error: 'No hay nada para cambiar' });
    return;
  }

  // Registro de lo que cambió
  const cambios: string[] = [];
  if (cambiaServicio) cambios.push(`servicio ${servicioViejo?.nombre ?? turno.servicio_id} → ${servicio.nombre}`);
  if (cambiaProfesional) cambios.push(`profesional → ${profesional.nombre}`);
  if (fecha !== turno.fecha) cambios.push(`día ${fechaCorta(turno.fecha)} → ${fechaCorta(fecha)}`);
  if (horaInicio !== hhmm(turno.hora_inicio)) cambios.push(`hora ${hhmm(turno.hora_inicio)} → ${horaInicio}`);
  // La hora de fin sola se anota solo si es lo único del horario que se tocó.
  if (cambiaFin && !cambiaServicio && !cambiaHorario) cambios.push(`fin ${hhmm(turno.hora_fin)} → ${horaFin}`);
  if (montoTotal !== totalActual) cambios.push(`total ${plata(totalActual)} → ${plata(montoTotal)}`);
  if (montoSena !== senaActual) cambios.push(`seña ${plata(senaActual)} → ${plata(montoSena)}`);
  const nota = typeof body.nota === 'string' ? body.nota.trim().slice(0, 300) : '';
  const linea = `Editó el turno: ${cambios.join('; ')}${nota ? ` (${nota})` : ''}`;

  const patch: Fila = {
    servicio_id: servicioId,
    profesional_id: profesionalId,
    fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    monto_total: montoTotal,
    monto_sena: montoSena,
    notas_internas: agregarAlRegistro(linea),
  };
  const { data: fila, error } = await supabaseAdmin.from('turnos').update(patch).eq('id', turnoId).select('*').single();
  if (error?.code === '23505') {
    res.status(409).json({ ok: false, error: `${profesional.nombre} ya tiene un turno que empieza a esa hora ese día` });
    return;
  }
  if (error || !fila) {
    console.error('[editar-turno] Error editando', turnoId, error);
    res.status(500).json({ ok: false, error: 'No se pudo guardar el cambio' });
    return;
  }

  // Lo que depende del turno y tiene que acompañar el cambio:
  // 1) Los recordatorios ya mandados eran para el día/hora anterior: se reinician.
  if (cambiaHorario) {
    await supabaseAdmin.from('recordatorios_config').delete().eq('turno_id', turnoId);
  }
  // 2) Si la clienta estaba marcada como recurrente por este turno, esa marca sigue al servicio nuevo.
  if (cambiaServicio) {
    const { data: marca } = await supabaseAdmin
      .from('clientas_recurrentes_estado')
      .select('*')
      .eq('clienta_id', turno.clienta_id)
      .eq('servicio_id', turno.servicio_id)
      .eq('turno_id_ancla', turno.id)
      .maybeSingle();
    if (marca) {
      const { data: yaExiste } = await supabaseAdmin
        .from('clientas_recurrentes_estado')
        .select('clienta_id')
        .eq('clienta_id', turno.clienta_id)
        .eq('servicio_id', servicioId)
        .maybeSingle();
      if (!yaExiste) {
        await supabaseAdmin.from('clientas_recurrentes_estado').update({ servicio_id: servicioId }).eq('clienta_id', turno.clienta_id).eq('servicio_id', turno.servicio_id);
      }
    }
  }

  if (!esAdmin) {
    await avisarleAYosy(
      `${quien} editó un turno — ${fila.fecha}`,
      `<p><strong>${escapeHtml(quien)}</strong> editó un turno: ${escapeHtml(cambios.join('; '))}.</p>${nota ? `<p>Motivo: ${escapeHtml(nota)}</p>` : ''}`
    );
  }

  res.status(200).json({ ok: true, turno: fila, resumen: cambios, advertencias });
}
