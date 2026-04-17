-- Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Everyone can view organizations
CREATE POLICY "Anyone can view organizations"
ON public.organizations FOR SELECT
USING (true);

-- Only admins can manage organizations
CREATE POLICY "Admins can insert organizations"
ON public.organizations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update organizations"
ON public.organizations FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete organizations"
ON public.organizations FOR DELETE
USING (has_role(auth.uid(), 'admin') AND is_default = false);

-- Add trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default organization
INSERT INTO public.organizations (name, description, is_default)
VALUES ('Aucune', 'Organisation par défaut', true);

-- Add organization_id to profiles
ALTER TABLE public.profiles
ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Set all existing users to default organization
UPDATE public.profiles
SET organization_id = (SELECT id FROM public.organizations WHERE is_default = true);

-- Make organization_id NOT NULL after setting defaults
ALTER TABLE public.profiles
ALTER COLUMN organization_id SET NOT NULL;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Update diagrams RLS policies to filter by organization
DROP POLICY IF EXISTS "Anyone can view diagrams" ON public.diagrams;
DROP POLICY IF EXISTS "Anyone can create diagrams" ON public.diagrams;
DROP POLICY IF EXISTS "Anyone can update diagrams" ON public.diagrams;
DROP POLICY IF EXISTS "Anyone can delete diagrams" ON public.diagrams;

-- Users can only view diagrams from same organization (or public diagrams)
CREATE POLICY "Users can view diagrams from same organization"
ON public.diagrams FOR SELECT
USING (
  is_public = true 
  OR created_by IS NULL
  OR has_role(auth.uid(), 'admin')
  OR get_user_organization(auth.uid()) = get_user_organization(created_by)
);

-- Users can create diagrams
CREATE POLICY "Authenticated users can create diagrams"
ON public.diagrams FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update diagrams from same organization
CREATE POLICY "Users can update diagrams from same organization"
ON public.diagrams FOR UPDATE
USING (
  created_by IS NULL
  OR has_role(auth.uid(), 'admin')
  OR get_user_organization(auth.uid()) = get_user_organization(created_by)
);

-- Users can delete diagrams from same organization
CREATE POLICY "Users can delete diagrams from same organization"
ON public.diagrams FOR DELETE
USING (
  created_by IS NULL
  OR has_role(auth.uid(), 'admin')
  OR get_user_organization(auth.uid()) = get_user_organization(created_by)
);

-- Update handle_new_user to assign default organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    (SELECT id FROM public.organizations WHERE is_default = true)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'reader');
  
  RETURN NEW;
END;
$$;