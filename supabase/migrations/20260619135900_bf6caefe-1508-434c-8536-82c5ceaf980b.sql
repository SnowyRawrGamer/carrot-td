
CREATE TABLE public.updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  image_url text,
  description text,
  released_at date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.updates TO authenticated;
GRANT ALL ON public.updates TO service_role;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Updates are viewable by everyone" ON public.updates FOR SELECT USING (true);
CREATE POLICY "Editors manage updates" ON public.updates FOR ALL TO authenticated USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));
CREATE TRIGGER updates_touch BEFORE UPDATE ON public.updates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.update_units (
  update_id uuid NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  PRIMARY KEY (update_id, unit_id)
);
GRANT SELECT ON public.update_units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.update_units TO authenticated;
GRANT ALL ON public.update_units TO service_role;
ALTER TABLE public.update_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Update-units viewable by everyone" ON public.update_units FOR SELECT USING (true);
CREATE POLICY "Editors manage update-units" ON public.update_units FOR ALL TO authenticated USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

CREATE TABLE public.update_chests (
  update_id uuid NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  chest_id uuid NOT NULL REFERENCES public.chests(id) ON DELETE CASCADE,
  PRIMARY KEY (update_id, chest_id)
);
GRANT SELECT ON public.update_chests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.update_chests TO authenticated;
GRANT ALL ON public.update_chests TO service_role;
ALTER TABLE public.update_chests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Update-chests viewable by everyone" ON public.update_chests FOR SELECT USING (true);
CREATE POLICY "Editors manage update-chests" ON public.update_chests FOR ALL TO authenticated USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));
