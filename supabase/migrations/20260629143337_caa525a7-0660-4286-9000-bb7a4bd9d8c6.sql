
CREATE TABLE public.maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  description text,
  gallery_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  removed_update_id uuid REFERENCES public.updates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.maps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maps TO authenticated;
GRANT ALL ON public.maps TO service_role;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maps public read" ON public.maps FOR SELECT USING (true);
CREATE POLICY "maps editor write" ON public.maps FOR ALL TO authenticated
  USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

CREATE TABLE public.gamemodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  description text,
  removed_update_id uuid REFERENCES public.updates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gamemodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamemodes TO authenticated;
GRANT ALL ON public.gamemodes TO service_role;
ALTER TABLE public.gamemodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gamemodes public read" ON public.gamemodes FOR SELECT USING (true);
CREATE POLICY "gamemodes editor write" ON public.gamemodes FOR ALL TO authenticated
  USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

CREATE TABLE public.update_maps (
  update_id uuid NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  map_id uuid NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  PRIMARY KEY (update_id, map_id)
);
GRANT SELECT ON public.update_maps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.update_maps TO authenticated;
GRANT ALL ON public.update_maps TO service_role;
ALTER TABLE public.update_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "update_maps public read" ON public.update_maps FOR SELECT USING (true);
CREATE POLICY "update_maps editor write" ON public.update_maps FOR ALL TO authenticated
  USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

CREATE TABLE public.update_gamemodes (
  update_id uuid NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  gamemode_id uuid NOT NULL REFERENCES public.gamemodes(id) ON DELETE CASCADE,
  PRIMARY KEY (update_id, gamemode_id)
);
GRANT SELECT ON public.update_gamemodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.update_gamemodes TO authenticated;
GRANT ALL ON public.update_gamemodes TO service_role;
ALTER TABLE public.update_gamemodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "update_gamemodes public read" ON public.update_gamemodes FOR SELECT USING (true);
CREATE POLICY "update_gamemodes editor write" ON public.update_gamemodes FOR ALL TO authenticated
  USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

CREATE TRIGGER touch_maps BEFORE UPDATE ON public.maps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_gamemodes BEFORE UPDATE ON public.gamemodes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
