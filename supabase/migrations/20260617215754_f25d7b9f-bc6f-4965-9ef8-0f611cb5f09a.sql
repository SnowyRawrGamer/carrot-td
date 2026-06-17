
-- Fix: restrict profiles SELECT so emails are not publicly readable
DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "profiles self read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Fix: revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated.
-- has_role/is_editor are invoked from RLS policies as table owner, so revoking
-- direct EXECUTE does not break policy checks. Trigger functions never need
-- direct EXECUTE.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_editor(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
