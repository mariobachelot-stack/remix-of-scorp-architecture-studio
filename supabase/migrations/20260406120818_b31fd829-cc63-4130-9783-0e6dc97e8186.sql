DROP POLICY IF EXISTS "Remove org members" ON public.organization_members;

CREATE POLICY "Remove org members"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  -- User can remove themselves
  (user_id = auth.uid())
  OR
  -- Owners can remove anyone
  is_owner(auth.uid())
  OR
  -- Org admins can remove members from their org
  has_role_in_org(auth.uid(), organization_id, 'org_admin'::app_role_v2)
);