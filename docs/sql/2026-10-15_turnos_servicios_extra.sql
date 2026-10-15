-- Servicios extra por turno (15/10/2026).
-- Guarda el desglose de lo que se hizo de más al confirmar que la clienta vino
-- (ver ServicioExtra en src/types/index.ts). El total sigue viviendo en
-- turnos.monto_total (ya incluye los extras), así que Comisiones y Caja no
-- necesitan cambios. Es una columna nueva con default: no toca ningún dato
-- existente ni las políticas de RLS.
ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS servicios_extra jsonb NOT NULL DEFAULT '[]'::jsonb;
