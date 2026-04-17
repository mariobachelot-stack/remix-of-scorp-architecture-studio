
-- PHASE 1: Create new enum type
CREATE TYPE public.app_role_v2 AS ENUM ('owner', 'org_admin', 'member');

-- PHASE 2: Add columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

UPDATE public.organizations SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
ALTER TABLE public.organizations ALTER COLUMN slug SET NOT NULL;

-- PHASE 3: Create organization_members table
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role_v2 NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PHASE 4: Create invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role_v2 NOT NULL DEFAULT 'member',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PHASE 5: Migrate existing data
INSERT INTO public.organization_members (user_id, organization_id, role) VALUES
  ('a8bde3be-8345-4e5c-aeb9-d11ee04d88a4', '1208f6ee-5f18-41a9-8365-9fea436d84be', 'owner'),
  ('2a7e4462-ae5d-49fd-ba97-57d52d1126a7', '1208f6ee-5f18-41a9-8365-9fea436d84be', 'owner'),
  ('f6094727-bdaf-40fd-ac4e-907ddde5984e', '1208f6ee-5f18-41a9-8365-9fea436d84be', 'owner'),
  ('5690db4e-cd99-4716-8f85-60d71b5564a8', '1208f6ee-5f18-41a9-8365-9fea436d84be', 'owner'),
  ('a0590ce6-1b28-4c94-9b6d-d164f0d3ca22', '1208f6ee-5f18-41a9-8365-9fea436d84be', 'org_admin'),
  ('f93ffc17-2244-4818-9c47-095d68154262', '764fe2e1-a44a-443a-a838-e140b1d68813', 'org_admin'),
  ('50b0e77c-2eba-4c9a-96d8-9e2095014507', 'c8bbb3eb-4fdc-461b-a2a7-90ad907d0722', 'org_admin'),
  ('52995ad2-8bc4-4902-b173-774d3c8e2032', '8aa73dc9-80b2-4010-a974-9231cff66df3', 'member'),
  ('22934228-9d67-48bb-ab4f-38c3e734aecf', '1208f6ee-5f18-41a9-8365-9fea436d84be', 'member')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- PHASE 6: Security definer functions
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND role = 'owner')
$$;

CREATE OR REPLACE FUNCTION public.has_role_v2(_user_id uuid, _role app_role_v2)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _org_id uuid, _role app_role_v2)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_organizations(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.can_edit(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND role IN ('owner', 'org_admin'))
$$;

CREATE OR REPLACE FUNCTION public.can_manage_library(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND role IN ('owner', 'org_admin'))
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id ORDER BY created_at ASC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _role = 'admin' THEN public.is_owner(_user_id)
    WHEN _role = 'editor' THEN public.can_edit(_user_id)
    WHEN _role = 'library_admin' THEN public.can_manage_library(_user_id)
    WHEN _role = 'reader' THEN EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id)
    ELSE false
  END
$$;

-- PHASE 7: Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, organization_id)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    (SELECT id FROM public.organizations WHERE is_default = true)
  );
  INSERT INTO public.organization_members (user_id, organization_id, role)
  SELECT NEW.id, i.organization_id, i.role
  FROM public.invitations i
  WHERE i.email = NEW.email AND i.status = 'pending' AND i.expires_at > now()
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  UPDATE public.invitations SET status = 'accepted', updated_at = now()
  WHERE email = NEW.email AND status = 'pending' AND expires_at > now();
  RETURN NEW;
END;
$$;

-- PHASE 8: RLS for organization_members
CREATE POLICY "View org members" ON public.organization_members FOR SELECT TO authenticated
USING (is_owner(auth.uid()) OR organization_id IN (SELECT public.get_user_organizations(auth.uid())));

CREATE POLICY "Add org members" ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (is_owner(auth.uid()) OR has_role_in_org(auth.uid(), organization_id, 'org_admin'));

CREATE POLICY "Update org members" ON public.organization_members FOR UPDATE TO authenticated
USING (is_owner(auth.uid()) OR has_role_in_org(auth.uid(), organization_id, 'org_admin'));

CREATE POLICY "Remove org members" ON public.organization_members FOR DELETE TO authenticated
USING (is_owner(auth.uid()) OR has_role_in_org(auth.uid(), organization_id, 'org_admin'));

-- PHASE 9: RLS for invitations
CREATE POLICY "View invitations" ON public.invitations FOR SELECT TO authenticated
USING (is_owner(auth.uid()) OR has_role_in_org(auth.uid(), organization_id, 'org_admin'));

CREATE POLICY "Create invitations" ON public.invitations FOR INSERT TO authenticated
WITH CHECK (is_owner(auth.uid()) OR has_role_in_org(auth.uid(), organization_id, 'org_admin'));

CREATE POLICY "Update invitations" ON public.invitations FOR UPDATE TO authenticated
USING (is_owner(auth.uid()) OR has_role_in_org(auth.uid(), organization_id, 'org_admin'));

