
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE(id uuid, email text, display_name text, public_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT p.id, p.email, p.display_name, p.public_name FROM public.profiles p;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
