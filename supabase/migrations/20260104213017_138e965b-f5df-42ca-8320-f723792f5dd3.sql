-- Drop the old constraint
ALTER TABLE public.equipment_library DROP CONSTRAINT equipment_library_type_check;

-- Add the new constraint with sensor type
ALTER TABLE public.equipment_library ADD CONSTRAINT equipment_library_type_check 
CHECK (type = ANY (ARRAY['terminal'::text, 'automate'::text, 'interface'::text, 'cloud'::text, 'sensor'::text]));