-- Achtung: Down-Migration löscht NUR die Schicht-5-Tabellen.
-- Seed-Daten in Schicht 1+2+3 bleiben — wer komplett zurück will, muss alle
-- down-Migrations seriell ausführen.

DROP TABLE IF EXISTS reassignment_log CASCADE;
DROP TABLE IF EXISTS time_logs CASCADE;
