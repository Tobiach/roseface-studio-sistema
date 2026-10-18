# Seguridad pendiente — Rose Face Studio

## 🔴 Auditoría de seguimiento (11/10/2026) — hallazgos nuevos, no cubiertos por la de abajo

Pedido explícito de Tobias: "otra investigación a profundidad de posibles
errores, inconsistencias, hackeos posibles". Probado en vivo contra
producción con el anon key público (igual que la auditoría del 26/9).

**El hallazgo más grave de los dos: `api/actualizar-estado-turno.ts`
dejaba marcar CUALQUIER turno como `sena_confirmada` sin ninguna
verificación de pago.** Este endpoint se creó el 26/9 para sacar el UPDATE
directo del navegador (bien), pero nunca se le puso un límite a qué
estados podía setear — incluía `sena_confirmada`, la misma transición que
`webhook.ts` y `aprobar-comprobante.ts` sí verifican contra un pago real.
Cualquiera podía hacer `POST /api/actualizar-estado-turno` con cualquier
`turnoId` (son enteros secuenciales chicos, fáciles de adivinar) y
`nuevoEstado: "sena_confirmada"` y conseguir una reserva confirmada gratis,
sin pasar por Mercado Pago ni por ninguna profesional. **Arreglado
(11/10/2026, commiteado):** se sacó `sena_confirmada` de los estados
permitidos por este endpoint — confirmado por grep que ningún uso legítimo
(ni `AdminAgenda.tsx` ni nada más) lo necesitaba ahí.

**Relacionado:** el fallback "modo demo" de `Reserva.tsx` (cuando
`crear-preferencia` tira cualquier error) creaba un turno directo desde el
navegador y lo marcaba confirmado usando ese mismo endpoint ahora
corregido. Antes corría ante CUALQUIER falla de red, no solo cuando
Supabase no está configurado — un timeout real en producción le daba a
cualquier clienta una reserva "confirmada" gratis sin querer. **Arreglado
(11/10/2026):** ese camino ahora solo corre si `!supabaseEnabled` (demo
local real, sin backend); en producción, si la API falla, se le avisa a la
clienta y puede reintentar.

**El segundo hallazgo: RLS con más agujeros de los que cubrió el Paso 2 de
abajo.** Probado en vivo con el anon key (filtros que no matchean ninguna
fila real, cero riesgo de tocar datos):

| Tabla | Operación abierta encontrada | ¿Algo legítimo la usa? |
|---|---|---|
| `codigos_acceso` (los PINs) | UPDATE | No, nunca — solo lee el server con service_role. Con esto, alguien que adivine el `id` (son predecibles: `admin-yosy`, `prof-mili`...) podía cambiarle el PIN a Yosy y entrar como Admin. |
| `servicios` | UPDATE (probablemente INSERT/DELETE también) | No — los precios los carga el desarrollador con service_role, nunca el navegador. |
| `turnos` | DELETE | No — no hay ningún `.delete()` sobre turnos en todo `AppContext.tsx`. |
| `profesionales` | UPDATE de la fila entera, incluido `modelo_comision` (el % real) y `alias_cbu` (CBU real) | Solo `horario_disponible` (función `guardarHorario`, AdminHorario.tsx) — el resto de la fila no debería ser escribible. |
| `clientas` | UPDATE y DELETE de cualquier clienta | Solo INSERT (`buscarOCrearClienta`) — ninguna función del navegador actualiza o borra una clienta. |

**SQL para correr en el editor de Supabase (mismo patrón que el Paso 2 de
abajo — Tobias lo corre él mismo, no rompe nada de lo que ya funciona):**

```sql
revoke insert, update, delete on codigos_acceso from anon;
revoke insert, update, delete on servicios from anon;
revoke delete on turnos from anon;
revoke update on profesionales from anon;
grant update (horario_disponible) on profesionales to anon;
revoke update, delete on clientas from anon;
```

**No se tocó (queda igual que antes, a propósito):** la lectura completa
de `clientas`/`profesionales`/`turnos` sigue abierta — es el mismo Paso 3
de abajo (no hay sesión real todavía, decisión de negocio pendiente). El
INSERT en `bloqueos_horario` y `clientas`, y el INSERT en `turnos` (el
fallback de demo) también quedan como están — documentados como riesgo
aceptado hasta que se resuelva el Paso 3.

---

Auditoría hecha el 26/9/2026, con evidencia real corrida contra producción
(no supuestos). Este doc es la fuente de verdad de qué falta en seguridad —
mismo criterio que `PENDIENTE_ONBOARDING.md` para los datos de Yosy.

## Estado del "Paso 3" al 17/10/2026 — endpoints con token de sesión

`api/verificar-pin.ts` ahora devuelve un token firmado (HMAC, 12 hs). Lo exigen:
`api/marcar-sena-manual.ts`, `api/mercadopago/crear-link-pago.ts` y `api/editar-turno.ts`
(editar servicio/día/hora/profesional/precio, cancelar con motivo, reactivar; una
profesional solo toca su agenda, y solo Yosy cambia profesional, precio o turnos completados).

