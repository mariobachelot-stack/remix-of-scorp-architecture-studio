-- Table pour stocker les équipements de la bibliothèque
CREATE TABLE public.equipment_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('terminal', 'automate', 'interface', 'cloud')),
  category TEXT NOT NULL CHECK (category IN ('hvac', 'lighting', 'metering', 'interface', 'scorp-io')),
  protocol TEXT NOT NULL CHECK (protocol IN ('modbus-tcp', 'modbus-rtu', 'bacnet-ip', 'bacnet-mstp', 'lon', 'cloud-api', 'ethernet')),
  icon TEXT NOT NULL DEFAULT 'Box',
  description TEXT,
  reference TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les styles d'équipements
CREATE TABLE public.equipment_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  equipment_type TEXT CHECK (equipment_type IS NULL OR equipment_type IN ('terminal', 'automate', 'interface', 'cloud')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  icon_color TEXT NOT NULL DEFAULT '#ffffff',
  background_color TEXT NOT NULL DEFAULT '#3b82f6',
  border_color TEXT NOT NULL DEFAULT '#1d4ed8',
  border_width INTEGER NOT NULL DEFAULT 2,
  border_radius INTEGER NOT NULL DEFAULT 8,
  opacity NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (opacity >= 0 AND opacity <= 1),
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_styles ENABLE ROW LEVEL SECURITY;

-- Policies pour equipment_library
CREATE POLICY "Anyone can view equipment library"
ON public.equipment_library
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create equipment"
ON public.equipment_library
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment"
ON public.equipment_library
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete equipment"
ON public.equipment_library
FOR DELETE
USING (true);

-- Policies pour equipment_styles
CREATE POLICY "Anyone can view equipment styles"
ON public.equipment_styles
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create styles"
ON public.equipment_styles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update styles"
ON public.equipment_styles
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete styles"
ON public.equipment_styles
FOR DELETE
USING (true);

-- Triggers pour updated_at
CREATE TRIGGER update_equipment_library_updated_at
BEFORE UPDATE ON public.equipment_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_styles_updated_at
BEFORE UPDATE ON public.equipment_styles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();