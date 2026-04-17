CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT om.organization_id 
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = _user_id
    AND o.is_default = false
  ORDER BY om.created_at ASC 
  LIMIT 1
$$;