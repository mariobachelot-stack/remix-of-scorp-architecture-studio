
DROP POLICY "Users can view own diagrams or public with token" ON public.diagrams;

CREATE POLICY "Users can view own diagrams or public with token"
ON public.diagrams
FOR SELECT
TO public
USING (
  -- Public diagrams with token (unchanged)
  ((is_public = true) AND (public_token IS NOT NULL))
  OR
  -- Admins see everything
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Non-admins: only diagrams with a non-null organization_id
  (
    organization_id IS NOT NULL
    AND (
      created_by = auth.uid()
      OR (can_edit(auth.uid()) AND (get_user_organization(auth.uid()) = get_user_organization(created_by)))
    )
  )
);
