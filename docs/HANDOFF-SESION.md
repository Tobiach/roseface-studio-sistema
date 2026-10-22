# HANDOFF — Rose Face Studio (estado al 22/10/2026)

> Documento de traspaso entre sesiones de Claude Code. Leerlo ENTERO antes de tocar nada.
> Complementa a `CLAUDE.md` (reglas del repo), `docs/SEGURIDAD_PENDIENTE.md` (RLS/seguridad),
> `docs/PENDIENTE_ONBOARDING.md` (datos reales de Yosy) y `docs/pruebas/README.md` (cómo se verificó todo).
> La memoria personal de Claude (`~/.claude/projects/c--Users-estudiante-controlevo-puntos/memory/`) tiene la
> cronología detallada en `project_roseface_cambios_octubre.md`.

## 1. Qué es y cómo se trabaja con Tobias
- **Proyecto**: sistema de reservas + panel (agenda, comisiones, caja, clientas recurrentes) de **Rose Face Studio**
  (estética, Caballito). Repo `Tobiach/roseface-studio-sistema`, producción `https://roseface-studio-sistema.vercel.app`.
  Stack: React 19 · Vite 6 · TS · Tailwind 4 · Supabase (real) · Vercel. Un solo estado global: `src/context/AppContext.tsx`.
- **Cliente final**: Yosy (dueña) y sus profesionales. Tobias es quien vende/implementa; **no es técnico** y le habla a Yosy
  por WhatsApp: cuando pide "un mensaje para Yosy" se le da un texto **pegable, en lenguaje simple, rioplatense**, en un solo bloque,
  empezando por una línea "Written for: …" (la línea del destinatario va en el mensaje al usuario, no dentro del texto).
- **Reglas fijas** (dadas por Tobias): responder SIEMPRE en español · nunca inventar datos (nombres, precios, horarios,
  comisiones: preguntar) · verificar con evidencia real (curl, queries, Chromium, contenido del bundle deployado) antes de decir
  "resuelto" · `npm run lint` y `npm run build` en 0 antes de commitear · commits con `Co-Authored-By` (Tobias pidió
  "Claude Sonnet 5"; los recordatorios del sistema piden "Claude Sonnet 5.5": en esta sesión se usó 5.5 desde `f516054`) ·
  **nunca `git push --force`** · deploy con `npx vercel --yes --prod` (proyecto ya linkeado, PC B) **pero AVISAR ANTES y esperar
  su OK**, salvo que el mismo mensaje diga "deploya" · no tocar diseño visual sin pedido · no abrir frentes no pedidos ·
  no mostrar bloques de código/diff en el chat (resumir en prosa).
- **Formato de respuestas que funcionó**: qué se hizo, qué se verificó (y CÓMO), qué NO se pudo verificar, qué tiene que hacer
  Tobias. Ofrecer opciones ("frentes") cuando pide ideas, sin construirlas.
- **Antes de escribir en datos reales**: no hacerlo. Si hace falta evidencia, interceptar escrituras o usar la base falsa
  (ver `docs/pruebas/README.md`). El clasificador de permisos bloqueó (con razón) insertar filas de prueba en producción.
- **Otra sesión** de Claude (importación de agendas reales de Yosy/Mili) escribió en `turnos`/`clientas`: no pisar esas tablas
  con scripts; antes de commitear mirar `git status` y agregar solo los archivos propios (`git add <archivos>`).

## 2. Estado de producción
- **Último commit deployado: `bb8af09`** (20/10/2026). Todo lo de abajo está en producción y verificado (bundle + endpoints).
- Commits de octubre (más nuevo primero): `bb8af09` agendar fuera de horario · `bf5d6b6` teléfono de clienta existente + indicador de
  datos · `fe4f5a7` WhatsApp directo a la app · `b75533f` deshacer "Vino" + editar datos de la clienta + teléfonos 549 ·
  `9c18e63` editar reservas · `3970508` link de pago MP · `89103fc` turno manual con errores claros/choques, "Ir a un día",
  descuento MP · `f516054` sin recordatorio 4h · `e2075d5` seña pagada/pendiente visible · `1b9b878` recordatorios de seña
  72/48/24h + calendario completo · `46e7634` fix turno manual (RLS) · `3769db6` textos Home, PIN directo, Anye fuera, extras.
