-- Drop existing overly permissive policies on manufacturers
DROP POLICY IF EXISTS "Anyone can create manufacturers" ON public.manufacturers;
DROP POLICY IF EXISTS "Anyone can update manufacturers" ON public.manufacturers;
DROP POLICY IF EXISTS "Anyone can delete manufacturers" ON public.manufacturers;

-- Create restrictive policies: only editors/admins can modify
CREATE POLICY "Editors can create manufacturers" 
ON public.manufacturers 
FOR INSERT 
WITH CHECK (can_edit(auth.uid()) OR can_manage_library(auth.uid()));

CREATE POLICY "Editors can update manufacturers" 
ON public.manufacturers 
FOR UPDATE 
USING (can_edit(auth.uid()) OR can_manage_library(auth.uid()));

CREATE POLICY "Editors can delete manufacturers" 
ON public.manufacturers 
FOR DELETE 
USING (can_edit(auth.uid()) OR can_manage_library(auth.uid()));