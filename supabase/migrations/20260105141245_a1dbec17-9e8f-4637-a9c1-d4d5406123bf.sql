-- Create diagram_templates table
CREATE TABLE public.diagram_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  zones JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB,
  thumbnail TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagram_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view templates
CREATE POLICY "Templates are viewable by everyone" 
ON public.diagram_templates 
FOR SELECT 
USING (true);

-- Only editors and admins can create templates
CREATE POLICY "Editors can create templates" 
ON public.diagram_templates 
FOR INSERT 
WITH CHECK (public.can_edit(auth.uid()));

-- Only template creator or admin can update
CREATE POLICY "Template creator or admin can update" 
ON public.diagram_templates 
FOR UPDATE 
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Only template creator or admin can delete
CREATE POLICY "Template creator or admin can delete" 
ON public.diagram_templates 
FOR DELETE 
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_diagram_templates_updated_at
BEFORE UPDATE ON public.diagram_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();