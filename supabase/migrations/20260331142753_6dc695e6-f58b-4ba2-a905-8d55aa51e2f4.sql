
DROP POLICY "Users can update own diagrams" ON public.diagrams;

CREATE POLICY "Users can update own diagrams"
ON public.diagrams
FOR UPDATE
TO public
USING (
  (created_by = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    can_edit(auth.uid())
    AND organization_id IS NOT NULL
    AND get_user_organization(auth.uid()) = organization_id
  )
);
