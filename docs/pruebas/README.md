# Pruebas de Rose Face Studio (guardadas el 22/10/2026)

Son los scripts con los que se verificó cada cambio de octubre antes de deployar. **No forman parte de la app**
(no se empaquetan ni se corren solos): se corren a mano, desde una carpeta TEMPORAL fuera del repo.
Ninguno guarda datos reales ni contiene secretos: leen las variables de `.env.local` en el momento de correr.

## Atajos (desde el 24/10/2026): todo con `npm run`
| Comando | Qué hace |
|---|---|
| `npm run test:logica` | Corre TODAS las pruebas de `servidor/` y `logica/` (base falsa en memoria, sin red). Sale con código 1 si alguna línea dice `FALLA` o una prueba explota. Es lo que corre el CI (`.github/workflows/ci.yml`) |
| `npm run setup:pruebas` | Una vez por máquina: instala `playwright-core` en `~/.roseface-pruebas` (fuera del repo) y busca el Chromium de Playwright (`-- --instalar-chromium` lo baja si no hay) |
| `npm run pruebas:pantalla -- --lista` / `-- <nombre>` | Levanta la app en un puerto libre con datos reales de lectura (usa `.env.local` del repo o del repo principal), corre esa prueba de `pantalla/` con Chromium y apaga todo. La primera vez en una carpeta nueva precalienta Vite (puede tardar unos minutos) |
| `npm run verificar:deploy [-- --vercel]` | Solo lectura sobre producción: bundle con los textos de `scripts/pruebas/deploy-esperado.json`, caché de `index.html`, endpoints que deben rechazar (401/405). `--vercel` suma `vercel ls` (se corre desde la carpeta principal, que es la vinculada al proyecto) |
| `npm run leer:base -- <tabla> "<consulta>" [--contar]` | Lector de la base SOLO con GET y con datos sensibles enmascarados |

Los scripts de `pantalla/` aceptan `BASE_URL` y `CHROMIUM_EXE` (los pone el corredor); a mano siguen funcionando con sus valores por defecto.
Cada caso tiene que imprimir una línea que empiece con `OK   ` o `FALLA`: así deciden el corredor y el CI (varias pruebas terminan en
`process.exit(0)` aunque fallen). Skills del proyecto relacionadas: `probar-sin-escribir`, `verificar-deploy` (en `.claude/skills/`).

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
| `logica/reservas-mercado-pago.mjs` | `resumenReservasMercadoPago` (canceladas, demo, anteriores al 13/10, otra profesional, límites de la semana) y que el descuento del cierre no cambió (compilar `src/lib/comisionesEngine.ts` como `./eng.mjs`) |
| `pantalla/comisiones-reservas-mercado-pago.mjs` | Comisiones con datos reales: el bloque "Reservas por Mercado Pago" de cada profesional coincide con lo calculado desde la base (esperado leído con la service key adentro del script), vista de Mili sin datos ajenos, sin "Sharon" |
| `pantalla/mili-volumen-tecnologico.mjs` | Perfiles públicos (`/profesionales/mili`, `/roma`, `/yosy`, URL por nombre): Mili lista Volumen Tecnológico YY y no Natural/Medio/Mega Volumen ni Lash Rose Face (22/10) |
| `pantalla/fuera-de-horario*.mjs` | Agendar fuera de horario / día libre, avisos, marca ⏱ en calendario, tope de medianoche, web de clientas intacta |

## Pruebas de producción hechas sin escribir (ejemplo de patrón)
Leer un PIN real desde `codigos_acceso` con la service key **dentro del script, sin imprimirlo**, hacer login en
`/api/verificar-pin`, y con ese token llamar al endpoint con casos de rechazo (sin token 401, token falso 401, otra
profesional 403, sin cambios 400, turno inexistente 404). Ver los bloques de verificación al final de cada deploy en
`docs/HANDOFF-SESION.md`.
