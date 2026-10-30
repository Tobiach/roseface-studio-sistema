# Pruebas de Rose Face Studio (guardadas el 22/10/2026)

Son los scripts con los que se verificó cada cambio de octubre antes de deployar. **No forman parte de la app**
(no se empaquetan ni se corren solos): se corren a mano, desde una carpeta TEMPORAL fuera del repo.
Ninguno guarda datos reales ni contiene secretos: leen las variables de `.env.local` en el momento de correr.

## Reglas que se usaron siempre
1. **Nunca escribir en la base real para probar.** Las escrituras del navegador se interceptan con
   `page.route('**/rest/v1/**', ...)` (se devuelve una fila falsa). La lectura sí es real (datos de producción).
2. Lo que toca plata o permisos se prueba contra una **base falsa en memoria** (`servidor/fake-supabase.mjs`).
3. Después de deployar se verifica en producción solo con pedidos que **no guardan nada** (401/403/400/404, sondas con
   cuerpo inválido o con una clienta inexistente, que terminan en un error de clave foránea).
4. Lo que no se pudo probar (un guardado exitoso real, un iPhone real, un pago real) se dice explícitamente.

## Cómo correr las pruebas de LÓGICA / SERVIDOR (Node, sin navegador)
Requiere `esbuild` (ya viene con Vite en `node_modules/.bin/esbuild`).
```bash
# 1) compilar el endpoint apuntando a la base falsa
node_modules/.bin/esbuild api/editar-turno.ts --bundle --platform=node --format=esm \
  --outfile=<carpeta-temporal>/editar-turno.mjs --alias:@supabase/supabase-js=<carpeta-temporal>/fake-supabase.mjs
# 2) copiar a esa carpeta temporal fake-supabase.mjs + los .mjs de docs/pruebas/servidor y correr
node editar-turno-edicion-cancelar-reactivar.mjs      # 39 casos
node editar-turno-reabrir-y-clienta.mjs               # 25 casos
node editar-turno-fuera-de-horario-medianoche.mjs     # 3 casos
# Lógica pura del navegador (se compila src/lib/*.ts y se importa como ./disp.mjs o ./wa2.mjs):
node_modules/.bin/esbuild src/lib/disponibilidad.ts --bundle --platform=node --format=esm --outfile=<tmp>/disp.mjs
node logica/horarios-habituales-y-web-de-clientas.mjs # 14 casos (usa ./disp.mjs)
node_modules/.bin/esbuild src/lib/whatsapp.ts --bundle --platform=node --format=esm --outfile=<tmp>/wa2.mjs
node logica/abrir-whatsapp-iphone-android-pc.mjs      # 12 casos (usa ./wa2.mjs; tarda ~5 s por los timers)
```
(Si un script se queja de `navigator`, es Node 24: ya se redefine con `Object.defineProperty`.)

## Cómo correr las pruebas de PANTALLA (Chromium real)
Requiere `playwright-core` instalado **fuera del repo** (ej. `npm i playwright-core` en la carpeta temporal) y el Chromium que
ya trae `%USERPROFILE%/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe` (se usa por `executablePath`).
```bash
# desde la raíz del repo: levantar la app con la base real (lecturas) en un puerto libre
npx vite --port=5189
# cargar las variables y correr un script desde la carpeta temporal
set -a && . ./.env.local && set +a
BASE_URL=http://localhost:5189 node <tmp>/fuera-de-horario.mjs
```
- Cada script trae su `BASE` (puerto) al principio: ajustarlo o pasar `BASE_URL`.
- El PIN se **simula** (`/api/verificar-pin` y los endpoints con token se responden desde el test): nunca se usa un PIN real.
- **Una sola pestaña viva a la vez**: con varias abiertas (sin cerrar los `context`) la 4ª carga se traba por timeout.
  Los scripts nuevos cierran el contexto anterior (`abiertos.splice`).
- Para mirar la Agenda en un día puntual se usa el selector `input[aria-label="Ir a un día"]` (hay otro `input[type=date]`
  del rango: no usar `.nth(0)` a ciegas).
- El texto de algunos títulos sale en MAYÚSCULAS por CSS (`innerText` lo respeta): comparar con `/i`.
- El formato de moneda trae espacio no separable (`$ 1.000`): usar `\s` en las regex.

