-- Add church_leader column to providers
-- Stores the church leader name with optional title (e.g. "Pastor Tony Redmon")
-- Single text field, optional, displayed on church listings only

ALTER TABLE providers ADD COLUMN IF NOT EXISTS church_leader TEXT DEFAULT NULL;
