-- Recordatorio de 72h (15/10/2026).
-- Las clientas recurrentes / turnos manuales con seña pendiente reciben 3
-- mensajes: 72h antes (pedir la seña), 48h antes (seña, "si todavía no
-- abonaste") y 24h antes (confirmar la cita). La tabla solo aceptaba
-- '48h', '24h' y '4h', así que se amplía el CHECK para sumar '72h'.
-- No toca ningún dato existente.
ALTER TABLE recordatorios_config DROP CONSTRAINT IF EXISTS recordatorios_config_plantilla_check;
ALTER TABLE recordatorios_config
  ADD CONSTRAINT recordatorios_config_plantilla_check CHECK (plantilla IN ('72h', '48h', '24h', '4h'));
