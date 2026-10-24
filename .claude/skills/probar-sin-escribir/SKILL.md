---
name: probar-sin-escribir
description: Método para probar cambios de Rose Face Studio SIN escribir en la base real (hay clientas reales usando el sistema). Cubre pruebas de lógica con base falsa, pruebas de pantalla con Chromium y escrituras interceptadas, y lecturas seguras de la base. Usar antes de tocar plata, permisos, turnos o clientas, y para agregar pruebas nuevas.
---

# Probar sin escribir en producción

**Regla:** nunca insertar, actualizar ni borrar filas de prueba en la base real (el clasificador de permisos lo bloquea, con razón, y otra sesión importa agendas en `turnos`/`clientas`). Se verifica igual, con evidencia.

**Comandos (desde la raíz del repo)**
- `npm run test:logica` — compila `api/editar-turno.ts` contra una base FALSA en memoria (`docs/pruebas/servidor/fake-supabase.mjs`) y corre toda la lógica pura de `src/lib` (horarios, WhatsApp, comisiones, reservas por Mercado Pago). Sale con código 1 si alguna línea dice `FALLA`.
- `npm run setup:pruebas` — una sola vez por máquina: deja `playwright-core` en `~/.roseface-pruebas` (fuera del repo) y comprueba que haya Chromium (`-- --instalar-chromium` lo baja).
- `npm run pruebas:pantalla -- --lista` / `-- <nombre>` — levanta la app en un puerto libre con datos REALES de lectura, corre la prueba de `docs/pruebas/pantalla/` con Chromium y apaga todo. Las escrituras del navegador se interceptan con `page.route` y se abortan o se contestan con filas falsas; el PIN se simula, nunca se usa uno real.
- `npm run leer:base -- <tabla> "<consulta PostgREST>" [--contar]` — lector de SOLO lectura (solo GET) que enmascara teléfonos, mails, claves y ids de pago. Usarlo en vez de scripts con `fetch` propios.

**Para agregar una prueba nueva**
1. Lógica de servidor: copiar el patrón de `docs/pruebas/servidor/editar-turno-*.mjs` (token firmado con la clave de prueba, `db` falsa, casos con `ok(cond, mensaje)` que imprime `OK   ` o `FALLA`). Lógica del navegador: copiar el de `docs/pruebas/logica/`.
2. Pantalla: copiar el de `docs/pruebas/pantalla/` (usa `process.env.BASE_URL` y `process.env.CHROMIUM_EXE`), cerrar el `context` anterior (una sola pestaña viva), comparar textos con `/i` y `\s` (CSS en mayúsculas, espacios no separables en la moneda).
3. Que cada caso imprima una línea que empiece con `OK   ` o `FALLA`: el corredor y el CI deciden con eso (varias pruebas terminan con `process.exit(0)` aunque fallen).
4. Poner la prueba en `docs/pruebas/{servidor,logica,pantalla}/` y una fila en `docs/pruebas/README.md`.

**Después de un deploy:** solo pedidos que no guardan nada (401/403/400/404, cuerpos inválidos). Ver la skill `verificar-deploy`.

**Siempre decir qué NO se probó** (un guardado exitoso real, un pago real, un iPhone real) y pedirle a Tobias esa prueba concreta. Hasta que exista el entorno de pruebas con su propia base (Sprint 3 del plan de mejora), esa brecha existe.

**Trampas conocidas**
- Heredocs largos con comillas rompen el bash del agente ("unexpected EOF"): escribir el script con la herramienta de escritura y correrlo con `node`.
- `tsc` puede quedarse sin memoria: `export NODE_OPTIONS=--max-old-space-size=3072` antes de `npm run lint` / `npm run build`.
- El proyecto no usa `strictNullChecks`: las uniones discriminadas por `ok: boolean` no estrechan; usar un objeto con campos opcionales.
