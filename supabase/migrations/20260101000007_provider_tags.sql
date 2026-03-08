-- Add searchable tags to providers table
ALTER TABLE providers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
