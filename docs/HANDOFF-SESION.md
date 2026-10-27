# HANDOFF — Rose Face Studio (estado al 22/10/2026, actualizado 25/10 — ver sección 11)

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
- ⚠️ **UN `git push` A `main` DEPLOYA SOLO A PRODUCCIÓN** (descubierto el 22/10: los deploys de las 11:56 y 12:39 coinciden al
  segundo con los commits `c5b90dd` y `826eca0`, y el CLI no se corrió). Tratar cada push como un deploy: avisar/pedir OK antes de
  pushear código, y después verificar el bundle (`vercel ls`). El `npx vercel --yes --prod` manual sobra si el push ya deployó.
- **Estado al 22/10 (tarde):** producción = el último commit pusheado a `main` (ver `git log`; el 22/10 se pusheó el contador de
  reservas por Mercado Pago + Sharon→Roma). Todo lo de octubre (hasta `bb8af09`) está en producción y verificado (bundle + endpoints).
- Commits de octubre (más nuevo primero): `bb8af09` agendar fuera de horario · `bf5d6b6` teléfono de clienta existente + indicador de
  datos · `fe4f5a7` WhatsApp directo a la app · `b75533f` deshacer "Vino" + editar datos de la clienta + teléfonos 549 ·
  `9c18e63` editar reservas · `3970508` link de pago MP · `89103fc` turno manual con errores claros/choques, "Ir a un día",
  descuento MP · `f516054` sin recordatorio 4h · `e2075d5` seña pagada/pendiente visible · `1b9b878` recordatorios de seña
  72/48/24h + calendario completo · `46e7634` fix turno manual (RLS) · `3769db6` textos Home, PIN directo, Anye fuera, extras.
- **SQL**: `servicios_extra` (jsonb en `turnos`) ✅ aplicado · CHECK de `recordatorios_config` con '72h' ✅ aplicado (confirmado 17/10) ·
  `docs/sql/2026-10-17_revocar_update_turnos_anon.sql` ⏳ OPCIONAL, NO aplicado ·
  `docs/sql/2026-10-25_turnos_completado_en.sql` ⏳ **FALTA aplicar** (necesaria para la ventana de 4hs, sección 11) · el SQL de
  RLS del 11/10 (`SEGURIDAD_PENDIENTE.md`) → estado NO verificado en esta sesión.
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
| `editar-turno` | **token** | acciones `editar` (servicio/día/hora/profesional/precio/seña), `cancelar` (motivo), `reactivar`, `reabrir` (deshacer "Vino"), `clienta` (nombre/teléfono/mail — teléfono solo Yosy, salvo completar uno vacío), `completar` (confirmar "Vino" — puede cambiar el servicio PRINCIPAL realizado, no solo extras; si el turno ya estaba completado, una profesional solo puede si es de HOY y no pasaron 4hs desde `completado_en`, 25/10 — fuera de esa ventana, solo Yosy). El total lo calcula el servidor. Anota cada cambio en `notas_internas` y avisa a Yosy por mail si lo hace una profesional |
| `marcar-sena-manual` | **token** | marca `aprobado_por_profesional` en turnos `manual` |
| `mercadopago/crear-link-pago` | **token** | preferencia de MP atada a un turno manual (`external_reference = turno.id`), vence al empezar el turno |
| `mercadopago/crear-preferencia` | pública | reserva online de la clienta: valida horario FIJO de la profesional y choques (409) |
| `mercadopago/webhook` | firma MP | confirma el pago (`sena_confirmada`, `id_transaccion_mp`, `sena_verificada_automaticamente=true`); no revive un turno manual cancelado |
| `actualizar-estado-turno` | **SIN token** (pendiente) | solo "recordatorio enviado" ya (24/10: "completar"/servicios extra se migró a `editar-turno` con token, ver abajo). `sena_confirmada` está bloqueado a propósito |
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
- **Cargo de gestión de $1.000 por reserva** (hasta el 24/10 se llamaba "descuento de Mercado Pago"; 25/10: ya NO es solo MP,
  ver sección 11). Los precios de Pestañas/Cejas/Láser de Mili y Roma ya traen ese $1.000 de más desde el 13/10. En Comisiones
  se resta de la base ANTES de aplicar los % (`descuentoMercadoPago` en `src/lib/pricing.ts`; cuenta solo turnos *completados*
  de la semana). Desde el 25/10 cuenta en DOS casos (no solo uno): (a) pagado por el checkout de MP (`idTransaccionMP` +
  `senaVerificadaAutomaticamente`), o (b) pagado por transferencia PERO solo en el circuito "mercado_pago" (Mili/Roma —
  `circuitoPago==='mercado_pago'`) con el comprobante ya aprobado (`aprobadoPorProfesional`). Las de alquiler fijo
  (Cris/Ari, `circuitoPago==='transferencia'`) nunca tienen este cargo — no reparten por %, no cambia nada para ellas.
  Supuesto SIN confirmar con Yosy: corte 13/10 y monto fijo (MP cobra %, puede variar).
  **Contador de reservas por MP (22/10, decisión de Tobias):** en Comisiones, cada profesional de modelo porcentaje (y cualquiera que
  tenga alguna) ve "Reservas por Mercado Pago": esta semana (atendidas + por atender) × $1.000, y el total desde el 13/10.
  `resumenReservasMercadoPago` (en `comisionesEngine.ts`) usa la MISMA regla que el descuento (id MP + verificada + creada desde el
  13/10) pero cuenta también las que todavía no vinieron; las canceladas no cuentan. El descuento del cierre sigue siendo solo de las
  completadas ("se descuentan cuando se marque Vino"). Las 33 reservas de demo (`MP-SEED`, creadas el 27/9) quedan afuera por el
  corte del 13/10 sin tocarlas ni borrarlas (Tobias pidió no modificarlas todavía).
