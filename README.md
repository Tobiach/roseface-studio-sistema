# Rose Face Studio — Sistema de reservas y gestión

Sistema a medida para Rose Face Studio (centro de estética facial): reserva de
turnos online para clientas, con panel administrativo de agenda, horarios,
comisiones, caja, clientas recurrentes y fidelización VIP. Reemplaza
WhatsApp/papel para la operación diaria del salón.

**En producción:** https://roseface-studio-sistema.vercel.app

---

## Stack

- **Frontend:** React 19 · Vite 6 · TypeScript · Tailwind CSS 4 · React Router 7 · Framer Motion (`motion`) · Lucide Icons · Recharts
- **Backend:** Supabase (Postgres + Auth de storage) — persistencia real de turnos, clientas, profesionales y servicios
- **Pagos:** Mercado Pago (Checkout Pro) para seña online, circuito de transferencia directa para profesionales de alquiler fijo
- **Funciones server-side:** Vercel Serverless Functions (`api/`) — todo lo que toca datos sensibles (aprobar pagos, cambiar estado de turnos, validar el PIN de acceso) corre acá, nunca directo desde el navegador
- **Hosting/deploy:** Vercel

---

## Estructura del proyecto

```
api/                      Funciones serverless (Vercel) — Mercado Pago, aprobar/guardar
                           comprobante, actualizar estado de turno, verificar PIN de acceso.
docs/                      Documentación operativa — estado de datos, pendientes y seguridad.
scripts/                   Utilidades puntuales (seed de Supabase) — no corren en producción.
src/
  components/
    admin/                 Componentes propios del panel administrativo.
    layout/                Header, Footer, Sidebar, layouts públicos/admin.
    ui/                    Componentes reutilizables (Button, Card, Badge, etc.).
  context/
    AppContext.tsx         Estado global de la app — turnos, clientas, profesionales,
                           servicios. Las escrituras sensibles llaman a api/*.ts en vez
                           de escribir directo a Supabase.
  data/                    Catálogo base (servicios, profesionales) usado como seed/fallback.
  lib/                     Lógica de negocio sin UI — comisiones, disponibilidad, precios,
                           WhatsApp, mapeos de Supabase.
  pages/                   Páginas públicas (Home, Reserva, Profesionales, ...).
    admin/                 Páginas del panel administrativo (Agenda, Comisiones, Caja, ...).
  router.tsx                Rutas públicas (bajo PublicLayout) y /admin/* (bajo AdminLayout).
```

---

## Documentación

- [`docs/HANDOFF-SESION.md`](docs/HANDOFF-SESION.md) — **el documento principal.** Estado real
  del sistema, arquitectura, endpoints y permisos, reglas de negocio vigentes, gotchas técnicos
  y el historial de cada sesión de trabajo con fecha. Se actualiza en cada cambio — es la fuente
  de verdad, no un documento histórico fijo.
- [`docs/pruebas/README.md`](docs/pruebas/README.md) — cómo se prueba cada cambio antes de
  deployar (lógica de servidor contra una base falsa, pantalla con Chromium, verificación en
  producción sin escribir nada) y el catálogo de scripts guardados.
- [`docs/PENDIENTE_ONBOARDING.md`](docs/PENDIENTE_ONBOARDING.md) — estado real de los datos
  del negocio (precios, horarios, comisiones, fotos) y qué falta confirmar con Yosy antes
  de asumir algo.
- [`docs/SEGURIDAD_PENDIENTE.md`](docs/SEGURIDAD_PENDIENTE.md) — auditoría de seguridad,
  qué está resuelto y qué decisión de fondo (sesión real de usuario) sigue pendiente.

---

## Desarrollo local

**Requisitos:** Node.js 18+

```bash
npm install
cp .env.example .env.local   # completar con las credenciales reales (pedirlas a Tobias)
npm run dev                  # http://localhost:3000
```

Variables de entorno (ver [`.env.example`](.env.example) para el detalle de cada una):
Supabase (URL, anon key, service role key), Mercado Pago (access token, public key,
webhook secret) y la URL de la app.

### Comandos

```bash
npm run dev       # servidor de desarrollo
npm run build     # build de producción
npm run preview   # previsualizar el build
npm run lint      # chequeo de tipos (tsc --noEmit)
```

---

## Deploy

El proyecto de Vercel ya está linkeado (`tobiachs-projects/roseface-studio-sistema`) con
integración de Git: **un `git push` a `main` deploya solo a producción**, sin ningún paso manual.

```bash
npm run lint && npm run build   # verificar ANTES de pushear — build roto en main rompe el sitio real
git push origin main            # esto YA deploya a producción
```

Para confirmar que un deploy salió bien: `npx vercel ls --prod` (tiene que aparecer uno nuevo a
los pocos segundos) y comparar el bundle servido (`curl` a `/`, buscar el hash de
`assets/index-*.js`) contra el build local. Para volver atrás rápido sin tocar git:
`npx vercel rollback <url-del-deploy-anterior> --yes`.
