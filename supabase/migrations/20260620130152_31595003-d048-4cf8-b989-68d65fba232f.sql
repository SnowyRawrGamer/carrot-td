
-- Drop overly broad public-read policies on profiles that exposed email
DROP POLICY IF EXISTS "public read editors profiles" ON public.profiles;
DROP POLICY IF EXISTS "public read loadout creator profiles" ON public.profiles;

-- Revoke EXECUTE on SECURITY DEFINER functions that should never be user-callable
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_changes() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_pending_limit() FROM anon, authenticated, PUBLIC;

-- admin_list_profiles already gates internally on owner role; revoke from anon, keep for authenticated
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM anon, PUBLIC;
