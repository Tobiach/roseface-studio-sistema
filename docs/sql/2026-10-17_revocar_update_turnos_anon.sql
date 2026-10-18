-- OPCIONAL — correr recién después de deployar la edición de reservas (17/10/2026).
--
-- Hasta ahora el navegador podía cambiar fecha, hora y notas de CUALQUIER turno con la
-- clave pública (grant del "Paso 2" de docs/SEGURIDAD_PENDIENTE.md). Desde la edición de
-- reservas, todo cambio (día, hora, servicio, cancelar, reactivar) pasa por
-- api/editar-turno.ts, que exige PIN, y ya no queda ningún UPDATE legítimo sobre `turnos`
-- desde el navegador (verificado por grep: el único que queda es la limpieza de holds
-- vencidos de AppContext.tsx, que ya fallaba en silencio porque toca `estado`).
-- Con esto, nadie sin PIN puede reprogramar ni anotar turnos ajenos.
REVOKE UPDATE ON turnos FROM anon;