**Todavía SIN token** (riesgo aceptado hasta decidir el resto del Paso 3):
- `api/actualizar-estado-turno.ts` (completar, "recordatorio enviado", servicios extra).
- INSERT de `turnos` (solo 'reservado') y `clientas`, y escrituras de `bloqueos_horario` / `recordatorios_config`.
- UPDATE de `turnos` con la clave pública: se puede cerrar con
  `docs/sql/2026-10-17_revocar_update_turnos_anon.sql` (ya nada legítimo lo usa).
- Lectura completa de `clientas`/`profesionales`/`turnos`.

---

## 🔴 Hallazgo crítico — RLS abierto de par en par

Usando el `anon key` real (el mismo que viaja público en el bundle del
sitio — cualquiera lo puede sacar de las devtools del navegador, no hace
falta login), confirmé con pruebas reales contra producción:

- **Lectura total de `clientas`**: nombre, teléfono, mail de todas.
- **Lectura total de `turnos`**: de cualquier clienta, cualquier profesional.
- **Lectura total de `profesionales`** incluido `modelo_comision` (% real
  de cada una) y `alias_cbu`.
- **Escritura sin bloqueo sobre `turnos`**: probado en vivo sobre un turno
  real (se pudo actualizar un campo y revertirlo, sin ningún error de
  permiso).
- **Inserción libre** en `clientas` (probado, se creó una fila de prueba
  sin fricción).

Osea: el PIN de 4 dígitos para entrar al panel de Yosy **no protege la
base de datos** — solo esconde la interfaz. Cualquiera que sepa pegar 3
líneas de JS contra la URL pública de Supabase puede leer todo y, peor,
puede **marcar su propio comprobante de transferencia como aprobado sin
que la profesional lo revise**, falsificando un turno "pagado" sin pagar
nada.

### ⚠️ Corrección importante a lo que dije antes de cortar el chat

Dije que había un "fix rápido, sin riesgo" para esto. **Eso estaba mal
dicho** — lo revisé bien antes de cerrar el contexto y no es así. La razón:
**no hay autenticación real** (el PIN es un parche de UI, no genera una
sesión ni un token que Postgres pueda usar para distinguir "esto lo pide
Yosy desde su panel" de "esto lo pide cualquiera desde afuera"). Los dos
casos usan literalmente la misma clave.

Esto significa que **toda la lectura/escritura actual del panel admin
depende de que el anon key tenga acceso amplio** — no se puede simplemente
"cerrar todo" sin romper el sitio en producción. Mapeé exactamente qué usa
el navegador directo contra Supabase (sin pasar por ningún servidor), en
`src/context/AppContext.tsx`:

**Lecturas directas** (se hacen apenas carga la app, para TODOS —
clienta pública y Yosy logueada, misma clave): `turnos`, `clientas`,
`servicios`, `profesionales`, `bloqueos_horario`, `recordatorios_config`.

**Escrituras directas desde el navegador**:
| Función (`AppContext.tsx`) | Tabla | Qué escribe | Quién la usa hoy |
|---|---|---|---|
| `crearTurno` (fallback demo) | `turnos` | INSERT | Reserva.tsx si falla la API real |
| ~~`actualizarEstadoTurno`~~ | ~~`turnos`~~ | ~~`estado`, notas~~ | ✅ **migrado (26/9) a `/api/actualizar-estado-turno.ts`** |
| `reprogramarTurno` | `turnos` | fecha/hora | AdminAgenda |
| ~~`subirComprobante`~~ (el UPDATE) | ~~`turnos`~~ | ~~`comprobante_transferencia_url`~~ | ✅ **migrado (26/9) a `/api/guardar-comprobante.ts`** — el upload al bucket sigue siendo del cliente |
| ~~`aprobarComprobante`~~ | ~~`turnos`~~ | ~~`estado`, `aprobado_por_profesional`~~ | ✅ **migrado (26/9) a `/api/aprobar-comprobante.ts`** |
| auto-edición horario | `profesionales` | `horario_disponible` | AdminHorario |
| `crearBloqueo` / borrar | `bloqueos_horario` | INSERT/DELETE | AdminAgenda |
| toggle recordatorio | `recordatorios_config` | UPSERT | AdminAgenda |
| `buscarOCrearClienta` | `clientas` | INSERT | Reserva.tsx (fallback y flujo real) |

### La solución real (no es de una tarde, pero está bien acotada)

**Paso 1 — migrar las 3 escrituras más sensibles a un endpoint de
servidor** (mismo patrón que ya existe en `crear-preferencia.ts` /
`webhook.ts`: el navegador llama a `/api/algo`, el servidor usa el
`service_role` key, nunca el navegador):

1. ✅ **`aprobarComprobante` → `/api/aprobar-comprobante.ts`** (prioridad 1,
   es la que permite falsificar un pago) — **hecho y deployado el 26/9**.
   El endpoint valida que el turno sea circuito transferencia, tenga
   comprobante subido y no esté ya confirmado, hace el UPDATE con el
   service_role y al final manda el aviso por mail — todo server-side.
   Absorbió la lógica que antes vivía en `notificar-turno-confirmado.ts`
   (ese archivo se borró, ya no lo llamaba nadie más). Verificado con
   curl: turno inexistente → 404; turno sin comprobante → 400.
2. ✅ **`subirComprobante` → `/api/guardar-comprobante.ts`** — hecho y
   deployado el 26/9. El upload en sí sigue siendo del cliente (bucket de
   Storage, tiene sus propias políticas — **eso todavía no se revisó,
   queda pendiente**), pero el UPDATE de `comprobante_transferencia_url`
   en `turnos` ahora lo hace el servidor, validando que la URL apunte al
   bucket público de este mismo proyecto y que el turno esté realmente
   `reservado` en circuito transferencia.
3. ✅ **`actualizarEstadoTurno` → `/api/actualizar-estado-turno.ts`** — hecho
   y deployado el 26/9. Valida que el estado nuevo sea uno de los 5 válidos
   (antes se podía mandar cualquier string). **Con esto el Paso 1 completo
   está terminado y verificado con curl contra producción.**

**Paso 2 — ahora que el Paso 1 está completo, correr esto en SQL** (correrlo
ANTES habría roto aprobar-comprobante, guardar-comprobante y
actualizar-estado-turno — ya no, los 3 usan el service_role):

```sql
revoke update on turnos from anon;
grant update (fecha, hora_inicio, hora_fin, notas_internas) on turnos to anon;
```

Esto deja que el navegador siga pudiendo reprogramar (fecha/hora) y tocar
notas, pero nunca más `estado`, `aprobado_por_profesional`, `monto_sena`,
`monto_total`, `id_transaccion_mp`, `sena_verificada_automaticamente`,
`comprobante_transferencia_url` — esos quedan exclusivos del servidor.

**Paso 3 — la lectura completa (`clientas`, `profesionales` con datos
sensibles) sigue abierta después de esto**, porque el panel de Yosy la
necesita y no hay forma de restringirla sin resolver primero el problema
de fondo: no hay sesión real. La solución de fondo ahí es una de estas
dos, a decidir con Tobias (impacto/costo, no una decisión técnica mía
sola):
- **A) Token liviano al validar el PIN** — `verificar-pin.ts` devuelve un
  token firmado (HMAC, con expiración) en vez de solo `{ok:true}`; el
  navegador lo manda en cada pedido a partir de ahí; RLS o los nuevos
  endpoints lo validan antes de devolver datos sensibles. Es la opción
  más prolija, varios días de trabajo repartido.
