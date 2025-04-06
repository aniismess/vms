-- Start transaction
BEGIN;

-- First, drop existing constraints one by one
ALTER TABLE volunteers_volunteers DROP CONSTRAINT IF EXISTS sevadal_training_certificate_check;
ALTER TABLE volunteers_volunteers DROP CONSTRAINT IF EXISTS past_prashanti_service_check;
ALTER TABLE volunteers_volunteers DROP CONSTRAINT IF EXISTS is_cancelled_check;

-- Update existing boolean values to yes/no strings
UPDATE volunteers_volunteers
SET sevadal_training_certificate = 
  CASE 
    WHEN sevadal_training_certificate::text = 'true' THEN 'yes'
    WHEN sevadal_training_certificate::text = 'false' THEN 'no'
    ELSE COALESCE(sevadal_training_certificate, 'no')
  END,
past_prashanti_service = 
  CASE 
    WHEN past_prashanti_service::text = 'true' THEN 'yes'
    WHEN past_prashanti_service::text = 'false' THEN 'no'
    ELSE COALESCE(past_prashanti_service, 'no')
  END,
is_cancelled = 
  CASE 
    WHEN is_cancelled::text = 'true' THEN 'yes'
    WHEN is_cancelled::text = 'false' THEN 'no'
    ELSE COALESCE(is_cancelled, 'no')
  END;

-- Add constraints back with proper check conditions
ALTER TABLE volunteers_volunteers ADD CONSTRAINT sevadal_training_certificate_check CHECK (sevadal_training_certificate IN ('yes', 'no'));
ALTER TABLE volunteers_volunteers ADD CONSTRAINT past_prashanti_service_check CHECK (past_prashanti_service IN ('yes', 'no'));
ALTER TABLE volunteers_volunteers ADD CONSTRAINT is_cancelled_check CHECK (is_cancelled IN ('yes', 'no'));

-- Set default values
ALTER TABLE volunteers_volunteers ALTER COLUMN sevadal_training_certificate SET DEFAULT 'no';
ALTER TABLE volunteers_volunteers ALTER COLUMN past_prashanti_service SET DEFAULT 'no';
ALTER TABLE volunteers_volunteers ALTER COLUMN is_cancelled SET DEFAULT 'no';

COMMIT;

