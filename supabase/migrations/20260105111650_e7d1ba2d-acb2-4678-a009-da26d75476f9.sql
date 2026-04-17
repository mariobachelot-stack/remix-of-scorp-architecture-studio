-- Add quantity column to equipment_library table
ALTER TABLE equipment_library ADD COLUMN IF NOT EXISTS quantity integer DEFAULT NULL;

-- Add quantity column to diagrams equipment JSON structure will be handled in code