- **SQL**: `servicios_extra` (jsonb en `turnos`) ✅ aplicado · CHECK de `recordatorios_config` con '72h' ✅ aplicado (confirmado 17/10) ·
  `docs/sql/2026-10-17_revocar_update_turnos_anon.sql` ⏳ OPCIONAL, NO aplicado · el SQL de RLS del 11/10
  (`SEGURIDAD_PENDIENTE.md`) → estado NO verificado en esta sesión.
- **Pruebas end-to-end reales pendientes** (porque escribirían en producción): guardado exitoso de editar/cancelar/reactivar/
  deshacer/editar clienta, un pago REAL por el link de MP (el link se generó y la página de MP abre, falta pagar), WhatsApp en un
  iPhone real, y un turno manual real fuera de horario.

## 3. Mapa del sistema (lo que importa)
**Cliente** `src/`: `context/AppContext.tsx` (estado, carga/refresco de Supabase cada 45 s y al volver a la pantalla,
`estadoDatos`/`refrescarDatos`, token de sesión, `editarTurno/cancelarTurno/reactivarTurno/reabrirTurno/editarClienta`,
`marcarSenaManual`, `crearLinkPago`, `enviarRecordatorioWhatsApp`) · `pages/admin/AdminAgenda.tsx` (modal del turno, formulario de
turno manual, cola "Yosy Recordatorios", calendario) · `AdminComisiones.tsx` · `AdminCaja.tsx` · `AdminClientasRecurrentes.tsx` ·
`components/admin/`: `CalendarioGrilla`, `PanelEditarTurno`, `PanelEditarClienta`, `PanelServiciosRealizados`, `AvisoHorario` ·
`lib/`: `comisionesEngine` (cierre semanal), `pricing` (seña fija $30.000, `descuentoMercadoPago`), `recordatorios`
(`estadoSena`, `ventanasDelTurno`, `estadoRecordatorios`, `mensajeParaTurno`), `whatsapp` (mensajes, `normalizarTelefonoWhatsApp`,
`abrirChatWhatsApp`), `disponibilidad` (horarios libres de la web, `encajeEnHorario`, `finSinPasarMedianoche`), `recurrencia`.
**Servidor** `api/` (funciones Vercel; cada archivo duplica su `getSupabaseAdmin()` y el verificador de token: Vercel NO comparte
código entre funciones):
| Endpoint | Auth | Qué hace |
|---|---|---|
| `verificar-pin` | rate-limit por IP | PIN → rol + **token HMAC 12 h** (secreto = `SUPABASE_SERVICE_ROLE_KEY`) |
| `editar-turno` | **token** | acciones `editar` (servicio/día/hora/profesional/precio/seña), `cancelar` (motivo), `reactivar`, `reabrir` (deshacer "Vino"), `clienta` (nombre/teléfono/mail). El total lo calcula el servidor. Anota cada cambio en `notas_internas` y avisa a Yosy por mail si lo hace una profesional |
| `marcar-sena-manual` | **token** | marca `aprobado_por_profesional` en turnos `manual` |
| `mercadopago/crear-link-pago` | **token** | preferencia de MP atada a un turno manual (`external_reference = turno.id`), vence al empezar el turno |
| `mercadopago/crear-preferencia` | pública | reserva online de la clienta: valida horario FIJO de la profesional y choques (409) |
| `mercadopago/webhook` | firma MP | confirma el pago (`sena_confirmada`, `id_transaccion_mp`, `sena_verificada_automaticamente=true`); no revive un turno manual cancelado |
| `actualizar-estado-turno` | **SIN token** (pendiente) | completar, "recordatorio enviado", servicios extra. `sena_confirmada` está bloqueado a propósito |
| `aprobar-comprobante`, `guardar-comprobante` | — | circuito de transferencia (Ari, Cris) |