- **B) Supabase Auth real** — la opción "correcta" a largo plazo, pero es
  directamente el login de verdad que se había descartado como fuera del
  alcance del PDF firmado. Si se hace esto, se resuelve todo de raíz.

**No toqué nada de esto todavía** — ni el paso 1 ni el paso 2 — a
propósito, para no arriesgar romper el sitio en producción sin que Tobias
decida el orden/alcance primero.

## 🟡 Importante — APLICADO Y VERIFICADO (26/9/2026)

Los 3 fixes de abajo ya están en producción (commit `1aca1ea`), verificados
con evidencia real (curl contra prod, no supuestos):

1. ✅ **Rate-limit en el PIN** (`api/verificar-pin.ts`): límite en memoria
   por IP (8 intentos / 10 min, best-effort — se resetea si Vercel levanta
   una instancia nueva, pero frena un script contra la misma instancia
   caliente). Verificado: 8 pedidos con PIN inválido devuelven 200, el 9°
   en adelante devuelve 429. Un PIN correcto resetea el contador de esa IP.
2. ✅ **HTML escapado en los mails automáticos** (`webhook.ts` y
   `notificar-turno-confirmado.ts`): `escapeHtml()` aplicado a
   nombre/teléfono de clienta, servicio y profesional antes de
   interpolarlos en el HTML.
3. ✅ **Rate-limit en `crear-preferencia.ts`**: mismo patrón, 20 pedidos /
   10 min por IP. Verificado: pedido 21 en adelante devuelve 429.

## Estado de los datos (auditado 26/9/2026)

- ✅ `clientas_recurrentes_estado` ya existe en la base — Tobias corrió el
  SQL bien la segunda vez. Contactada/nota/silenciar en "Clientas
  Recurrentes" están funcionando de verdad.
- ✅ Anye, Cris y Ari tienen `alias_cbu` cargado — circuito de
  transferencia completo para las 3.
- ⚠️ **Clienta real nueva encontrada: "Juana marco" (1134263788)** —
  intentó reservar 4 veces (27, 28 y 29/9) y las 4 veces el hold venció
  sin pagar. Vale la pena que Yosy le escriba para ver si tuvo un
  problema pagando, antes de perderla como clienta.
- 🧹 **Datos de prueba sin limpiar todavía** (pendiente confirmación de
  Tobias antes de borrar): 5 clientas "TEST VERIFICACION..." de pruebas
  de esta semana, más las 2 demos de Clientas Recurrentes (Tobias/Muñe,
  turnos 318/319), más "Ejdje" y "Maria Fernandez" (preguntado hace unos
  días, todavía sin resolver si son reales o de prueba).
