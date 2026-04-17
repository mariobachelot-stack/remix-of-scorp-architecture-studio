DROP POLICY "Diagram select" ON public.diagrams;

CREATE POLICY "Diagram select" ON public.diagrams
FOR SELECT USING (
  -- Anonymous access for public diagrams (sharing links)
  (auth.uid() IS NULL AND is_public = true AND public_token IS NOT NULL)
  -- Owner sees everything
  OR is_owner(auth.uid())
  -- Creator sees their own
  OR (created_by = auth.uid())
  -- Org members see their org's diagrams
  OR (organization_id IS NOT NULL AND organization_id IN (
    SELECT get_user_organizations(auth.uid()) AS get_user_organizations
  ))
);