**Base (Supabase, proyecto `xwsavcnsinshelfhagon`)** — hechos verificados:
- INSERT desde el navegador en `turnos` **solo con `estado='reservado'`** (RLS; 'sena_confirmada'/'completado' → 42501).
- Índice único `turno_unico_por_horario` = misma profesional + fecha + **hora de INICIO** (turnos no cancelados). Los que se pisan
  a medias SÍ entran. No hay tope de cantidad ni de fecha (se sondeó +60 días, días llenos, domingos, 23:30, 07:00…).
- `recordatorios_config.plantilla` ∈ {'72h','48h','24h','4h'}. `servicios.requiere_sena` NO existe (usar `select('*')`).
- `clientas`: 166 al 20/10 (50 con teléfono válido, 115 sin, 1 con texto). Las 115 importadas son `cli-hist-*` (sin teléfono).
- `codigos_acceso` (PINs): sin fila para Anye (borrada 15/10). Nunca imprimir ni guardar PINs.

## 4. Reglas de negocio vigentes (no volver a preguntar)
- **Seña** fija $30.000 (capada al precio; Depilación Láser 100%). Transferencia (Ari/Cris, alquiler fijo) NO pasa por MP.
- **Mercado Pago**: descuenta **$1.000 por reserva pagada por su checkout** (los precios de Pestañas/Cejas/Láser subieron $1.000
  el 13/10 para cubrirlo). En Comisiones se resta de la base ANTES de aplicar los % (`descuentoMercadoPago`: exige
  `idTransaccionMP` + `senaVerificadaAutomaticamente` + `fechaCreacion >= 2026-10-13`; cuenta solo turnos *completados* de la semana).
  Supuestos SIN confirmar con Yosy: corte 13/10 y monto fijo (MP cobra %, puede variar).
