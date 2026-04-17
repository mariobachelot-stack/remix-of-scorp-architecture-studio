
DROP POLICY IF EXISTS "Diagram delete" ON public.diagrams;

CREATE POLICY "Diagram delete" ON public.diagrams
FOR DELETE
USING (
  is_owner(auth.uid()) 
  OR (created_by = auth.uid()) 
  OR (
    can_edit(auth.uid()) 
    AND organization_id IS NOT NULL 
    AND organization_id IN (SELECT get_user_organizations(auth.uid()))
  )
);
