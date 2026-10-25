-- Hora real de completado (25/10/2026).
-- Pedido de Tobias: una profesional puede corregir el servicio de un turno
-- YA completado solo si es de hoy y pasaron menos de 4hs desde que lo
-- confirmó (fuera de esa ventana, solo Yosy). Para medir esas 4hs con
-- precisión hace falta la hora real en que se completó, no la hora
-- reservada (ver api/editar-turno.ts, acción "completar"). Columna nueva
-- con default null: no toca ningún dato existente ni las políticas de RLS.
ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS completado_en timestamptz NULL;
