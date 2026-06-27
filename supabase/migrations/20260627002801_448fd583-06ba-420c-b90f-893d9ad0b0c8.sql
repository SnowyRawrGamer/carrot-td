
-- Drop duplicate public role-check functions; the private schema versions are the canonical ones.
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);

-- Lock down SECURITY DEFINER functions in the public schema: revoke broad EXECUTE.
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_pending_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_feedback_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- admin_list_profiles is invoked from the admin UI by signed-in owners only.
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- daily_loadout_ratings: drop public SELECT, restrict to signed-in users.
DROP POLICY IF EXISTS "anyone can read daily_loadout_ratings" ON public.daily_loadout_ratings;
DROP POLICY IF EXISTS "public read daily_loadout_ratings" ON public.daily_loadout_ratings;
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.daily_loadout_ratings;
DROP POLICY IF EXISTS "anyone view ratings" ON public.daily_loadout_ratings;
DROP POLICY IF EXISTS "select daily_loadout_ratings" ON public.daily_loadout_ratings;
CREATE POLICY "authenticated view daily_loadout_ratings"
  ON public.daily_loadout_ratings FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.daily_loadout_ratings FROM anon;
