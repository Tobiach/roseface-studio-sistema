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
- **Foto de perfil** — Yosy mandó por Drive 6 fotos reales del equipo
  (18/9/2026) y el 20/9/2026 les puso nombre de archivo en Drive. Con eso
  se confirmaron y ya están cargadas: Anye (por su remera "ANYE — BEAUTY
  STUDIO"), Mili, Cris y **Yosy** (`prof-yosy.jpg` ya no es el logo, es su
  foto real).
  ✅ **21/9/2026 — Ariannys confirmada**: Yosy renombró en Drive la foto
  "Ari " (buzo Roseface + lunar cerca de la boca) a **"Ariannys"** — ya
  cargada en `prof-alexandra.jpg`.
  ✅ **21/9/2026 (noche) — resuelto el misterio "Ari": es Sharon.**
  Confirmado por Tobias: la foto con mechón rosa + frenillos (la que
  quedaba ambigua) es Sharon → cargada en `prof-sharon.jpg`. `pendientes/`
  ya quedó vacía, las 6 fotos de perfil están asignadas.
  ⚠️ Ojo con un archivo llamado "Sharon .PNG" que llegó por Drive aparte
  (id `1BPYgCzq4...`) — es un **duplicado byte a byte** del archivo ya
  usado como Ariannys (mismo tamaño exacto: 2.009.773 bytes), no una foto
  distinta. No se usó. Si en algún momento aparece una foto de Sharon que
  se vea igual a la de Ariannys, es este archivo — no es que se haya
  vuelto a mezclar.
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
  ✅ **21/9/2026 — Cris, Mili y Yosy cargados en Supabase** (efecto
  inmediato, sin deploy — `video_url` se lee en vivo): Cris (`A6tZdj1x0bo`,
  "Video Cris cosmetologa"), Mili (`5ip0rEsB1E4`, "video mili pestañas"),
  Yosy (`Xe4aapAiic0`, "Video Yosy pestañas"). Los primeros 4 links que
  pasó Tobias fallaban (quedaron en "Privado" en vez de "Oculto" al
  subirlos) — los volvió a publicar y ahí sí cargaron; los títulos reales
  los leí con la API oEmbed de YouTube, no adivinados.
  ✅ **21/9/2026 (noche) — resuelto: "Ari" = Sharon.** Primero había
  cargado "Video Ari pestañas" (`L2nnG27xtGc`) en el perfil de Ariannys
  por la similitud del nombre — error (Ariannys hace Uñas, no Pestañas).
  Confirmado por Tobias que "Ari" es Sharon → `L2nnG27xtGc` ya está en
  `prof-sharon.video_url`. Queda un segundo video de ella sin usar
  (`DC9s9AGWOCI`, "video ari" — Drive: "video ari OK.mp4") por si hace
  falta más adelante, no es necesario cargarlo ahora que ya tiene uno.
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
  quedado desactualizado): Anye → `Anye.studio`, Ariannys → `Aribell.st`,
  Cris → `Crisbel.gonzalez`. Es transferencia bancaria genérica (cualquier
  banco o billetera), no un alias de Mercado Pago — el copy ya lo aclara.
  Pendiente solo confirmar que sigan siendo exactos (podrían estar
  abreviados/mal transcriptos del formulario original).
- **Monto de alquiler semanal real** de Anye ($50.000), Cris ($45.000) y
  Ariannys ($48.000), y **% de comisión** real de Mili (55%) y Sharon
  (45%) — todos siguen siendo placeholders puestos para poder probar el
  sistema, nunca confirmados por Yosy. Alimenta directo el panel de
  Comisiones (`AdminComisiones.tsx`) — con el número real mal, la cuenta
  que Yosy le paga a cada una sale mal.

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
  Láser, todas con foto y la mayoría con video real. "Ari" era Sharon.

## Ya resuelto, no pendiente

- Dirección real del estudio (Av. Acoyte 25, Caballito).
- Reseñas: se decidió linkear a Google Maps en vez de fabricar contenido.
- Video "un día con Yosy" embebido en Home (reemplaza la foto de fachada
  vieja en "Estamos en Caballito").
