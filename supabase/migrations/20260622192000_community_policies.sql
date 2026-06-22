-- Allow the community to view approved loadouts and their units
CREATE POLICY "Public can view approved loadouts" ON public.community_loadouts FOR SELECT USING (status = 'approved');
CREATE POLICY "Public can view loadout units" ON public.community_loadout_units FOR SELECT USING (true);

-- Allow public access to profile display names (required for creator attribution)
-- This policy allows the community to see the display_name and avatar of loadout creators
CREATE POLICY "Public can view profile display names" ON public.profiles FOR SELECT USING (true);
