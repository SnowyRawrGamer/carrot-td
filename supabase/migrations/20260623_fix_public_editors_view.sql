DROP VIEW IF EXISTS public.public_editors CASCADE;

CREATE OR REPLACE FUNCTION public.get_editors()
RETURNS TABLE (
  id UUID,
  public_name TEXT,
  role app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.public_name,
    ur.role
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role IN ('editor', 'owner')
  ORDER BY ur.role, p.public_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_editors() TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_editors AS
SELECT * FROM public.get_editors();

GRANT SELECT ON public.public_editors TO anon, authenticated;
