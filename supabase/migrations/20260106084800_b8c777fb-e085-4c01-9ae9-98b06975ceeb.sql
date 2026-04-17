-- Tighten profiles visibility: only the owner can read their profile (admins can read all)
DROP POLICY IF EXISTS "Users can view own or organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);