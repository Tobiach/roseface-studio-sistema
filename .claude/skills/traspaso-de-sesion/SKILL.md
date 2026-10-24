---
name: traspaso-de-sesion
description: Deja guardado el estado de Rose Face Studio para que otra sesión (o la misma después de un compact) retome sin perder nada, y arma el prompt de retoma para Tobias. Usar cuando Tobias avise que se queda sin contexto, antes de un /compact, al cerrar un bloque grande de trabajo o al pasar el trabajo a otro chat.
---

# Traspaso de sesión (Rose Face)

**Guardar, en este orden**
1. `docs/HANDOFF-SESION.md` (repo): actualizar §2 estado de producción (último commit pusheado y verificado), las reglas de negocio que cambiaron (§4), los pendientes inmediatos (§7: marcar ✅ lo resuelto, dejar los pedidos literales de Tobias de lo que sigue abierto) y los hallazgos nuevos con datos reales. Citar commits, no pegar código.
2. Pruebas nuevas en `docs/pruebas/` y su fila en el README; cambios de SQL en `docs/sql/` indicando si está APLICADO o no.
3. Memoria personal de Claude (`~/.claude/projects/.../memory/`): `project_roseface_handoff.md` (estado + pendientes), la cronología `project_roseface_cambios_octubre.md` si hubo cambios de negocio, y un `feedback_*` solo si Tobias dio una regla nueva. Actualizar la línea del índice `MEMORY.md`. No guardar lo que ya está en el repo ni en el git log.
4. Commit solo de los archivos propios (`git add <archivos>`; otra sesión puede estar escribiendo en el mismo árbol) y, si hay código, **pedir OK antes de pushear: un push a `main` deploya solo**.

**Nunca guardar:** PINs, claves, tokens, teléfonos o nombres de clientas reales. Describir "el PIN de Yosy" sin su valor.

**Responder a Tobias con**
- Qué quedó guardado y dónde (rutas), qué está sin empezar y qué decisiones o archivos suyos faltan (por ejemplo imágenes que no llegaron).
- Un prompt de retoma en un solo bloque pegable, con: qué leer y en qué orden (CLAUDE.md global y del repo, `docs/HANDOFF-SESION.md`, `docs/pruebas/README.md`, `MEMORY.md` → `project_roseface_handoff.md`), `git pull` + `git status`, las reglas fijas (español; no inventar datos; evidencia real y decir qué NO se verificó; lint y build en 0; `Co-Authored-By`; nunca `push --force`; avisar antes de pushear porque deploya; no escribir en la base real; otra sesión toca `turnos`/`clientas`), y los pendientes inmediatos con sus textos literales.
- Si hay más de un chat en paralelo: quién usa la carpeta principal y quién un worktree (ver `docs/SESIONES.md`).
