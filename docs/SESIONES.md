# Trabajo en paralelo entre sesiones de Claude (Rose Face)

> Creado el 24/10/2026 (Sprint 1 del plan de mejora del sistema de trabajo). Corto a propósito: se lee en 2 minutos al arrancar.

## Por qué existe
Tobias trabaja con más de un chat de Claude a la vez sobre este repo (uno desarrolla funciones, otro mejora la infraestructura y,
a veces, otra sesión importa agendas a la base). Sin reglas se pisan: el mismo árbol de trabajo, el mismo `git status`, el mismo
`main` — y **un `git push` a `main` deploya solo a producción**.

## Reglas
1. **Una carpeta por sesión que escribe código.** La carpeta principal (`roseface-studio-sistema`, rama `main`) es de la sesión de
   funciones. Cualquier otra sesión trabaja en un *worktree* propio:
   `git worktree add ../roseface-studio-sistema-<tema> -b <rama>/<tema>` (y `npm ci` ahí). Sacarlo al terminar:
   `git worktree remove ../roseface-studio-sistema-<tema>` (sin `--force`).
2. **Ramas:** `main` = lo que se publica (confirmado el 24/10 en la API de Vercel: proyecto vinculado a GitHub `Tobiach/roseface-studio-sistema`, rama de producción `main`, sin build ignorado). `infra/*` = infraestructura (CI, agentes, skills, scripts de prueba). `feature/*` = funciones
   que Tobias quiere revisar antes de publicar. Una rama `infra/*` o `feature/*` NO deploya a producción (Vercel la trata como
   vista previa, que además no recibe ninguna clave: las variables están solo en Producción).
3. **Nadie pushea a `main` sin el OK de Tobias** (o sin que su mensaje diga "deploya"), y nunca dos sesiones a la vez. Antes de
   pushear: `git pull --rebase`, `npm run lint`, `npm run build`, `npm run test:logica`. Después: skill `verificar-deploy`.
4. **`git add <archivos>`, nunca `git add -A`.** Otra sesión puede tener cambios sin commitear en el mismo árbol.
5. **No escribir en la base real para probar** (ver skill `probar-sin-escribir`). `turnos` y `clientas` pueden estar siendo
   escritas por la sesión de importación: leer sí (`npm run leer:base`), tocar no.
6. **Qué se toca en cada área** (para no chocar al mergear):

| Área | Dueña por defecto | Archivos típicos |
|---|---|---|
| Funciones del producto | sesión de funciones (`main`) | `src/**`, `api/**`, `docs/sql/**` |
| Infraestructura de trabajo | sesión de infra (`infra/*`) | `.github/**`, `.claude/**`, `scripts/pruebas/**`, `docs/SESIONES.md`, scripts de `package.json` |
| Pruebas | quien cambie la función prueba su cambio | `docs/pruebas/**` (agregar casos; el README lo comparten) |
| Traspaso y memoria | quien cierra un bloque de trabajo | `docs/HANDOFF-SESION.md`, memoria personal de Claude |

7. **Al empezar:** `git pull`, `git status`, `git worktree list`; leer `docs/HANDOFF-SESION.md` y este archivo.
   **Al terminar un bloque:** skill `traspaso-de-sesion` (HANDOFF + memoria + commit de los archivos propios).
8. Si dos sesiones necesitan el mismo archivo (`CLAUDE.md`, `docs/HANDOFF-SESION.md`): editar poco, commitear rápido y pedirle a
   Tobias que decida el orden del merge. No resolver conflictos "a ojo" en archivos de plata o permisos.

## Qué quedó armado en el Sprint 1 (en la rama `infra/sistema-de-trabajo`)
- Skills del proyecto (`.claude/skills/`): `verificar-deploy`, `probar-sin-escribir`, `traspaso-de-sesion`.
- Agentes (`.claude/agents/`): `auditor-db` (solo lectura de la base), `verificador-deploy`, `revisor-reglas`.
- CI (`.github/workflows/ci.yml`): lint + build + pruebas de lógica en cada push, sin secretos y sin deployar.
- Scripts (`npm run ...`): `test:logica`, `setup:pruebas`, `pruebas:pantalla`, `verificar:deploy`, `leer:base`
  (detalle en `docs/pruebas/README.md`).

## Propuesta de permisos de solo lectura (NO está activa; la activa Tobias si quiere)
Para que Claude no pida confirmación en cada consulta inofensiva. Iría en `.claude/settings.json` del repo (o en el
`settings.local.json` de la máquina). **No incluye** nada que escriba o deploye.

```json
{
  "permissions": {
    "allow": [
      "Bash(git status:*)", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git branch:*)", "Bash(git worktree list:*)",
      "Bash(git fetch:*)", "Bash(git pull --ff-only:*)",
      "Bash(npm run lint)", "Bash(npm run build)", "Bash(npm run test:logica)",
      "Bash(npm run verificar:deploy:*)", "Bash(npm run leer:base:*)",
      "Bash(npx vercel ls:*)", "Bash(npx vercel inspect:*)", "Bash(npx vercel env ls:*)"
    ]
  }
}
```
Quedan SIEMPRE con confirmación: `git push`, `git add/commit`, `npx vercel --yes --prod` y `vercel env add/rm`, cualquier SQL contra
la base real, `npm run pruebas:pantalla` (levanta servidores y abre Chromium) y borrar archivos.
