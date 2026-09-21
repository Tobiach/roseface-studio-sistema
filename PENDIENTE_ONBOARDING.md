# Pendiente de onboarding real — Rose Face Studio

Este doc lista qué datos/fotos siguen siendo placeholder en el sistema y de
dónde sale el reemplazo real (formulario "Rose Face Studio — Carga de datos
reales del sistema"). No es un cambio de código — es el mapa de qué falta
cargar y dónde impacta.

## Estudio (Página 1 y 2 del formulario)

- **Horarios de atención del estudio** — confirmar contra lo mostrado en la
  sección "Estamos en Caballito" de Home.tsx.
- **¿Atiende en feriados?** — no está modelado todavía en el sistema (hoy
  solo existe `horarioDisponible` por día de semana, no una excepción por
  feriado). Si la respuesta es "depende", hay que decidir cómo se carga.
- **Fotos del local** (fachada, interior, ambientación) — Home.tsx usa fotos
  de trabajos, no del local en sí.
- ~~Video de presentación del estudio~~ ✅ **21/9/2026**: en producción en
  el Home (YouTube, ver sección de videos más abajo).

## Precios (Página 3) — impacta directo en cobros reales

- ~~Pestañas~~ ✅ **21/9/2026**: repriceo completo con la lista real que
  mandó Yosy (11 servicios, precios y orden de aparición al reservar) —
  ya en Supabase y en `mockServicios.ts`. Ver `ordenarServicios()` en
  `src/lib/ordenServicios.ts` para el orden.
- **Lista de precios de Cejas y Uñas** — los cargados hoy en
  `src/data/mockServicios.ts` / tabla `servicios` son la estimación inicial
  con la que se armó el sistema, nunca confirmados por Yosy.
- **Servicios nuevos o dados de baja** que no estén en la lista actual.
- Confirmación de la seña fija ($20.000, sin excepción) — ya implementada
  y confirmada con Tobias; el formulario solo la re-confirma con Yosy.

## Por cada profesional (Página 4) — Mili, Sharon, Martina, Sofía, Alexandra, Camila, Valentina

- **Nombre y apellido real completo** — hoy se muestra el apodo en todos
  lados; interno, no bloquea nada.
- ~~Foto de perfil~~ ✅ **resuelto 21/9/2026**: las 6 personas tienen foto
  real (Yosy mandó por Drive el 18/9, terminó de confirmarse el 21/9).
  **Ojo con el mapeo id ↔ nombre, se corrigió dos veces**: la foto/video
  de "Ari" NO es de la persona que usa el id `prof-alexandra` — es de la
  persona que usa el id `prof-sharon`. O sea, hoy:
  - `prof-sharon` (id) → se llama **"Ariannys"**, hace Pestañas.
  - `prof-alexandra` (id) → se llama **"Sharon"**, hace Uñas.
  Los ids quedaron como estaban (son solo URLs internas), lo que cambió
  fue el campo `nombre` en `mockProfesionales.ts` y en Supabase. Como los
  servicios se mapean por id (no por nombre), no hizo falta tocar
  `mockServicios.ts`.
  ⚠️ **Sin confirmar todavía**: el % de comisión (45%, en `prof-sharon`)
  y el alquiler + alias `Aribell.st` (en `prof-alexandra`) se quedaron
  pegados al id — no se movieron con el nombre. Si Ariannys y Sharon
  tienen acuerdos de pago propios (no ligados a qué servicio hacen), hay
  que confirmarlo y mover esos campos también.
  Descartado: un archivo "Sharon .PNG" que llegó por Drive aparte
  (id `1BPYgCzq4...`) resultó ser un duplicado byte a byte del archivo ya
  usado como foto (mismo tamaño exacto: 2.009.773 bytes) — no se usó.
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
  ✅ **21/9/2026 — 4 de 6 cargados en Supabase** (efecto inmediato, sin
  deploy — `video_url` se lee en vivo): Cris (`A6tZdj1x0bo`), Mili
  (`5ip0rEsB1E4`), Yosy (`Xe4aapAiic0`), y en `prof-sharon` (nombre
  "Ariannys") el que decía "Video Ari pestañas" (`L2nnG27xtGc`) — con el
  mapeo id↔nombre ya corregido, este video queda en el lugar correcto sin
  tocar nada. Queda un segundo video de ella sin usar (`DC9s9AGWOCI`,
  "video ari" — Drive: "video ari OK.mp4") por si hace falta más adelante.
  ⚠️ **Faltan 2 videos, y no existen en Drive todavía — hay que
  pedírselos a Yosy**: el de **Anye** y el de **Sharon** (la persona en
  `prof-alexandra`, la de uñas). Ningún lote de Drive trajo nunca un
  video para estas dos.
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
  con servicios reales de la persona en `prof-alexandra` (hoy "Sharon",
  ver corrección de nombres arriba) (`Soft Gel`, `Capping` en
  `mockServicios.ts`), pero **no se pudieron descargar ni ver** por la
  misma limitación del conector (ver arriba) — y la lección del 18/9 fue
  que el nombre de archivo no siempre coincide con lo que dice la foto.
  No cargar sin verificar visualmente primero.
- **Días y horarios de trabajo reales** — los cargados en el seed de
  Supabase (`profesionales.horario_disponible`) son un supuesto inicial,
  no confirmados una por una con cada profesional. Esto alimenta
  directamente `calcularHorariosDisponibles` — si están mal, el sistema va
  a ofrecer turnos en horarios que en realidad no atienden.
- **¿Trabaja en feriados?** — mismo caso que el del estudio, no modelado
  todavía.
- **Tiempo de descanso/limpieza entre turno y turno** — **no está
  implementado en el motor de disponibilidad todavía** (hoy los turnos se
  agendan pegados sin buffer). Falta decidir cómo se suma este campo a
  `disponibilidad.ts` una vez que Yosy lo responda por cada profesional.

## Alias/CBU (Página 5) — bloqueante para Fase 5

- ~~Alias/CBU reales~~ ✅ **resuelto desde el 10/9/2026** (este doc había
  quedado desactualizado): Anye → `Anye.studio`, Cris → `Crisbel.gonzalez`,
  y el alias `Aribell.st` (en el id `prof-alexandra`, hoy nombre
  "Sharon" — ver corrección arriba). Es transferencia bancaria genérica
  (cualquier banco o billetera), no un alias de Mercado Pago — el copy ya
  lo aclara. Pendiente confirmar que sigan siendo exactos, y **si el
  alias `Aribell.st` en realidad es de Ariannys y no de Sharon** (dado
  que el nombre se parece), ahora que se corrigió a quién pertenece cada
  id.
- **Monto de alquiler semanal real** de Anye ($50.000), Cris ($45.000) y
  Sharon/id `prof-alexandra` ($48.000), y **% de comisión** real de Mili
  (55%) y Ariannys/id `prof-sharon` (45%) — todos siguen siendo
  placeholders puestos para poder probar el sistema, nunca confirmados
  por Yosy. Alimenta directo el panel de Comisiones
  (`AdminComisiones.tsx`) — con el número real mal, la cuenta que Yosy le
  paga a cada una sale mal.

## Recordatorios y recurrencia (Páginas 6 y 7)

- **Anticipación habitual de confirmación** (48h/24h/mismo día/varía).
- **Estilo de saludo a clientas** — para que el copy de los mensajes
  automáticos suene como Yosy.
- **Servicios con ciclo de recurrencia (~21 días)** y su ciclo real si
  difiere — alimenta `servicios.ciclo_recurrencia_dias`.
- **Lista de clientas frecuentes a precargar** (opcional) — nombre,
  teléfono, servicio y profesional habitual.

## Fuera del formulario — hay que conseguirlos aparte

- **Credenciales de Mercado Pago de producción** de la cuenta real de
  Yosy (hoy son credenciales de un usuario de TEST — ningún pago es real
  todavía).
- **Número de WhatsApp real del estudio** — hoy hardcodeado en
  `src/lib/whatsapp.ts` (`5491160549387`), nunca confirmado como el
  número real de Yosy.
- ~~Confirmar el plantel activo~~ ✅ **resuelto 21/9/2026**: 6 personas
  (Yosy, Mili, Sharon, Anye, Cris, Ariannys) + el slot de Depilación
  Láser, todas con foto y 4/6 con video real. "Ari" era Ariannys (no
  Sharon — corregido, ver arriba).

## Ya resuelto, no pendiente

- Dirección real del estudio (Av. Acoyte 25, Caballito).
- Reseñas: se decidió linkear a Google Maps en vez de fabricar contenido.
- Video "un día con Yosy" embebido en Home (reemplaza la foto de fachada
  vieja en "Estamos en Caballito").
