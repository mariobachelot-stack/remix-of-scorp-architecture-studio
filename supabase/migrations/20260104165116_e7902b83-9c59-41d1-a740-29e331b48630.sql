-- Table pour stocker les références d'équipements (réutilisables)
CREATE TABLE public.equipment_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_references ENABLE ROW LEVEL SECURITY;

-- Policy: tout le monde peut lire les références (données partagées)
CREATE POLICY "Anyone can view equipment references"
ON public.equipment_references
FOR SELECT
USING (true);

-- Policy: les utilisateurs authentifiés peuvent créer des références
CREATE POLICY "Authenticated users can create references"
ON public.equipment_references
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: les utilisateurs authentifiés peuvent mettre à jour
CREATE POLICY "Authenticated users can update references"
ON public.equipment_references
FOR UPDATE
TO authenticated
USING (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_equipment_references_updated_at
BEFORE UPDATE ON public.equipment_references
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();