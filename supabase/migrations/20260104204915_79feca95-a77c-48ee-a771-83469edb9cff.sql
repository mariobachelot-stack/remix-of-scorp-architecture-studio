-- Add style customization columns to equipment_library
ALTER TABLE public.equipment_library
ADD COLUMN IF NOT EXISTS border_color TEXT,
ADD COLUMN IF NOT EXISTS header_background_color TEXT;