## Qué cubre cada script
| Script | Qué verifica |
|---|---|
| `pantalla/home-pin-anye-extras.mjs` | Textos del Home, Anye fuera de todo, PIN → panel directo, panel de servicios extra |
| `pantalla/turno-manual-errores-fechas-comisiones.mjs` | Turno manual (choques, errores claros, fechas lejanas), "Ir a un día", descuento MP en Comisiones |
| `pantalla/recordatorios-recurrentes.mjs` | Mensajes 72/48/24h, cola, Clientas Recurrentes ("Vino hace X días"), nota con marca |
| `pantalla/sena-pagada-pendiente.mjs` | Cartel de seña, "Marcar como pagada" con token, formulario "¿Ya abonó?", Recurrentes con turno próximo |
| `pantalla/calendario-cobertura.mjs` | 257/257 reservas dibujadas en el calendario (antes 204) |
| `pantalla/link-de-pago-mp.mjs` | Recordatorio de seña con link de MP, fallbacks (sin link / sin PIN), 24h sin link |
| `pantalla/editar-reserva.mjs` | Editar servicio/día/hora (profesional vs Yosy), cancelar con motivo, reactivar |
| `pantalla/deshacer-vino-y-datos-clienta.mjs` | Deshacer "Vino", editar nombre/teléfono/mail de la clienta, aviso de clienta sin teléfono |
| `pantalla/whatsapp-sin-pestanas.mjs` | Con UA de iPhone no se abre ninguna pestaña; en PC una sola |
| `pantalla/telefono-clienta-existente-y-datos-base.mjs` | El teléfono tipeado se guarda en una clienta existente; indicador "datos actualizados hace…" |
| `logica/reservas-mercado-pago.mjs` | `resumenReservasMercadoPago` (canceladas, demo, anteriores al 13/10, otra profesional, límites de la semana), que el descuento del cierre no cambió, y (25/10) que el cargo de gestión por transferencia solo cuenta en el circuito "mercado_pago" (compilar `src/lib/comisionesEngine.ts` como `./eng.mjs`) |
| `servidor/editar-turno-completar.mjs` | Acción `completar`: confirmar "Vino" cambiando el servicio PRINCIPAL (no solo extras), total recalculado, seña ya cobrada intacta, 400 si el servicio no lo hace esa profesional o el turno está cancelado, 401 sin token, extras inválidos — y (25/10) la ventana de 4hs para que una profesional corrija un turno ya completado: dentro de la ventana permite, fuera por horas o por fecha bloquea (403), Yosy sin ventana, `completado_en` se pone solo en la primera confirmación — 20 casos |
| `servidor/editar-turno-reabrir-y-clienta.mjs` | Acciones `reabrir` y `clienta` — (25/10) reescrito el bloque de teléfono: una profesional ya no puede ver/cambiar uno que la clienta ya tiene cargado (403), pero sí completar uno vacío; Yosy sin restricción — 29 casos |
| `pantalla/comisiones-reservas-mercado-pago.mjs` | Comisiones con datos reales: el bloque "Reservas por Mercado Pago" de cada profesional coincide con lo calculado desde la base (esperado leído con la service key adentro del script), vista de Mili sin datos ajenos, sin "Sharon" |
| `logica/instagram-reels.mjs` | `extraerCodigoInstagram`: los 5 links reales del 30/10 con parámetros de seguimiento, otras formas de link de Instagram, y los que deben rechazarse (perfil, YouTube, dominios parecidos, caracteres peligrosos). Compilar `src/lib/instagram.ts` como `./ig.mjs` |
| `pantalla/videos-instagram-perfiles.mjs` | Perfiles `/profesionales/{roma,mili,yosy,cris,ari}` con su reel de Instagram: iframe al reel correcto, el reproductor carga el video, tamaño exacto (alto = 1,25 × ancho + 218 px), sin scroll horizontal en 360 px; Vero (YouTube) sigue igual. Inyecta los links en la respuesta de `profesionales` (`INYECTAR=0` para probar lo ya cargado en la base) |
| `pantalla/mili-volumen-tecnologico.mjs` | Perfiles públicos (`/profesionales/mili`, `/roma`, `/yosy`, URL por nombre): Mili lista Volumen Tecnológico YY y no Natural/Medio/Mega Volumen ni Lash Rose Face (22/10) |
| `pantalla/fuera-de-horario*.mjs` | Agendar fuera de horario / día libre, avisos, marca ⏱ en calendario, tope de medianoche, web de clientas intacta |

## Gotcha: Chromium puede no tener salida de red en algunos entornos

24/10/2026: en una sesión puntual, el Chromium lanzado por Playwright no pudo conectarse ni
a `localhost` (vite) ni a un sitio externo (`net::ERR_NAME_NOT_RESOLVED` en `https://example.com/`)
aunque `curl` desde la terminal sí respondía — una restricción de red a nivel del proceso del
navegador, no arreglable con `--no-sandbox` ni otros flags. En ese caso no se pudieron correr las
pruebas de PANTALLA; se usaron igual las de LÓGICA/SERVIDOR (no abren navegador, no vieron el
problema) y se avisó explícitamente qué no se pudo verificar. Si esto vuelve a pasar, no insistir
con flags de Chromium — probar primero si Node/curl sí tienen salida de red y documentarlo.

## Pruebas de producción hechas sin escribir (ejemplo de patrón)
Leer un PIN real desde `codigos_acceso` con la service key **dentro del script, sin imprimirlo**, hacer login en
`/api/verificar-pin`, y con ese token llamar al endpoint con casos de rechazo (sin token 401, token falso 401, otra
profesional 403, sin cambios 400, turno inexistente 404). Ver los bloques de verificación al final de cada deploy en
`docs/HANDOFF-SESION.md`.
