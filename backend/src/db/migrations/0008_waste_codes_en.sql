-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0008 — waste_bin_types.code auf englische Identifier (ELE-178)
-- ────────────────────────────────────────────────────────────────────────────
-- Codes sind technische Identifier, keine UI-Strings. Die UI übersetzt sie
-- per i18n (ADR-16). Damit die Codebase sprachneutral bleibt, ersetzen wir
-- die deutschen Codes aus Migration 0003 durch englische Äquivalente.
--
-- Mapping:
--   RESTMUELL    → RESIDUAL
--   PAPIER       → PAPER
--   GELBER_SACK  → YELLOW_SACK
--   GELBE_TONNE  → YELLOW_BIN
--   BIOMUELL     → BIO
--   GLAS         → GLASS
--   SPERRMUELL   → BULKY
--   ANDERE       → OTHER
-- ────────────────────────────────────────────────────────────────────────────

-- 1) Constraint droppen, damit das UPDATE durchgeht
ALTER TABLE waste_bin_types DROP CONSTRAINT IF EXISTS ck_waste_bin_types_code;

-- 2) Bestehende Daten umstellen (idempotent — falls Code schon englisch ist,
--    macht das CASE nichts).
UPDATE waste_bin_types
SET code = CASE code
  WHEN 'RESTMUELL'   THEN 'RESIDUAL'
  WHEN 'PAPIER'      THEN 'PAPER'
  WHEN 'GELBER_SACK' THEN 'YELLOW_SACK'
  WHEN 'GELBE_TONNE' THEN 'YELLOW_BIN'
  WHEN 'BIOMUELL'    THEN 'BIO'
  WHEN 'GLAS'        THEN 'GLASS'
  WHEN 'SPERRMUELL'  THEN 'BULKY'
  WHEN 'ANDERE'      THEN 'OTHER'
  ELSE code
END
WHERE code IN ('RESTMUELL','PAPIER','GELBER_SACK','GELBE_TONNE','BIOMUELL','GLAS','SPERRMUELL','ANDERE');

-- 3) Neue CHECK mit englischen Werten anlegen
ALTER TABLE waste_bin_types
  ADD CONSTRAINT ck_waste_bin_types_code CHECK (code IN (
    'RESIDUAL','PAPER','YELLOW_SACK','YELLOW_BIN','BIO','GLASS','BULKY','OTHER'
  ));
