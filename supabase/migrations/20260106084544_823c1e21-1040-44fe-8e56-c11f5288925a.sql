-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive policy: users can view their own profile OR profiles within their organization
CREATE POLICY "Users can view own or organization profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) 
  OR (get_user_organization(auth.uid()) = organization_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);