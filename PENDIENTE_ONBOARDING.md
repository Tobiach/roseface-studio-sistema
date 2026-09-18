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
- **Video de presentación del estudio** (opcional).

## Precios (Página 3) — impacta directo en cobros reales

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
  (18/9/2026). Solo pudimos confirmar 1 con certeza por texto en la propia
  foto (remera "ANYE — BEAUTY STUDIO" → ya cargada como `prof-martina`).
  Las otras 5 quedaron guardadas sin usar en
  `src/assets/images/profesionales/pendientes/` (nombradas por rasgos
  visuales) — **hay que preguntarle a Yosy cuál es cuál** antes de
  asignarlas a Mili/Sharon/Cris/Ariannys/ella misma, para no ponerle la
  cara de una persona equivocada a otra. `prof-yosy.jpg` hoy es solo el
  logo del estudio, no una foto de ella — la más urgente de resolver.
- **Trabajos realizados por profesional**: decisión de Yosy (18/9/2026) —
  ninguna profesional tiene portfolio propio. Ya se sacó el copy que decía
  "Trabajo real de {nombre}" / "Galería de Trabajos Realizados" de
  `PerfilProfesional.tsx` — ahora dice "Estilos y Técnicas que Trabajamos"
  / "Ejemplo del estudio", genérico por categoría (especialidad), no por
  persona. La segmentación de fotos por profesional en
  `trabajosFotos.ts` se mantiene (es solo "qué técnicas hace ella", no
  atribución de autoría).
- **Video de presentación** — Yosy mandó 3 videos sin nombre (.mov, ~80MB
  c/u) el 18/9/2026. Pesados para meter directo al repo/build de Vercel y
  sin forma de identificar el contenido sin verlos enteros. Pendiente:
  preguntarle a Yosy qué muestra cada uno, y subirlos a un host de video
  (YouTube sin listar, Supabase Storage o similar) en vez de commitear el
  archivo — así no infla el bundle del sitio.
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
