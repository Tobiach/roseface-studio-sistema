---
name: verificar-deploy
description: Verifica con evidencia real que un cambio de Rose Face Studio quedó en producción (deploy listo, bundle con los textos nuevos, endpoints rechazando lo que corresponde). Usar después de cualquier push a main (que deploya solo), cuando Tobias pregunte "¿se deployó?" o antes de decir que algo está resuelto.
---

# Verificar un deploy de Rose Face (solo lectura)

**Contexto que hay que tener presente**
- Un `git push` a `main` DEPLOYA SOLO a producción (verificado el 22/10/2026 y confirmado el 24/10 en la configuración de Vercel: proyecto vinculado a GitHub con rama de producción `main`). El `npx vercel --yes --prod` manual sobra si el push ya deployó.
- Las variables de Vercel (claves de la base, Mercado Pago, mails) están cargadas SOLO en Producción: una vista previa no puede escribir en la base real.
- Las URLs de cada deploy (`...-tobiachs-projects.vercel.app`) están protegidas con login: no sirven para `curl`. Verificar siempre contra el alias de producción `https://roseface-studio-sistema.vercel.app`.

**Pasos**
1. `npx vercel ls --prod` → el deploy más nuevo debe decir `Ready` y tener la edad esperada (~20–60 s después del push). Si dice `Building`, esperar; si dice `Error`, mirar `npx vercel inspect <url> --logs` y avisar a Tobias.
2. `npm run verificar:deploy -- --vercel` → comprueba `index.html` (sin caché pegada), que el bundle `assets/index-*.js` TRAE los textos nuevos y NO trae los viejos, y que los endpoints sensibles rechacen pedidos sin permiso (401/405) sin guardar nada.
3. Para los cambios del día, sumar textos puntuales: `npm run verificar:deploy -- --tiene "texto nuevo" --no-tiene "texto viejo"`. Al cerrar el trabajo, dejarlos en `scripts/pruebas/deploy-esperado.json`.
4. Si el cambio toca datos o permisos, sumar una consulta de lectura con `npm run leer:base` (nunca con scripts propios que puedan escribir).

**Qué informar a Tobias (en español, corto)**
- Qué comprobé y cómo (deploy `Ready`, textos en el bundle, endpoints).
- Qué NO se pudo comprobar: un guardado real de punta a punta, un pago real de Mercado Pago, WhatsApp en un iPhone real, el celular de Yosy. Pedir esa prueba puntual.
- Nunca decir "resuelto" por haber pasado lint/build: eso no demuestra que la función nueva se use.
