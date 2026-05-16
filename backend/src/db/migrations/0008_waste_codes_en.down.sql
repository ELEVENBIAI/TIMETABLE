-- Rollback Migration 0008 — englische Codes zurück auf deutsche.

ALTER TABLE waste_bin_types DROP CONSTRAINT IF EXISTS ck_waste_bin_types_code;

UPDATE waste_bin_types
SET code = CASE code
  WHEN 'RESIDUAL'    THEN 'RESTMUELL'
  WHEN 'PAPER'       THEN 'PAPIER'
  WHEN 'YELLOW_SACK' THEN 'GELBER_SACK'
  WHEN 'YELLOW_BIN'  THEN 'GELBE_TONNE'
  WHEN 'BIO'         THEN 'BIOMUELL'
  WHEN 'GLASS'       THEN 'GLAS'
  WHEN 'BULKY'       THEN 'SPERRMUELL'
  WHEN 'OTHER'       THEN 'ANDERE'
  ELSE code
END;

ALTER TABLE waste_bin_types
  ADD CONSTRAINT ck_waste_bin_types_code CHECK (code IN (
    'RESTMUELL','PAPIER','GELBER_SACK','GELBE_TONNE','BIOMUELL','GLAS','SPERRMUELL','ANDERE'
  ));
