
GRANT SELECT ON public.community_loadouts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_loadouts TO authenticated;
GRANT ALL ON public.community_loadouts TO service_role;

GRANT SELECT ON public.community_loadout_units TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_loadout_units TO authenticated;
GRANT ALL ON public.community_loadout_units TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_loadout_votes TO authenticated;
GRANT ALL ON public.community_loadout_votes TO service_role;

GRANT SELECT ON public.daily_loadouts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.daily_loadouts TO authenticated;
GRANT ALL ON public.daily_loadouts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_loadout_ratings TO authenticated;
GRANT ALL ON public.daily_loadout_ratings TO service_role;

-- Views used by client
GRANT SELECT ON public.public_loadouts TO anon, authenticated;
GRANT SELECT ON public.community_loadout_scores TO anon, authenticated;
