
CREATE OR REPLACE FUNCTION public.current_user_section_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT section_id FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_section_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_section_id() TO authenticated;

DROP POLICY IF EXISTS "Classmates view section peers" ON public.profiles;

CREATE POLICY "Classmates view section peers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  section_id IS NOT NULL
  AND section_id = public.current_user_section_id()
);
