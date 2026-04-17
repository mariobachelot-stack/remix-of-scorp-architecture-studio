-- Fix: public diagrams should only be visible via public link, not in everyone's dashboard
DROP POLICY "Diagram select" ON public.diagrams;

CREATE POLICY "Diagram select" ON public.diagrams
FOR SELECT USING (
  -- Owner sees everything
  is_owner(auth.uid())
  -- Creator sees their own
  OR (created_by = auth.uid())
  -- Org members see their org's diagrams
  OR (organization_id IS NOT NULL AND organization_id IN (
    SELECT get_user_organizations(auth.uid()) AS get_user_organizations
  ))
  -- Anonymous/anyone can view via public token (for public sharing page)
  OR (is_public = true AND public_token IS NOT NULL AND auth.uid() IS NULL)
);