- **Recordatorios** (WhatsApp, a mano desde "Yosy Recordatorios", el modal del turno o la tarjeta de Clientas Recurrentes):
  seña paga → 48 h y 24 h antes · turno manual con seña pendiente → 72 h (pide seña), 48 h ("en caso de que todavía no hayas
  abonado…") y 24 h (confirma la cita). **El de 4 h está eliminado.** 72/48 h llevan link de pago MP; 24 h no.
- **Seña de un turno manual** = pagada si `estado='sena_confirmada'` o `aprobado_por_profesional=true`; se registra con
  "Marcar la seña como pagada" (exige token). Lo web: `reservado` = pendiente.
- **Permisos de edición**: profesional → solo su agenda, turnos no completados, sin cambiar profesional ni montos; puede deshacer un
  "Vino" solo si el turno es de HOY y corregir datos de clientas de sus turnos. Yosy → todo (profesional, corregir total/seña, turnos
  completados, deshacer cualquier "Vino").
- **Agendar a mano a cualquier hora/día** (Yosy y profesionales; la web de clientas solo ve los bloques fijos): aviso informativo,
  nunca bloquea. Yosy puede elegir cualquier profesional; **una profesional agenda solo en su propia agenda** (decisión: si cargara en la
  de otra no la vería ni podría editarla).
- Un turno que cruzaría la medianoche termina a las 23:59. Anye (`prof-martina`) está `activa:false` y fuera de todo (sin PIN, sin
  listas); el id se conserva. Alisados eliminado. Sharon → Roma (mismo id `prof-sharon`).
- Comisiones: Mili 55 % · Roma 45 % · Yosy 100 % (en pantalla) · Vero 0 % (placeholder, sin confirmar) · alquiler fijo semanal:
  Cris $60.000, Ari $52.500. La profesional NUNCA ve el corte del estudio ni los % de otras.

## 5. Hallazgos técnicos / gotchas (ahorran horas)
- **Bash del agente**: un heredoc con muchas comillas/backticks rompe ("unexpected EOF"). Escribir los scripts con la herramienta
  Write en la carpeta temporal y correrlos con `node archivo`. Para parchear código: scripts `.cjs` con `s.replace` exacto.
- Los archivos del repo son CRLF (git avisa); los parches leen y normalizan `\r\n` y lo restauran.
- `tsc` puede quedarse sin memoria: `export NODE_OPTIONS=--max-old-space-size=3072` antes de lint/build.
- El proyecto NO usa `strictNullChecks`: las uniones discriminadas por `ok: boolean` no estrechan; usar un solo objeto con campos
  opcionales.
- **WhatsApp**: `wa.me` exige formato internacional. Los 30 teléfonos reales eran de 10 dígitos sin país → `normalizarTelefonoWhatsApp`
  los pasa a 549 + área + número. En celular se abre la app con `whatsapp://send?phone=…&text=…` (sin pestañas); caída a `wa.me` en la
  misma pestaña tras 2 s si no pasó nada. **No se pudo probar en iPhone real.** No se confirmó el esquema `whatsapp-smb://` (Business):
  NO se usa; si hay WhatsApp y WhatsApp Business instalados el teléfono pregunta cuál (elegir Business).
- Playwright headless: la página de MP detecta headless ("Hubo un error accediendo"); con UA real y `--disable-blink-features=AutomationControlled`
  abre y muestra "Seña — … $30.000".
- Sesiones abiertas desde ANTES de los deploys no tienen token: la primera acción protegida pide el PIN otra vez (es esperado).
- Vite dev no sirve `/api`: en las pruebas de pantalla se simulan los endpoints con `page.route`.
- Quedan textos "Control.Evo Engine" en los encabezados de Comisiones y Clientas Recurrentes (marca ajena al cliente): no tocados.

## 6. Qué NO está resuelto (deuda de seguridad, ver `SEGURIDAD_PENDIENTE.md`)
Sin token todavía: `actualizar-estado-turno`, INSERT de `turnos` (solo 'reservado') y `clientas`, `bloqueos_horario`,
`recordatorios_config`, y la lectura completa de clientas/profesionales/turnos con la clave pública. El UPDATE público de `turnos`
(fecha/hora/notas) se puede cerrar con el SQL opcional (ya nada legítimo lo usa).

## 7. PENDIENTES INMEDIATOS (pegados por Tobias el 22/10/2026 — NO empezados)
> Textos literales; las imágenes 1 y 2 NO llegaron a este contexto: pedirlas de nuevo o que Tobias las describa.

1. *"En todas las profesionales que se cobre por MP debe de figurar el total de reservas que se hicieron por MP para que la
   profesional sea consciente de que se hicieron muchas reservas a su nombre y que por cada reserva es 1000 (mil pesos), no solamente
   Yosy."* → mostrar, en el panel de CADA profesional (y el de Yosy), la cantidad de reservas por MP y los $1.000 por cada una.
   *"Ahora debes de fijarte en el sistema todas las reservas cargadas que hay para poner a la respectiva profesional la cantidad de
   reserva que tiene y por ende marcarle lo de MP."* → recorrer los turnos existentes y contar por profesional.
   **Ojo con la regla actual**: `descuentoMercadoPago` solo cuenta turnos **completados**, con `idTransaccionMP` +
   `senaVerificadaAutomaticamente` y creados desde el 13/10. Aclarar con Tobias si el contador debe incluir reservas
   pagadas aún no completadas/futuras, y qué hacer con las 33 de demo ('MP-SEED-…', ago–sep) y con las importadas de las planillas
   (id MP sin verificar). Solo hay ~2 reservas reales por MP al 20/10 (406 cancelada, 682). Profesionales por MP = las de modelo
   `porcentaje`; Cris y Ari (alquiler fijo) cobran por transferencia, no por MP.
2. *"Es importante que si Yosy manda un link a una clienta para que abone la seña y luego la clienta lo abona, se entrelace
   automáticamente con el panel que se muestra en la imagen 1."* → hoy el webhook marca `sena_confirmada` + `id_transaccion_mp` +
   `sena_verificada_automaticamente` (y eso alimenta Seña pagada y el descuento MP) pero el descuento/contador solo aparece al
   completar el turno. Verificar de punta a punta (con un pago real o simulando el webhook contra la base falsa) qué debería verse
   en cuanto la clienta paga (probablemente el panel de Comisiones/Caja de la imagen 1) y ajustarlo.
3. *"La imagen 2 es porque Yosy me dice que no puede editar, verifica si es por alguna razón, si no quedó deployado o es su
   caché de su celular/pc."* → ver el mensaje exacto de la imagen. Hipótesis a descartar con evidencia: (a) sesión sin token →
   pide PIN ("Volvé a ingresar tu PIN"); (b) un turno completado y ella con PIN de profesional; (c) caché (no hay service worker: los
   assets llevan hash; sí puede haber index.html cacheado → forzar recarga); (d) error del endpoint (409 choque de hora, 403 permisos).
   Producción tiene `bb8af09` con `/api/editar-turno` respondiendo 401/403/400 como corresponde.
> **Avance 22/10 (misma sesión que el traspaso):** el punto 4 quedó **RESUELTO** (ver abajo). Los puntos 1, 2 y 3 siguen abiertos: hay
> hallazgos con datos reales en la sección "Hallazgos del 22/10" al final de este bloque; el punto 1 espera la respuesta de Tobias
> sobre qué cuenta como "reserva por MP", y el 3 espera la imagen 2 (o el texto del error).

4. ✅ **RESUELTO 22/10** — `prof-mili` agregada a `servicios.profesionales_que_lo_realizan` de `serv-pestanas-volumen-tecnologico`
   (antes `["prof-sharon","prof-yosy"]`, ahora `["prof-mili","prof-sharon","prof-yosy"]`; PATCH con guarda, sin tocar otros servicios) y
   alineado `src/data/mockServicios.ts` + `PENDIENTE_ONBOARDING.md`. Verificado con Chromium (`docs/pruebas/pantalla/mili-volumen-tecnologico.mjs`):
   el perfil público de Mili lista Volumen Tecnológico YY y NO Natural/Medio/Mega Volumen ni Lash Rose Face. No requiere deploy (el
   catálogo se lee de Supabase). **Pendiente de Yosy:** confirmar si Mili hace también esas otras 4 técnicas. Pedido original:
   *"A Mili no le figura que realiza el Volumen Tecnológico (servicio) y ella sí lo hace, verifica y agrégalo/arreglalo."* →
   en la tabla `servicios` agregar `prof-mili` a `profesionales_que_lo_realizan` del servicio "Volumen Tecnológico" (verificar
   el id/nombre exacto; en el repo suele figurar como "Volumen Tecnológico YY") y alinear `src/data/mockServicios.ts`. El 22/9 se
   la había sacado de 5 servicios de Pestañas por una respuesta de Yosy ("Mili solo hace clásicas, híbridas, volumen brasilero y
   efecto húmedo…"): **confirmar con Tobias si ahora hace también Natural Volumen, Medio Volumen, Lash Rose Face o Mega Volumen**
   antes de agregar más que el pedido. Registrar el cambio en la memoria de datos reales.

### Hallazgos del 22/10 (consultas de solo lectura a la base real, sin escribir; no se imprimieron ids de pago completos)
- **Reservas con id de Mercado Pago (44 de 368 turnos):** 33 son de demo (`MP-SEED-########`: Mili 10, Roma 9, Yosy 7, Depilación Láser 7)
  y 11 son reales (id de 12 dígitos): **Yosy 8** (1 cancelada, 2 completadas —674 y 682—, 5 con seña confirmada a futuro) y **Mili 3**
  (744, 745, 746: señas confirmadas a futuro). Roma, Depilación Láser, Cris y Ari: 0 reales. Hoy `descuentoMercadoPago` solo cuenta las
  *completadas* creadas desde el 13/10 → Yosy muestra 2 y Mili 0, aunque ya tiene 3 pagas. Por eso el punto 1 necesita definir qué cuenta.
- **El link de pago SÍ funcionó en producción (punto 2):** 8 turnos *manuales* (674, 678, 715, 732, 737, 739, 744–746) tienen id de pago real
  de MP con `sena_verificada_automaticamente=true` y estado `sena_confirmada`: el circuito link → clienta paga → webhook → turno
  confirmado ya corrió de verdad. El panel refresca solo cada 45 s o al volver a la pantalla. Falta confirmar con Tobias qué es el
  "panel de la imagen 1" (probablemente Comisiones/Caja: ahí el descuento aparece recién al marcar "Vino").
- **La edición SÍ funcionó en producción (punto 3):** hay 48 líneas de auditoría de Yosy en `notas_internas` (editar día/hora/servicio,
  cancelar, corregir teléfono/nombre de la clienta), la última el 22/10 00:23. Ninguna profesional (Mili, etc.) editó todavía. Producción
  sirve el bundle con "Editar reserva", `/api/editar-turno` responde 401 sin token, no hay service worker y `index.html` va con
  `must-revalidate` (sin caché pegada). El cartel del PIN (z-60) se dibuja por encima de la ventana del turno (z-50). Causas posibles que
  quedan, a confirmar con la imagen 2: (a) sesión del celular sin token → pide el PIN y, tras ingresarlo, hay que repetir la acción
  (el PIN redirige a la agenda); (b) turno cancelado → "reactivalo antes de editarlo"; (c) turno completado con PIN de profesional;
  (d) choque de hora (409); (e) una profesional que "no realiza" el servicio elegido (400) — p. ej. Mili con Volumen Tecnológico antes de
  esta corrección.
- **Detalle a revisar (no tocado):** en la base `profesionales.nombre` de `prof-sharon` figura como "Sharon", pero la app muestra "Roma"
  (slug `/profesionales/roma`): los mensajes del servidor ("X no realiza…", mails a Yosy) usan el nombre de la base.

## 8. Otros pendientes conocidos
Comprar dominio (Namecheap) · video de capacitación para Yosy/profesionales · testeo de punta a punta · datos de Roma (video, bio,
años reales) · comisión real de Vero · duración de los ~25 servicios de Anye/Cris (estimada) · tarifario de Depilación Láser ·
alias correcto de Cris (`Crisbel.gonzalez` vs `.gonzlz`) · confirmar el horario de Roma jueves/viernes/sábado · cerrar el Paso 3 de
seguridad (token en `actualizar-estado-turno`, revocar UPDATE público, etc.) · ideas ofrecidas no construidas: "cerrar semana"
(bloquear ediciones de semanas liquidadas), cambio avisado a la clienta por WhatsApp, política/registro de cancelación (seña
perdida o devuelta), lista de espera.

## 9. Cómo verificar un deploy (patrón usado siempre)
1. `npm run lint` y `npm run build` en 0 → commit → `git push origin main` → (avisar) `npx vercel --yes --prod`.
2. Bundle: bajar `https://roseface-studio-sistema.vercel.app/` → buscar `assets/index-*.js` → `grep` de textos nuevos y que no estén los viejos.
3. Endpoints sin escribir: sin token 401, token falso 401, profesional ajena 403, sin cambios 400, inexistente 404; la web pública
   (`crear-preferencia` a las 23:30) sigue dando 409; `webhook` sin firma 401.
4. Actualizar la memoria (`project_roseface_cambios_octubre.md`) y este documento.
