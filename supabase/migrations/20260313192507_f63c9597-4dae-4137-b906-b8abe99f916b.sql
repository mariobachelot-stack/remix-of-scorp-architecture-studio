-- Add organization_id column to diagrams table (nullable, defaults to creator's org)
ALTER TABLE public.diagrams
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Backfill existing diagrams: set organization_id from the creator's profile
UPDATE public.diagrams d
SET organization_id = p.organization_id
FROM public.profiles p
WHERE d.created_by = p.user_id
AND d.organization_id IS NULL;