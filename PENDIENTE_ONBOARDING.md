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
  ⚠️ **Queda 1 foto sin usar, todavía ambigua**: la otra ("Ari" original
  — mechón rosa + frenillos, sin buzo del estudio) sigue sin nombre claro
  en Drive. Combinado con que **ninguna foto ni video de toda la carpeta
  está nombrado "Sharon"**, cada vez pesa más la hipótesis de que Sharon
  puede no estar en el equipo — hay que preguntárselo directo a Yosy, no
  asumir. Queda en `src/assets/images/profesionales/pendientes/` hasta
  que responda.
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
  ⚠️ **Corrección importante (21/9/2026): "Ari" NO es Ariannys.**
  Había cargado "Video Ari pestañas" (`L2nnG27xtGc`) en el perfil de
  Ariannys por la similitud del nombre — error real: Ariannys hace Uñas,
  no Pestañas, y Tobias confirmó que es una persona distinta. Se sacó ese
  `video_url` de `prof-alexandra` (queda en `null`). Quedan **2 videos de
  "Ari" sin asignar** (`L2nnG27xtGc` "Video Ari pestañas" y `DC9s9AGWOCI`
  "video ari") más la foto pendiente-1 (mechón rosa + frenillos, ver
  arriba) — los 3 son de la misma persona, especialista en Pestañas, que
  todavía no tiene perfil propio claro en el sistema. Sigue sin
  confirmarse si "Ari" es el nombre real/apodo de Sharon (que no tiene
  ninguna foto ni video propio en ningún lote) o alguien nuevo — hay que
  preguntarle a Yosy directo, no asumir de nuevo.
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

- **Alias o CBU de cada profesional de alquiler fijo** (Martina, Sofía,
  Alexandra, Camila, Valentina) — necesario para mostrarle a la clienta
  dónde transferir en el circuito de pago por transferencia. **Es
  transferencia bancaria genérica (cualquier banco o billetera), no un
  alias de Mercado Pago específicamente** — el copy de la pantalla ya lo
  aclara así.
  ⚠️ **Ahora mismo tienen un alias FALSO cargado a propósito**
  (`martina.pendiente-cargar`, etc. — 5/9/2026, sin sufijo `.mp` a
  propósito para no sugerir que es un alias de MP) solo para poder ver la
  estructura del flujo de transferencia + comprobante antes de tener los
  datos reales. Hay que reemplazarlos por los alias/CBU reales antes de
  dejar el sistema operativo para clientas de verdad — si no, alguien
  podría intentar transferir a un alias que no existe.

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
- **Confirmar el plantel activo** — que las 8 profesionales cargadas
  (incluida Yosy) sigan siendo las que trabajan hoy en el estudio.

## Ya resuelto, no pendiente

- Dirección real del estudio (Av. Acoyte 25, Caballito).
- Reseñas: se decidió linkear a Google Maps en vez de fabricar contenido.
- Video "un día con Yosy" embebido en Home (reemplaza la foto de fachada
  vieja en "Estamos en Caballito").