- **Recordatorios** (WhatsApp, a mano desde "Yosy Recordatorios", el modal del turno o la tarjeta de Clientas Recurrentes):
  seña paga → 48 h y 24 h antes · turno manual con seña pendiente → 72 h (pide seña), 48 h ("en caso de que todavía no hayas
  abonado…") y 24 h (confirma la cita). **El de 4 h está eliminado.** 72/48 h llevan link de pago MP; 24 h no.
- **Seña de un turno manual** = pagada si `estado='sena_confirmada'` o `aprobado_por_profesional=true`; se registra con
  "Marcar la seña como pagada" (exige token). Lo web: `reservado` = pendiente.
- **Permisos de edición**: profesional → solo su agenda, turnos no completados, sin cambiar profesional ni montos; puede deshacer un
  "Vino" solo si el turno es de HOY y corregir datos de clientas de sus turnos. Desde el 25/10 TAMBIÉN puede corregir el servicio/extras
  de un turno YA completado, pero solo si es de HOY y no pasaron 4hs desde que lo completó (`completadoEn` + `VENTANA_EDICION_PROFESIONAL_MIN`,
  ver sección 11) — pasada esa ventana, o de otro día, vuelve a ser solo de Yosy. Yosy → todo (profesional, corregir total/seña, turnos
  completados sin ventana de tiempo, deshacer cualquier "Vino").
- **Teléfono de la clienta (25/10)**: solo lo ve y lo edita Yosy. Una profesional no lo ve en "Gestión de Turno" ni en "Editar datos"
  (el campo ni se renderiza), y el servidor (`editar-turno.ts`, acción `clienta`) la bloquea con 403 si de todos modos lo manda —
  EXCEPTO completar un teléfono que la clienta todavía no tiene cargado (ej. Turno Manual con una clienta existente sin teléfono: la
  profesional ya lo tiene porque se lo acaba de dar la clienta al reservar). Una vez cargado, ya no lo puede volver a tocar.
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
> **Avance 22/10 (misma sesión que el traspaso):** el punto 4 quedó **RESUELTO** y el punto 1 **IMPLEMENTADO** (contador de reservas por
> MP en Comisiones para todas las profesionales; Tobias eligió contar también las pagadas por atender y no tocar las de demo). El punto 2
> queda cubierto en lo que se puede verificar: al pagar la clienta, el webhook deja `sena_confirmada` + id MP + verificada y el contador
> sube solo (el panel refresca cada 45 s); falta ver la "imagen 1" para confirmar que ese es el panel. El punto 3 sigue abierto: espera la
> imagen 2 (o el texto del error). Hallazgos con datos reales en "Hallazgos del 22/10" más abajo.

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
- ✅ **Sharon → Roma alineado (22/10):** `profesionales.nombre` de `prof-sharon` pasó de "Sharon" a "Roma" en la base (PATCH con guarda;
  el id NO cambia). La app ya mostraba "Roma" porque el nombre visible sale del catálogo local (`mockProfesionales.ts`) y de la base
  solo salen datos operativos; el cambio sirve para los mensajes del servidor y mails a Yosy ("X no realiza…"). También se cambiaron
  los textos "Sharon" vivos: explicación de Comisiones, comentarios de tipos/motor y `scripts/seed-supabase.ts`. Los comentarios
  históricos y las notas viejas de turnos no se tocaron. En la base `prof-sharon` ya no queda ningún "Sharon" (solo el id).
- **Mismo desfase pendiente, SIN tocar (no se pidió):** `prof-camila` figura en la base como "Depilación Láser" y la app muestra "Vero".

## 8. Otros pendientes conocidos
Comprar dominio (Namecheap) · video de capacitación para Yosy/profesionales · testeo de punta a punta · datos de Roma (video, bio,
años reales) · comisión real de Vero · duración de los ~25 servicios de Anye/Cris (estimada) · tarifario de Depilación Láser ·
alias correcto de Cris (`Crisbel.gonzalez` vs `.gonzlz`) · confirmar el horario de Roma jueves/viernes/sábado · cerrar el Paso 3 de
seguridad (token en `actualizar-estado-turno`, revocar UPDATE público, etc.) · ideas ofrecidas no construidas: "cerrar semana"
(bloquear ediciones de semanas liquidadas), cambio avisado a la clienta por WhatsApp, política/registro de cancelación (seña
perdida o devuelta), lista de espera.

## 10. Sesión del 24/10/2026 — confirmar "Vino" ya deja cambiar el servicio principal

**Pedido de Tobias**: en el modal "Gestión de Turno" no se podía registrar cómodamente qué se
hizo realmente al final (solo sumar extras, nunca cambiar el servicio PRINCIPAL reservado), y
"Deshacer Vino" cerraba el modal entero en vez de dejarlo listo para confirmar de nuevo.

**Confirmado por lectura de código antes de tocar nada** (no se pudo correr Chromium, ver
abajo): el botón "Sí, deshacer" hacía `setTurnoSeleccionadoModal(null)` sin condición
(`AdminAgenda.tsx`); `PanelServiciosRealizados.tsx` mostraba el servicio reservado como texto
fijo, sin selector — el único `<select>` era para agregar extras.

**3 preguntas respondidas por Tobias (las 3 "Recomendado")**:
1. ¿Cambiar el servicio principal al confirmar "Vino"? → Sí.
2. ¿Tras "Deshacer Vino" el modal queda abierto en "¿Qué servicios se hizo?"? → Sí.
3. ¿Puede una profesional corregir servicios de un turno completado de días anteriores? → No,
   solo Yosy (mismo criterio que ya regía para "Editar reserva").

**Qué se construyó**:
- Nueva acción `completar` en `api/editar-turno.ts` (**con token**, reemplaza lo que antes hacía
  `actualizar-estado-turno.ts` SIN token para `estado='completado'`): confirma el turno, puede
  cambiar `servicioId` (valida que la profesional lo realice, recalcula `monto_total` server-side
  sumando los extras, deja `monto_sena` intacto porque la seña ya se cobró), puede actualizar
  `servicios_extra`, mueve la marca de clienta recurrente al servicio nuevo si corresponde, 403 si
  el turno ya estaba completado y no es Yosy. `actualizar-estado-turno.ts` queda solo para
  "recordatorio enviado" (que no mueve plata).
- `AppContext.tsx`: `completarTurno(id, { servicioId?, serviciosExtra? })` reemplaza a
  `guardarServiciosTurno` (se borró, quedó sin uso) usando el mismo `llamarEdicion` con token que
  ya usan `editarTurno`/`cancelarTurno`/etc.
- `PanelServiciosRealizados.tsx`: la línea del servicio reservado ahora tiene un link "cambiar"
  (oculto si no corresponde, vía la prop `puedeCambiarServicio`) que abre un selector con los
  servicios que hace esa profesional; el total y el "Saldo a cobrar" (que ya restaba la seña,
  del 15/10) se recalculan en pantalla con el servicio elegido.
- `AdminAgenda.tsx`: "Sí, deshacer" ya no cierra el modal — abre directo
  `panelServicios={ modo: 'confirmar' }` para el mismo turno (reabrir no toca servicio/extras/
  seña, así que no hace falta esperar a que se refresque el array de turnos).

**Verificación — con evidencia real, pero una sola pata no se pudo correr**:
- ✅ **Lógica de servidor** (`docs/pruebas/servidor/editar-turno-completar.mjs`, 14 casos, contra
  la base falsa): confirmar sin cambios, cambiar el servicio principal (total recalculado, seña
  intacta), sumar un extra, 403 de una profesional sobre un turno ya completado, Yosy SÍ puede
  (extra previo se conserva), 400 si la profesional no hace ese servicio, 400 turno cancelado,
  401 sin token, 400 extras inválidos — **todos pasan**. Se corrieron también los 2 scripts
  viejos de `editar-turno` (39 + 25 casos) para confirmar que nada se rompió: pasan igual.
- ❌ **Pruebas de PANTALLA (Chromium) NO se pudieron correr en esta sesión**: el navegador no
  tuvo salida de red ni a `localhost` ni a internet (`net::ERR_NAME_NOT_RESOLVED` incluso a un
  sitio externo), con `curl` funcionando normal desde la terminal — restricción del entorno, no
  del código (detalle en `docs/pruebas/README.md`, sección "Gotcha"). **No se verificó
  visualmente** que el selector de servicio se vea bien ni que el modal efectivamente quede
  abierto tras deshacer — solo que el código y la lógica del servidor son correctos. Recomendado
  correr `docs/pruebas/pantalla/` de esto en una sesión donde Chromium sí tenga red, antes de
  confiar 100% en la UI.
- Lint y build: 0 errores.
- **Deployado y verificado** (commit `80aa166`, ver `project_roseface_handoff.md` en la memoria para el detalle del rollback anotado).

## 11. Sesión del 25/10/2026 — teléfono solo para Yosy, cargo de gestión también por transferencia, ventana de 4hs para corregir un turno completado, facturación del día

**Pedido de Tobias** (sobre una captura de "Mi Cierre Semanal" de Roma), 5 puntos — antes de tocar código se leyó el código real
de cada pantalla involucrada y se confirmaron 3 ambigüedades con Tobias (las 3 "Recomendado"):
1. "El número" que no debe verle una profesional = el **teléfono de la clienta**, del todo (ni verlo ni editarlo).
2. El cargo de gestión de $1.000 por transferencia aplica **solo a Mili y Roma** (circuito "mercado_pago" — las únicas con precios
   que ya lo incluyen); Cris/Ari/etc. (alquiler fijo) no cambian.
3. La ventana de 4hs para que una profesional corrija un turno ya completado se mide desde **`completado_en`** (columna nueva), no
   desde la hora reservada.

**Qué se confirmó leyendo el código ANTES de asumir nada** (evitó trabajo en vano): "Mi Cierre Semanal" YA mostraba solo la
facturación propia de cada profesional, nunca el total del negocio (el banner consolidado ya estaba `{!esProfesional && ...}`) —
no había ningún bug ahí. El teléfono, en cambio, SÍ se mostraba sin restricción en "Gestión de Turno" y en "Editar datos", y
además se filtraba en texto plano en el aviso de Turno Manual cuando el nombre tipeado coincidía con una clienta existente.

**Qué se construyó**:
- **Teléfono solo para Yosy**: oculto en el modal del turno y en `PanelEditarClienta` (prop nueva `puedeVerTelefono`) para
  `esProfesional`; el aviso de Turno Manual ya no imprime el número si coincide con una clienta existente. Servidor
  (`editar-turno.ts`, acción `clienta`): 403 si una profesional manda `telefono` y la clienta YA tiene uno cargado (o si intenta
  vaciarlo) — EXCEPCIÓN: completar uno que está vacío sigue permitido (Turno Manual con una clienta sin teléfono: la profesional
  ya lo tiene porque se lo acaba de dar la clienta al reservar).
- **Cargo de gestión por transferencia**: `descuentoMercadoPago` (`src/lib/pricing.ts`) ahora también cuenta un turno pagado por
  transferencia si `circuitoPago==='mercado_pago'` (Mili/Roma) y `aprobadoPorProfesional===true` (comprobante ya aprobado) —
  antes exigía siempre el pago automático de MP. Como esta función la usan `comisionesEngine.ts`, `AdminCaja.tsx` y los badges de
  `AdminAgenda.tsx`, el conteo de "reservas con cargo de gestión" y el descuento en Comisiones se actualizan solos en todos lados.
  Se renombraron los carteles de "Mercado Pago" a "Cargo de gestión" donde correspondía (ya no es 100% exacto decir que "se pagó
  por Mercado Pago" si fue por transferencia).
- **Ventana de 4hs para corregir un turno completado**: columna nueva `turnos.completado_en` (timestamptz, migración
  `docs/sql/2026-10-25_turnos_completado_en.sql`, **falta que Tobias la corra**), se pone SOLO en la primera confirmación (una
  corrección posterior dentro de la ventana no la resetea). `api/editar-turno.ts` (acción `completar`): si el turno ya estaba
  completado y no es Yosy, ahora chequea `fecha===hoy && (ahora − completado_en) <= 4hs` en vez de bloquear siempre. Frontend
  (`AdminAgenda.tsx`, helper `puedeProfesionalEditarCompletado` en `recordatorios.ts`): el botón "Editar servicios realizados" se
  oculta (con mensaje explicativo) para una profesional fuera de la ventana, y el selector de servicio principal
  (`puedeCambiarServicio`) se habilita dentro de la ventana.
- **Facturación del día**: tarjeta nueva en cada profesional de "Mi Cierre Semanal" (`AdminComisiones.tsx`) con el total
  facturado hoy (turnos completados de hoy) y cuántos de esos tienen cargo de gestión — antes solo había cierre semanal y total
  histórico.

**Verificado con evidencia real**:
- ✅ **Lógica de servidor**: se extendió `docs/pruebas/servidor/editar-turno-completar.mjs` (20 casos — 9 previos + 11 nuevos de la
  ventana de 4hs: dentro de la ventana, fuera por horas, fuera por fecha, Yosy sin ventana, `completado_en` se pone una sola vez)
  y `docs/pruebas/servidor/editar-turno-reabrir-y-clienta.mjs` (29 casos, reescritos los de teléfono para la regla nueva) —
  **todos pasan**; se re-corrieron `editar-turno-edicion-cancelar-reactivar.mjs` (39) y `editar-turno-fuera-de-horario-medianoche.mjs`
  (3) para confirmar que nada se rompió. Se extendió `docs/pruebas/logica/reservas-mercado-pago.mjs` con el caso de transferencia
  en circuito MP vs. circuito transferencia — pasa.
- ❌ **Pantalla (Chromium) NO se corrió** (no se intentó este turno; mismo tipo de limitación posible que el 24/10, no confirmada
  de nuevo). Sin verificar visualmente: que el teléfono realmente no aparezca en pantalla para una profesional, que el botón
  "Editar servicios realizados" se oculte/muestre bien según la ventana, que la tarjeta de "Facturación de hoy" se vea bien.
- Lint y build: 0 errores.
- **Deployado y verificado** (commit `d84c50b`, Tobias corrió el SQL y dio el OK). Deployment
  `roseface-studio-sistema-k5ki3rfzn-tobiachs-projects.vercel.app`, bundle confirmado (`index-D3DxHk71.js`,
  "Cargo de gestión" y "Facturación de hoy" presentes) y endpoint probado sin escribir (sin token → 401).

### 11.1 Agregado el mismo 25/10 (de noche): a una profesional ya no se le muestra cuánto facturó el estudio
Pedido nuevo de Tobias sobre la misma pantalla de "Mi Cierre Semanal": que a una profesional (modelo %, Mili/Roma) **solo le
figure su pago**, sin ver el total facturado ni la base de cálculo — así no puede ver tan gráficamente cuánto facturó el
estudio y cuánto le corresponde a ella. Confirmado con Tobias (2 preguntas): el "Cargo de gestión" SÍ se deja visible junto al
monto a liquidar (es una aclaración útil, no revela el total del estudio); la tarjeta "Facturación de hoy" y "Reservas con cargo
de gestión" quedan como están (son su propia facturación, no la del estudio, y no arman el mismo paso a paso).
**Qué se sacó** (`AdminComisiones.tsx`, solo para `esProfesional`): la fila "Total de tus turnos" y la fila "Base para el
cálculo". Yosy sigue viendo todo igual que antes (incluida la fila que sí le muestra el corte de Rose Face, eso no cambió).
**Verificado**: lint y build en 0; es un cambio de qué se renderiza (sin tocar cálculos ni el servidor), así que no hacía falta
una prueba de lógica nueva — se revisó el JSX a mano para confirmar que ninguna otra rama (alquiler fijo) quedó afectada.
Pantalla (Chromium) tampoco se corrió para esto. **Deployado y verificado**: commit `542829d`, deployment
`roseface-studio-sistema-nnhvjn7rb-tobiachs-projects.vercel.app`, bundle confirmado (`index-CZElEWwg.js`) y endpoint probado
sin escribir. Rollback a este bloque si hiciera falta: `npx vercel rollback roseface-studio-sistema-k5ki3rfzn-tobiachs-projects.vercel.app --yes`.

## 9. Cómo verificar un deploy (patrón usado siempre)
1. `npm run lint` y `npm run build` en 0 → commit → (avisar/pedir OK) `git push origin main` — **el push ya deploya solo**; confirmar con
   `npx vercel ls --prod` (aparece un deploy nuevo a los ~20 s) y usar `npx vercel --yes --prod` solo si no apareció.
2. Bundle: bajar `https://roseface-studio-sistema.vercel.app/` → buscar `assets/index-*.js` → `grep` de textos nuevos y que no estén los viejos.
3. Endpoints sin escribir: sin token 401, token falso 401, profesional ajena 403, sin cambios 400, inexistente 404; la web pública
   (`crear-preferencia` a las 23:30) sigue dando 409; `webhook` sin firma 401.
4. Actualizar la memoria (`project_roseface_cambios_octubre.md`) y este documento.
