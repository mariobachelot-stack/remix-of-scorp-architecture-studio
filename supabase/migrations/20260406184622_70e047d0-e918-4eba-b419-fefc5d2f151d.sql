
-- Add organization_id to diagram_folders
ALTER TABLE public.diagram_folders 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id and is_default to diagram_tags
ALTER TABLE public.diagram_tags 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN is_default boolean NOT NULL DEFAULT false;

-- Backfill existing folders: assign to creator's org
UPDATE public.diagram_folders df
SET organization_id = (
  SELECT om.organization_id 
  FROM public.organization_members om 
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = df.created_by AND o.is_default = false
  ORDER BY om.created_at ASC LIMIT 1
)
WHERE df.created_by IS NOT NULL;

-- Create default "Template" label for each non-default org
INSERT INTO public.diagram_tags (name, color, organization_id, is_default)
SELECT 'Template', '#8b5cf6', o.id, true
FROM public.organizations o
WHERE o.is_default = false
ON CONFLICT DO NOTHING;

-- Trigger: when folder is deleted, move schemas to root
CREATE OR REPLACE FUNCTION public.move_schemas_on_folder_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.diagrams SET folder_id = NULL WHERE folder_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_move_schemas_on_folder_delete
BEFORE DELETE ON public.diagram_folders
FOR EACH ROW
EXECUTE FUNCTION public.move_schemas_on_folder_delete();

-- ========== RLS POLICIES FOR diagram_folders ==========

DROP POLICY IF EXISTS "View folders" ON public.diagram_folders;
DROP POLICY IF EXISTS "Create folders" ON public.diagram_folders;
DROP POLICY IF EXISTS "Update folders" ON public.diagram_folders;
DROP POLICY IF EXISTS "Delete folders" ON public.diagram_folders;

-- View: org members see their org's folders, owner sees all
CREATE POLICY "View folders" ON public.diagram_folders
FOR SELECT USING (
  is_owner(auth.uid())
  OR (organization_id IN (SELECT get_user_organizations(auth.uid())))
);

-- Create: any authenticated member, must belong to org
CREATE POLICY "Create folders" ON public.diagram_folders
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id IN (SELECT get_user_organizations(auth.uid()))
);

-- Update: creator or org_admin/owner
CREATE POLICY "Update folders" ON public.diagram_folders
FOR UPDATE USING (
  is_owner(auth.uid())
  OR (created_by = auth.uid())
  OR (organization_id IS NOT NULL AND has_role_in_org(auth.uid(), organization_id, 'org_admin'))
);

-- Delete: creator or org_admin/owner
CREATE POLICY "Delete folders" ON public.diagram_folders
FOR DELETE USING (
  is_owner(auth.uid())
  OR (created_by = auth.uid())
  OR (organization_id IS NOT NULL AND has_role_in_org(auth.uid(), organization_id, 'org_admin'))
);

-- ========== RLS POLICIES FOR diagram_tags ==========

DROP POLICY IF EXISTS "Anyone can view tags" ON public.diagram_tags;
DROP POLICY IF EXISTS "Editors can create tags" ON public.diagram_tags;
DROP POLICY IF EXISTS "Editors can update tags" ON public.diagram_tags;
DROP POLICY IF EXISTS "Editors can delete tags" ON public.diagram_tags;

-- View: org members see their org's tags, owner sees all
CREATE POLICY "View tags" ON public.diagram_tags
FOR SELECT USING (
  is_owner(auth.uid())
  OR (organization_id IN (SELECT get_user_organizations(auth.uid())))
);

-- Create: any org member
CREATE POLICY "Create tags" ON public.diagram_tags
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id IN (SELECT get_user_organizations(auth.uid()))
);

-- Update: any org member
CREATE POLICY "Update tags" ON public.diagram_tags
FOR UPDATE USING (
  is_owner(auth.uid())
  OR (organization_id IN (SELECT get_user_organizations(auth.uid())))
);

-- Delete: non-default tags by any member, default tags only by owner
CREATE POLICY "Delete tags" ON public.diagram_tags
FOR DELETE USING (
  (is_default = false AND organization_id IN (SELECT get_user_organizations(auth.uid())))
  OR (is_default = true AND is_owner(auth.uid()))
);
