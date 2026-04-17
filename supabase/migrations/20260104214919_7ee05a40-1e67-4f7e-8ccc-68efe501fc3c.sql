-- Create a helper function to check if user can manage equipment library
CREATE OR REPLACE FUNCTION public.can_manage_library(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'library_admin')
  )
$$;