CREATE POLICY "Delete invitations" ON public.invitations FOR DELETE TO authenticated
USING (is_owner(auth.uid()) OR has_role_in_org(auth.uid(), organization_id, 'org_admin'));

CREATE POLICY "Anon view invitation by token" ON public.invitations FOR SELECT TO anon USING (true);

-- PHASE 10: Update diagrams RLS
DROP POLICY IF EXISTS "Users can view own diagrams or public with token" ON public.diagrams;
DROP POLICY IF EXISTS "Users can update own diagrams" ON public.diagrams;
DROP POLICY IF EXISTS "Users can delete own diagrams" ON public.diagrams;
DROP POLICY IF EXISTS "Authenticated users can create diagrams" ON public.diagrams;

CREATE POLICY "Diagram select" ON public.diagrams FOR SELECT TO public
USING (
  ((is_public = true) AND (public_token IS NOT NULL))
  OR is_owner(auth.uid())
  OR (organization_id IS NOT NULL AND organization_id IN (SELECT public.get_user_organizations(auth.uid())))
  OR created_by = auth.uid()
);

CREATE POLICY "Diagram insert" ON public.diagrams FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Diagram update" ON public.diagrams FOR UPDATE TO public
USING (
  is_owner(auth.uid())
  OR created_by = auth.uid()
  OR (can_edit(auth.uid()) AND organization_id IS NOT NULL AND organization_id IN (SELECT public.get_user_organizations(auth.uid())))
);

CREATE POLICY "Diagram delete" ON public.diagrams FOR DELETE TO public
USING (is_owner(auth.uid()) OR created_by = auth.uid());

-- PHASE 11: Update organizations RLS
DROP POLICY IF EXISTS "Admins can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;

CREATE POLICY "View organizations" ON public.organizations FOR SELECT TO public USING (true);
CREATE POLICY "Create organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update organizations" ON public.organizations FOR UPDATE TO authenticated
USING (is_owner(auth.uid()) OR has_role_in_org(auth.uid(), id, 'org_admin'))
WITH CHECK (is_owner(auth.uid()) OR has_role_in_org(auth.uid(), id, 'org_admin'));
CREATE POLICY "Delete organizations" ON public.organizations FOR DELETE TO authenticated
USING (is_owner(auth.uid()) AND is_default = false);

-- PHASE 12: Update profiles RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "View profiles" ON public.profiles FOR SELECT TO public
USING (
  auth.uid() = user_id
  OR is_owner(auth.uid())
  OR user_id IN (
    SELECT om2.user_id FROM public.organization_members om2
    WHERE om2.organization_id IN (SELECT public.get_user_organizations(auth.uid()))
  )
);

CREATE POLICY "Owners update any profile" ON public.profiles FOR UPDATE TO authenticated
USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

-- PHASE 13: Update user_roles RLS
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "View own user_roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners view all user_roles" ON public.user_roles FOR SELECT TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners manage user_roles insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners manage user_roles update" ON public.user_roles FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners manage user_roles delete" ON public.user_roles FOR DELETE TO authenticated USING (is_owner(auth.uid()));

-- PHASE 14: Update diagram_folders RLS
DROP POLICY IF EXISTS "Editors can create folders" ON public.diagram_folders;
DROP POLICY IF EXISTS "Editors can delete folders" ON public.diagram_folders;
DROP POLICY IF EXISTS "Editors can update folders" ON public.diagram_folders;
DROP POLICY IF EXISTS "Users can view folders from same organization" ON public.diagram_folders;

CREATE POLICY "View folders" ON public.diagram_folders FOR SELECT TO public
USING (created_by IS NULL OR is_owner(auth.uid()) OR created_by = auth.uid() OR get_user_organization(auth.uid()) = get_user_organization(created_by));
CREATE POLICY "Create folders" ON public.diagram_folders FOR INSERT TO public WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Update folders" ON public.diagram_folders FOR UPDATE TO public USING (can_edit(auth.uid()));
CREATE POLICY "Delete folders" ON public.diagram_folders FOR DELETE TO public USING (can_edit(auth.uid()));

-- PHASE 15: Update diagram_templates RLS
DROP POLICY IF EXISTS "Editors can create templates" ON public.diagram_templates;
DROP POLICY IF EXISTS "Template creator or admin can delete" ON public.diagram_templates;
DROP POLICY IF EXISTS "Template creator or admin can update" ON public.diagram_templates;
DROP POLICY IF EXISTS "Templates are viewable by everyone" ON public.diagram_templates;

CREATE POLICY "View templates" ON public.diagram_templates FOR SELECT TO public USING (true);
CREATE POLICY "Create templates" ON public.diagram_templates FOR INSERT TO public WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "Update templates" ON public.diagram_templates FOR UPDATE TO public USING (created_by = auth.uid() OR is_owner(auth.uid()));
CREATE POLICY "Delete templates" ON public.diagram_templates FOR DELETE TO public USING (created_by = auth.uid() OR is_owner(auth.uid()));

-- PHASE 16: Indexes
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_role ON public.organization_members(role);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- Enable realtime for organization_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
