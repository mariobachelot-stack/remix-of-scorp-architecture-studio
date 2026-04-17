-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view diagrams from same organization" ON public.diagrams;

-- Create a more restrictive policy:
-- 1. Public diagrams with a valid public_token can be viewed by anyone
-- 2. Owners can view their own diagrams
-- 3. Admins can view all diagrams
-- 4. Editors in the same organization can view diagrams (for collaboration)
CREATE POLICY "Users can view own diagrams or public with token" 
ON public.diagrams 
FOR SELECT 
USING (
  -- Public diagrams require a public_token to be set (for embed/share functionality)
  (is_public = true AND public_token IS NOT NULL)
  -- Owner can always view their diagrams
  OR (created_by = auth.uid())
  -- Admins can view all
  OR has_role(auth.uid(), 'admin'::app_role)
  -- Editors in same organization can view for collaboration
  OR (can_edit(auth.uid()) AND get_user_organization(auth.uid()) = get_user_organization(created_by))
);

-- Also tighten UPDATE policy - only owner or admin
DROP POLICY IF EXISTS "Users can update diagrams from same organization" ON public.diagrams;

CREATE POLICY "Users can update own diagrams" 
ON public.diagrams 
FOR UPDATE 
USING (
  (created_by = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Tighten DELETE policy - only owner or admin
DROP POLICY IF EXISTS "Users can delete diagrams from same organization" ON public.diagrams;

CREATE POLICY "Users can delete own diagrams" 
ON public.diagrams 
FOR DELETE 
USING (
  (created_by = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);