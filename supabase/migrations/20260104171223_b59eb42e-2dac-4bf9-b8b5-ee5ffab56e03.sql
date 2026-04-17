-- Table pour stocker les diagrammes
CREATE TABLE public.diagrams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;

-- Policies (accès public pour l'instant, sans authentification)
CREATE POLICY "Anyone can view diagrams"
ON public.diagrams
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create diagrams"
ON public.diagrams
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update diagrams"
ON public.diagrams
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete diagrams"
ON public.diagrams
FOR DELETE
USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_diagrams_updated_at
BEFORE UPDATE ON public.diagrams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();