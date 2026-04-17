
-- Add organization_id to equipment_library
ALTER TABLE public.equipment_library
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT NULL;

-- Create index
CREATE INDEX idx_equipment_library_org ON public.equipment_library(organization_id);

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can view equipment library" ON public.equipment_library;
DROP POLICY IF EXISTS "Authenticated users can create equipment" ON public.equipment_library;
DROP POLICY IF EXISTS "Authenticated users can update equipment" ON public.equipment_library;
DROP POLICY IF EXISTS "Authenticated users can delete equipment" ON public.equipment_library;

-- SELECT: global (org_id IS NULL) visible to all, org-scoped visible to org members
CREATE POLICY "View equipment library"
ON public.equipment_library
FOR SELECT
TO public
USING (
  organization_id IS NULL
  OR organization_id IN (SELECT get_user_organizations(auth.uid()))
);

-- INSERT: owners can create global, org_admins can create for their org
CREATE POLICY "Create equipment"
ON public.equipment_library
FOR INSERT
TO authenticated
WITH CHECK (
  (organization_id IS NULL AND is_owner(auth.uid()))
  OR
  (organization_id IS NOT NULL AND has_role_in_org(auth.uid(), organization_id, 'org_admin'::app_role_v2))
);

-- UPDATE: owners can update global, org_admins can update their org's
CREATE POLICY "Update equipment"
ON public.equipment_library
FOR UPDATE
TO authenticated
USING (
  (organization_id IS NULL AND is_owner(auth.uid()))
  OR
  (organization_id IS NOT NULL AND has_role_in_org(auth.uid(), organization_id, 'org_admin'::app_role_v2))
);

-- DELETE: owners can delete global, org_admins can delete their org's
CREATE POLICY "Delete equipment"
ON public.equipment_library
FOR DELETE
TO authenticated
USING (
  (organization_id IS NULL AND is_owner(auth.uid()))
  OR
  (organization_id IS NOT NULL AND has_role_in_org(auth.uid(), organization_id, 'org_admin'::app_role_v2))
);
