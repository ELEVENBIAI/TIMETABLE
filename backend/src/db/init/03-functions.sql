-- Trigger-Funktion: setzt UPDATED_AT bei jedem UPDATE automatisch auf NOW()
-- Wird auf alle Tabellen mit UPDATED_AT-Spalte angewendet

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
