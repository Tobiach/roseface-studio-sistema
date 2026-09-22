# Pendiente de onboarding real — Rose Face Studio

Este doc lista qué datos/fotos siguen siendo placeholder en el sistema y de
dónde sale el reemplazo real (formulario "Rose Face Studio — Carga de datos
reales del sistema"). No es un cambio de código — es el mapa de qué falta
cargar y dónde impacta.

## Estudio (Página 1 y 2 del formulario)

- **Horarios de atención del estudio** — confirmar contra lo mostrado en la
  sección "Estamos en Caballito" de Home.tsx.
- ~~¿Atiende en feriados?~~ ✅ **releído el formulario 22/9/2026** — SÍ
  está contestado, no hacía falta modelar una excepción nueva: el
  estudio dijo "Sí, normalmente" y por profesional: Yosy, Anye y Ari
  dijeron "Sí" (no hace falta tocar nada), Mili/Sharon/Cris/Camila
  dijeron "Depende del feriado" — para esas, Yosy ya puede bloquear el
  feriado puntual a mano con "Bloquear horario" en el admin cuando sepa
  si trabaja o no ese día. No es un gap del sistema.
- **Fotos del local** (fachada, interior, ambientación) — Home.tsx usa fotos
  de trabajos, no del local en sí.
- ~~Video de presentación del estudio~~ ✅ **21/9/2026**: en producción en
  el Home (YouTube, ver sección de videos más abajo).

## Precios (Página 3) — impacta directo en cobros reales

- ~~Pestañas~~ ✅ **21/9/2026**: repriceo completo con la lista real que
  mandó Yosy (11 servicios, precios y orden de aparición al reservar) —
  ya en Supabase y en `mockServicios.ts`. Ver `ordenarServicios()` en
  `src/lib/ordenServicios.ts` para el orden.
- **Lista de precios de Cejas** — sigue sin confirmar (estimación inicial).
- ~~Uñas~~ ✅ verificado 22/9/2026 contra el cartel real de Ariannys: los
  13 servicios que ya estaban cargados coinciden en precio exacto. Se
  agregaron los 6 "adicionales" que faltaban (ver más abajo, sección de
  cada profesional) — **queda 1 fila cortada en la foto sin poder leer**,
  puede faltar 1 adicional más.
- ✅ **22/9/2026 — Alisados (Anye) y Faciales/Corporales (Cris)
  reestructurados** con los carteles reales — ver el detalle en la
  sección de cada profesional más abajo. **La duración de estos ~25
  servicios es una estimación mía** (Anye y Cris nunca dieron cuánto dura
  cada tratamiento) — confirmar antes de que el motor de turnos fijos la
  use en serio.
- Confirmación de la seña fija ($30.000) — ya implementada. ✅ **22/9/2026,
  2 excepciones reales confirmadas por Yosy** (doc "dia a dia Rose Face"):
  ninguna seña puede superar el precio del servicio (afecta "Remoción de
  Pestañas" $16.000 — antes pedía $30.000 de seña por un servicio de
  $16.000, ya corregido) y Depilación Láser se cobra 100% por adelantado,
  no solo la seña. Implementado en `calcularMontoSena()`
  (`src/lib/pricing.ts`, duplicado en `crear-preferencia.ts`).
- ✅ **22/9/2026**: "Depilación de Bozo" confirmado con cera/hilo/pinza
  (va con Cejas, no es la láser del 3er viernes) y "Remoción de Pestañas"
  confirmado como turno reservable solo — ambos ya estaban bien
  categorizados en `mockServicios.ts`, no hizo falta mover nada.

## Por cada profesional (Página 4) — Mili, Sharon, Martina, Sofía, Alexandra, Camila, Valentina

- ✅ **22/9/2026**: Ariannys (id `prof-alexandra`) pasa a mostrarse como
  **"Ari"** en toda la web, URL de perfil incluida (`/profesionales/ari`,
  se genera sola desde el nombre).
- ⚠️ **Galería de uñas — solo 3 fotos reales sirven de las 10 que había**:
  al revisarlas una por una (22/9/2026) se encontró que Unas_2/3/7 casi
  no muestran uñas, Unas_9/10 son la misma foto duplicada, y Unas_5/6
  (también duplicadas entre sí) tienen de fondo el cartel de neón de
  **otro local de uñas** — no son trabajos de Rose Face. Se sacaron las 7
  de la galería de Ari; quedan `Unas_1`, `Unas_4`, `Unas_8`. **Hace falta
  pedirle a Yosy/Ari fotos nuevas reales** — el pool actual está casi
  agotado.
- **Nombre y apellido real completo** — hoy se muestra el apodo en todos
  lados; interno, no bloquea nada.
- ~~Foto de perfil~~ ✅ **resuelto 22/9/2026** (hubo varias idas y vueltas
  sobre quién era "Ari" — este es el estado FINAL, confirmado por Tobias
  viendo el sitio en vivo, no seguir corrigiendo sin verlo en producción
  primero): `prof-sharon` (id) = **Sharon**, hace Pestañas, foto real +
  video "Video Ari pestañas". `prof-alexandra` (id) = **Ariannys**, hace
  Uñas, foto real, todavía sin video. Los NOMBRES quedaron como siempre
  estuvieron (Sharon en `prof-sharon`, Ariannys en `prof-alexandra`) — lo
  que se corrigió al final fue solo qué FOTO y qué VIDEO tenía cada una
  (estaban cruzados). Las 6 personas tienen foto real. Como los servicios
  se mapean por id y no por nombre, nunca hizo
  falta tocar `mockServicios.ts`.
  ⚠️ **Sin confirmar todavía**: el % de comisión (45%, en `prof-sharon`)
  y el alquiler + alias `Aribell.st` (en `prof-alexandra`) — si Sharon y
  Ariannys tienen acuerdos de pago propios independientes de qué servicio
  hacen, confirmarlo.
  Descartado: un archivo "Sharon .PNG" que llegó por Drive aparte
  (id `1BPYgCzq4...`) resultó ser un duplicado byte a byte del archivo ya
  usado como foto de Ariannys (mismo tamaño exacto: 2.009.773 bytes) — no
  se usó.
- **Trabajos realizados por profesional**: decisión de Yosy (18/9/2026) —
  ninguna profesional tiene portfolio propio. Ya se sacó el copy que decía
  "Trabajo real de {nombre}" / "Galería de Trabajos Realizados" de
  `PerfilProfesional.tsx` — ahora dice "Estilos y Técnicas que Trabajamos"
  / "Ejemplo del estudio", genérico por categoría (especialidad), no por
  persona. La segmentación de fotos por profesional en
  `trabajosFotos.ts` se mantiene (es solo "qué técnicas hace ella", no
  atribución de autoría).
- **Video de presentación** — decisión 21/9/2026: formato YouTube (probado
  con Tobias, ver artifact de prueba). ✅ **El general ya está en
  producción**: "Video de presentación rose face Studio OK" (Short/vertical,
  cuenta Control Evo) reemplaza al viejo iframe de Google Drive en el Home
  — confirmado real vía oEmbed de YouTube antes de cargarlo, no un
  placeholder. `VideoYoutube.tsx` ahora soporta modo `vertical` (9:16)
  además del horizontal, para Shorts.
  ✅ **22/9/2026 — 4 de 7 cargados en Supabase** (efecto inmediato, sin
  deploy — `video_url` se lee en vivo): Cris (`A6tZdj1x0bo`), Mili
  (`5ip0rEsB1E4`), Yosy (`Xe4aapAiic0`) y **Sharon** (`prof-sharon`,
  "Video Ari pestañas" → `L2nnG27xtGc` — confirmado por Tobias como el
  video definitivo de Sharon). Queda un segundo video de ella sin usar
  (`DC9s9AGWOCI`, "video ari" — Drive: "video ari OK.mp4") por si hace
  falta.
  🎥 **Pendiente subir a YouTube**: "video sharon OK.mp4" (Drive,
  22/9/2026, `10whBBNySCXjWtM4ZUfmEDR_jOb8OKP5W`, 12.8MB) — llegó como
  link de Drive, no de YouTube. Todavía sin usar — Sharon ya tiene un
  video puesto (arriba); confirmar si este lo reemplaza o no hace falta.
  ⚠️ **Faltan videos, y no existen en Drive todavía — hay que
  pedírselos a Yosy**: **Ariannys**, **Anye** y **Depilación Láser** (video del
  lugar/equipamiento, no de una persona).
  Detalle histórico (18-20/9): Yosy (vía cuenta control.evo.admin,
  probablemente Tobias comprimiendo) subió 6 videos .mp4 ya bien
  nombrados: "Video de presentación rose face Studio", "video mili
  pestañas", "Video Yosy pestañas", "Video Cris cosmetologa", y 2 de Ari
  ("video ari OK.mp4" + "Video Ari pestañas.mov" — mismo problema del
  nombre duplicado que las fotos). Pesan 20-56MB cada uno — no se
  pudieron bajar por Drive en esa sesión (el conector tiene un techo de
  ~10MB), pero con el formato YouTube ya no hace falta: los sube
  directo Yosy desde su Drive/celular a YouTube, sin pasar por acá.
- **6 fotos nuevas de trabajos de Uñas** ("Soft Gel✨ - 1 a 5.PNG",
  "Capping✨.PNG", subidas 20/9/2026, ~7-8MB cada una) — nombres coinciden
  con servicios reales de Ariannys (`Soft Gel`, `Capping` en
  `mockServicios.ts`), pero **no se pudieron descargar ni ver** por la
  misma limitación del conector (ver arriba) — y la lección del 18/9 fue
  que el nombre de archivo no siempre coincide con lo que dice la foto.
  No cargar sin verificar visualmente primero.
- ✅ **22/9/2026 — carteles de precios reales de Anye, Cris y Ariannys**
  (3 fotos + 1 "estructura" sin terminar) verificados número por número
  contra la web. Aplicado: Alisados de Anye (4 niveles reales), Faciales
  + Corporales de Cris (21 servicios reales, categoría dividida en dos),
  Adicionales de Ariannys (6 ítems). Sin foto todavía para ninguno de
  estos servicios nuevos (decisión: cargar sin foto por ahora). Detalle
  completo del análisis en la memoria del proyecto.
- **3 planillas de "Agenda" (Sharon, Yosy/negocio, Mili)** — ledger diario
  real de turnos, pagos y comisión por semana desde hace años. Confirmado
  22/9/2026: la planilla sin nombre es de **Yosy / el negocio en
  general**, no de una profesional puntual. De acá salió la corrección
  del % de Sharon (arriba). Falta la extracción completa mes por mes —
  puede servir para: confirmar comisión real de Mili y alquileres de
  Anye/Cris/Ariannys, y armar la lista de clientas frecuentes para
  precargar (pendiente histórico, ver "Recordatorios y recurrencia" más
  abajo).
- **Días y horarios de trabajo reales** — ✅ **auditado 22/9/2026 contra
  el formulario real** (antes de preguntarle nada nuevo a Yosy, releí
  todo lo que ya había contestado). Encontré y corregí 2 bugs reales —
  no placeholders, datos que YA estaban bien en el comentario del código
  pero mal en el valor real: Anye tenía la ventana hasta las 20hs (el
  formulario dice hasta las 16hs) y Ari hasta las 21hs (el formulario
  dice hasta las 19hs). Ya corregido en Supabase y en el código; no
  afectaba qué horarios se podían reservar (eso lo deciden los horarios
  fijos, no la ventana), pero si en algún momento se muestra la ventana
  como texto en algún lado, ahora es la correcta.
  ✅ **22/9/2026, doc "dia a dia Rose Face" — más horarios confirmados**:
  Yosy suma un turno sábado a las 17hs y el domingo pasa a ser corto,
  solo 10 y 12 (antes tenía los mismos 4 turnos que un día de semana).
  Cris arranca a las 13hs de lunes a viernes (antes decía 9am — la hora
  de cierre semanal sigue siendo estimada, no la dijo) y el sábado
  extiende hasta las 20hs. Ari confirmó que sí trabaja sábado corrido
  (antes era un placeholder sin confirmar).
  Sigue sin confirmar: **los días exactos de Ari** (el formulario solo
  dio el horario "9 a 19" + ahora sábado, nunca dijo si trabaja TODOS los
  días de semana) y **la hora de cierre exacta de Cris entre semana**
  (confirmado que arranca 13hs, no cuándo termina — hoy 19hs es una
  estimación razonable, no lo que ella dijo literalmente).
- ~~¿Trabaja en feriados?~~ ✅ ver arriba — ya está contestado por todas.
- ⚠️ **NUEVO 22/9/2026 — "quién hace qué" real, sin aplicar todavía por
  ser ambiguo**: el doc "dia a dia Rose Face" dice textual "Mili solo hace
  clásicas, híbridas, volumen brasilero y efecto húmedo, Lifting de
  pestañas, Cejas laminado, perfilado y sombreado" y "Sharon y Yosy
  hacemos todo, eso más incluido volumen ruso". Dos cosas concretas que
  esto cambiaría pero que NO se tocaron todavía:
  1. Varios servicios de `mockServicios.ts` hoy incluyen a `prof-mili`
     como opción (ej. Natural Volumen, Volumen Tecnológico YY, Lash Rose
     Face, Volumen Brasilero 6D, Mega Volumen) que no están en esa lista
     de 4 técnicas — no se sacó a Mili de ahí porque no hay forma 1:1 de
     mapear "volumen brasilero" a "4D" o "6D" sin preguntarle a Yosy.
  2. **Yosy también hace Pestañas** (no solo Cejas) — hoy
     `profesionalesQueLoRealizan` de NINGÚN servicio de Pestañas incluye
     a `prof-yosy`, así que una clienta no puede reservar pestañas con
     ella aunque en la realidad sí las hace. Es un gap funcional real,
     no solo de datos — falta decidir con Yosy si se agrega a todos los
     servicios de Pestañas o a cuáles.
  3. "Volumen Ruso" es la especialidad de Sharon en su bio, pero no existe
     como servicio reservable en el catálogo — probablemente equivale a
     "Volumen Brasilero 6D" o "Mega Volumen" en el catálogo real, pero no
     se asumió cuál sin que Yosy lo confirme.
  4. Quién ejecuta la Depilación Láser en sí — la pregunta se hizo en el
     doc pero no se ve contestada en el texto extraído.
- **Tiempo de descanso/limpieza entre turno y turno** — **no está
  implementado en el motor de disponibilidad todavía** (hoy los turnos se
  agendan pegados sin buffer). Falta decidir cómo se suma este campo a
  `disponibilidad.ts` una vez que Yosy lo responda por cada profesional.

## Alias/CBU (Página 5) — bloqueante para Fase 5

- ~~Alias/CBU reales~~ ✅ **resuelto desde el 10/9/2026** (este doc había
  quedado desactualizado): Anye → `Anye.studio`, Cris → `Crisbel.gonzalez`,
  Ariannys → `Aribell.st`. Es transferencia bancaria genérica (cualquier
  banco o billetera), no un alias de Mercado Pago — el copy ya lo aclara.
  Pendiente solo confirmar que sigan siendo exactos.
- **Monto de alquiler semanal real** de Anye ($50.000), Cris ($45.000) y
  Ari ($48.000) — siguen siendo placeholders, nunca confirmados por Yosy.
- ~~% de comisión de Mili~~ ✅ **resuelto 22/9/2026**: 55% confirmado,
  palabra literal de Yosy en el doc "dia a dia Rose Face" ("Mili: 55%
  mili, el 45% estudio"). Ya no es placeholder.
- ⚠️ **% de comisión de Sharon — 2 fuentes que NO coinciden, sin cerrar
  del todo**: la planilla real "Agenda Sharon" daba 50% exacto matemático
  en varias semanas; el doc "dia a dia Rose Face" (22/9/2026) tiene la
  respuesta literal y directa de Yosy: "Sharon: 45% Sharon, el 55%
  estudio". Se aplicó **45%** en el código por ser la palabra directa de
  Yosy sobre su propio negocio, pero **falta confirmárselo explícitamente**
  antes de darlo por cerrado — puede que la planilla mezcle otro
  descuento que no es comisión pura.
- Alias `Crisbel.gonzalez` (Cris) — el doc nuevo lo escribe dos formas
  distintas en el mismo documento (`Crisbel.gonzlz` en la tabla de CBU,
  `Crisbel.gonzalez` en el texto). Se dejó `Crisbel.gonzalez` sin tocar
  por ser un alias bancario real — confirmar cuál es el correcto antes de
  que alguna clienta transfiera con el que esté mal.

## Recordatorios y recurrencia (Páginas 6 y 7)

- ~~Anticipación habitual de confirmación~~ ✅ ya estaba contestado en el
  formulario ("48 horas antes", ideal 72h) — ver ventanas 48h/24h/4h ya
  implementadas.
- ~~Estilo de saludo a clientas~~ ✅ **22/9/2026**: el formulario tenía la
  respuesta literal ("Hola hola mi niña...") que nunca se había aplicado
  — los 3 templates de `src/lib/whatsapp.ts` usaban un saludo genérico.
  Ya corregido para usar su voz real, y el recordatorio de 24h ahora
  incluye la dirección del estudio (ella lo pidió explícito).
- **Servicios con ciclo de recurrencia (~21 días)** — el formulario da
  una pista útil sin números exactos: "pestañas casi todas cada 21, uñas
  igual, depilación 1 vez al mes, otros servicios se pueden demorar más"
  — falta traducir esto a `servicios.ciclo_recurrencia_dias` por
  categoría (hoy sin cargar en ninguno).
- **Lista de clientas frecuentes a precargar** — el formulario confirma
  que existe ("Yo tengo una agenda que te podría pasar el acceso") — son
  las 3 planillas de "Agenda" que ya se compartieron. Falta la
  extracción para armar el import.

## Fuera del formulario — hay que conseguirlos aparte

- **Credenciales de Mercado Pago de producción** de la cuenta real de
  Yosy (hoy son credenciales de un usuario de TEST — ningún pago es real
  todavía).
- **Número de WhatsApp real del estudio** — hoy hardcodeado en
  `src/lib/whatsapp.ts` (`5491160549387`), nunca confirmado como el
  número real de Yosy.
- ~~Confirmar el plantel activo~~ ✅ **resuelto 21/9/2026**: 6 personas
  (Yosy, Mili, Sharon, Anye, Cris, Ariannys) + el slot de Depilación
  Láser, todas con foto real. "Ari" era Sharon. 4/7 con video real (Yosy,
  Mili, Cris, Sharon) — faltan Ariannys, Anye y Depilación Láser.

## Ya resuelto, no pendiente

- Dirección real del estudio (Av. Acoyte 25, Caballito).
- Reseñas: se decidió linkear a Google Maps en vez de fabricar contenido.
- Video de presentación en el Home (YouTube, reemplaza tanto la foto de
  fachada vieja como el video de Drive "un día con Yosy" que hubo antes).
- **22/9/2026**: las URLs de perfil dejaron de mostrar el id interno
  (`/profesionales/prof-sharon`) y ahora usan el nombre real
  (`/profesionales/sharon`, `/profesionales/ariannys`, etc.) — no quedaba
  profesional que la URL no coincidiera con el nombre de la persona.
