-- Drop and recreate the INSERT policy on organization_members
-- to allow self-insertion (for onboarding flow)
DROP POLICY IF EXISTS "Add org members" ON public.organization_members;

CREATE POLICY "Add org members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can add themselves
  (user_id = auth.uid())
  OR
  -- Owners can add anyone
  is_owner(auth.uid())
  OR
  -- Org admins can add members to their org
  has_role_in_org(auth.uid(), organization_id, 'org_admin'::app_role_v2)
);