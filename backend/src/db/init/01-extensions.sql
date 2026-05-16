-- Extensions für Timetable
-- Wird beim ersten Container-Start via /docker-entrypoint-initdb.d ausgeführt
-- Owner-Privileg erforderlich (SUPERUSER beim initialen Container-User gegeben)

CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- Trigram-Index für Fuzzy-Search (Property/User-Suche)
CREATE EXTENSION IF NOT EXISTS cube;          -- Pflicht für earthdistance
CREATE EXTENSION IF NOT EXISTS earthdistance; -- earth_distance() / ll_to_earth() für Tourenoptimierung (Wave 5)
