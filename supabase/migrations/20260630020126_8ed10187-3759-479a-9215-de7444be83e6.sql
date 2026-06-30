
DROP POLICY IF EXISTS "system insert help log" ON public.forum_help_log;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_loadout_votes_vote_check') THEN
    ALTER TABLE public.community_loadout_votes
      ADD CONSTRAINT community_loadout_votes_vote_check CHECK (vote IN (1, -1));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profile_moderation (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  forum_banned_until timestamptz,
  forum_ban_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.profile_moderation (user_id, forum_banned_until, forum_ban_reason)
SELECT id, forum_banned_until, forum_ban_reason FROM public.profiles
WHERE forum_banned_until IS NOT NULL OR forum_ban_reason IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS forum_banned_until;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS forum_ban_reason;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_moderation TO authenticated;
GRANT ALL ON public.profile_moderation TO service_role;
ALTER TABLE public.profile_moderation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self read moderation" ON public.profile_moderation;
DROP POLICY IF EXISTS "owners read all moderation" ON public.profile_moderation;
DROP POLICY IF EXISTS "owners insert moderation" ON public.profile_moderation;
DROP POLICY IF EXISTS "owners update moderation" ON public.profile_moderation;
DROP POLICY IF EXISTS "owners delete moderation" ON public.profile_moderation;

CREATE POLICY "self read moderation" ON public.profile_moderation
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owners read all moderation" ON public.profile_moderation
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'owner'));
CREATE POLICY "owners insert moderation" ON public.profile_moderation
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'owner'));
CREATE POLICY "owners update moderation" ON public.profile_moderation
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'owner'))
  WITH CHECK (private.has_role(auth.uid(), 'owner'));
CREATE POLICY "owners delete moderation" ON public.profile_moderation
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'owner'));

ALTER VIEW public.public_editors SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_pending_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_approval_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_help_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_like_points() FROM PUBLIC, anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.increment_view_count(post_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.forum_posts SET view_count = view_count + 1 WHERE id = post_id;
$$;
REVOKE EXECUTE ON FUNCTION private.increment_view_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.increment_view_count(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public, private AS $$
  SELECT private.increment_view_count(post_id);
$$;
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;
