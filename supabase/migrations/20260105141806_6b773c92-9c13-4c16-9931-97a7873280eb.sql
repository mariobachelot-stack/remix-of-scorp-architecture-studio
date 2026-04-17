-- Create folders table for organizing diagrams
CREATE TABLE public.diagram_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.diagram_folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#6b7280',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.diagram_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- Create junction table for diagram-tag relationship (many-to-many)
CREATE TABLE public.diagrams_tags (
  diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.diagram_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (diagram_id, tag_id)
);

-- Add folder_id to diagrams table
ALTER TABLE public.diagrams 
ADD COLUMN folder_id UUID REFERENCES public.diagram_folders(id) ON DELETE SET NULL;

-- Enable RLS on all new tables
ALTER TABLE public.diagram_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagram_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagrams_tags ENABLE ROW LEVEL SECURITY;

-- Folder policies
CREATE POLICY "Users can view folders from same organization" 
ON public.diagram_folders 
FOR SELECT 
USING (
  created_by IS NULL 
  OR public.has_role(auth.uid(), 'admin') 
  OR public.get_user_organization(auth.uid()) = public.get_user_organization(created_by)
);

CREATE POLICY "Editors can create folders" 
ON public.diagram_folders 
FOR INSERT 
WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Editors can update folders" 
ON public.diagram_folders 
FOR UPDATE 
USING (public.can_edit(auth.uid()));

CREATE POLICY "Editors can delete folders" 
ON public.diagram_folders 
FOR DELETE 
USING (public.can_edit(auth.uid()));

-- Tag policies (tags are shared across organization)
CREATE POLICY "Anyone can view tags" 
ON public.diagram_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Editors can create tags" 
ON public.diagram_tags 
FOR INSERT 
WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Editors can update tags" 
ON public.diagram_tags 
FOR UPDATE 
USING (public.can_edit(auth.uid()));

CREATE POLICY "Editors can delete tags" 
ON public.diagram_tags 
FOR DELETE 
USING (public.can_edit(auth.uid()));

-- Diagrams_tags junction policies
CREATE POLICY "Anyone can view diagram tags" 
ON public.diagrams_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Editors can manage diagram tags" 
ON public.diagrams_tags 
FOR INSERT 
WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Editors can remove diagram tags" 
ON public.diagrams_tags 
FOR DELETE 
USING (public.can_edit(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_diagram_folders_updated_at
BEFORE UPDATE ON public.diagram_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();