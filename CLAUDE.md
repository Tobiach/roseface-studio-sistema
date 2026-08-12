# CLAUDE.md — Rose Face Studio (sistema operativo digital)

## URL Producción
https://roseface-studio-sistema.vercel.app

## Repo
https://github.com/Tobiach/roseface-studio-sistema

## Local
`C:\Users\estudiante\roseface-studio-sistema\`

---

## QUÉ ES ESTE PROYECTO

Sistema operativo digital para Rose Face Studio (centro de estética facial): reserva de turnos online para clientas + panel admin de agenda, comisiones, caja y fidelización VIP. Reemplaza WhatsApp/papel para gestionar la operación del salón.

Origen: generado en Google AI Studio, importado acá para deploy y ajustes reales.

---

## STACK

React 19 · Vite 6 · TypeScript · Tailwind 4 · react-router-dom 7 · Framer Motion (`motion`) · Lucide React · Recharts · Vercel
Backend: ninguno todavía — todo el estado (turnos, clientas, profesionales, VIP) vive en `src/data/mock*.ts` servido vía `AppContext`. Se resetea en cada refresh. Pendiente migrar a Supabase cuando haya que persistir reservas reales.

Rubro sin playbook propio en `controlevo-os/playbooks/industry/` (no es gastronomy/retail/hospitality). Más cercano a hospitality por la lógica de reservas, pero con motor de comisiones propio de salón de belleza.

---

## SUPABASE

No aplica todavía. Cuando se migre de mocks a datos reales: región South America (São Paulo), seguir el patrón null-safe de `controlevo-os/playbooks/technical/supabase-setup.md`.

---

## ARQUITECTURA

- `src/router.tsx` — rutas públicas (`/`, `/reserva`, `/reserva/confirmacion`, `/profesionales`, `/profesionales/:id`) bajo `PublicLayout` (Header+Footer); rutas `/admin/*` (agenda, comisiones, caja, vip) bajo `AdminLayout` (Sidebar).
- `src/context/AppContext.tsx` — único estado global de la app (turnos, clientas, profesionales, servicios, beneficios VIP). Todas las mutaciones (`crearTurno`, `actualizarEstadoTurno`, `canjearBeneficio`, etc.) viven acá, en memoria.
- `src/lib/comisionesEngine.ts` — cálculo de comisiones por profesional.
- `src/data/mock*.ts` — seed data. Es lo primero que hay que reemplazar por Supabase real.
- `package.json` trae `express`/`dotenv`/`@google/genai` como residuo de la plantilla de AI Studio — no están en uso en `src/` (verificado por grep). No tocar/limpiar salvo que se pida explícitamente.

---

## REGLAS DE TRABAJO

```
1. npm run lint = 0 errores antes de cualquier commit
2. npm run build debe pasar sin warnings críticos
3. Commit con mensaje descriptivo después de cada bloque de trabajo
4. No agregar dependencias sin mencionar el motivo
5. No tocar diseño visual sin pedido explícito
6. Responder solo al terminar: qué hice, máximo 3 líneas
7. No explicar lo que vas a hacer — hacerlo
8. Sin abrir frentes no pedidos
```

---

## DEPLOY

Proyecto Vercel ya linkeado (`tobiachs-projects/roseface-studio-sistema`), deploy directo desde PC B — ver PAT-012 en `controlevo-os/PATTERNS.md`.

```powershell
npm run lint
npm run build
git add -A && git commit -m "descripcion"
git push origin main

$token = [System.Environment]::GetEnvironmentVariable("VERCEL_TOKEN","User")
npx vercel deploy --prod --token "$token" --yes
```

Sigue siendo acción de producción — confirmar con Tobias antes de correr el deploy, no asumir.

---

## ERRORES FRECUENTES

| Error | Fix |
|---|---|
| — | Ninguno conocido todavía (proyecto recién importado, 12/8/2026) |

Ver también: `C:\Users\estudiante\.claude\controlevo-os\ERROR_REGISTRY.md`

---

## LO QUE NO HACER NUNCA

- No asumir que hay persistencia real: hoy todo son mocks en memoria, se pierden al refrescar la página.
- No confundir con Control.Evo Puntos (Premia.ar) — proyecto de cliente distinto, repo distinto.
- No deployar a producción sin avisar a Tobias, aunque el token esté linkeado.
