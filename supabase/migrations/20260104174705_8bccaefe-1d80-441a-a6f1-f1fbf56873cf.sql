-- Table des constructeurs par type d'équipement
CREATE TABLE public.manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, equipment_type)
);

-- Enable RLS
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view manufacturers" ON public.manufacturers FOR SELECT USING (true);
CREATE POLICY "Anyone can create manufacturers" ON public.manufacturers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update manufacturers" ON public.manufacturers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete manufacturers" ON public.manufacturers FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_manufacturers_updated_at
  BEFORE UPDATE ON public.manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table des références par constructeur et type d'équipement
CREATE TABLE public.equipment_product_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL,
  manufacturer_id UUID NOT NULL REFERENCES public.manufacturers(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reference, manufacturer_id, equipment_type)
);

-- Enable RLS
ALTER TABLE public.equipment_product_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view product references" ON public.equipment_product_references FOR SELECT USING (true);
CREATE POLICY "Anyone can create product references" ON public.equipment_product_references FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update product references" ON public.equipment_product_references FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete product references" ON public.equipment_product_references FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_equipment_product_references_updated_at
  BEFORE UPDATE ON public.equipment_product_references
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter le champ manufacturer_id à equipment_library
ALTER TABLE public.equipment_library ADD COLUMN manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL;

-- Insert initial manufacturers data

-- Automates
INSERT INTO public.manufacturers (name, equipment_type) VALUES
  ('Siemens', 'automate'),
  ('Schneider Electric', 'automate'),
  ('ISMA', 'automate'),
  ('Trend', 'automate');

-- Terminaux HVAC
INSERT INTO public.manufacturers (name, equipment_type) VALUES
  ('Mitsubishi Electric', 'terminal'),
  ('CIAT', 'terminal'),
  ('Daikin', 'terminal'),
  ('Siemens', 'terminal'),
  ('De Dietrich', 'terminal'),
  ('Atlantic', 'terminal');

-- Capteurs (using 'terminal' type as there's no 'sensor' type yet)
INSERT INTO public.manufacturers (name, equipment_type) VALUES
  ('Milesight', 'terminal'),
  ('Nexelec', 'terminal');

-- Interfaces / Passerelles
INSERT INTO public.manufacturers (name, equipment_type) VALUES
  ('Siemens', 'interface'),
  ('Schneider Electric', 'interface'),
  ('De Dietrich', 'interface'),
  ('CoolAutomation', 'interface');