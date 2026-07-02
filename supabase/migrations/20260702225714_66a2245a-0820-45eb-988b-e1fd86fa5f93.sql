
-- 1) Convert public.get_my_username to SECURITY INVOKER (self-read policy already allows this)
CREATE OR REPLACE FUNCTION public.get_my_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT username FROM public.profiles WHERE id = auth.uid();
$$;

-- 2) Route admin_list_profiles through a private SECURITY DEFINER helper, with owner check in the public wrapper
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.admin_list_profiles_all()
RETURNS TABLE(id uuid, email text, display_name text, public_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.display_name, p.public_name FROM public.profiles p;
$$;

REVOKE ALL ON FUNCTION private.admin_list_profiles_all() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE(id uuid, email text, display_name text, public_name text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'owner'::app_role) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM private.admin_list_profiles_all();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- 3) Revoke SELECT on the sensitive email column from anon/authenticated so the
--    public read policies on profiles cannot expose email addresses.
REVOKE SELECT (email) ON public.profiles FROM anon;
REVOKE SELECT (email) ON public.profiles FROM authenticated;
-- Retain writes/reads on all other columns as previously granted.
