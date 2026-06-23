
-- Loadout of the Day Tables
CREATE TABLE public.loadouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.loadout_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loadout_id UUID NOT NULL REFERENCES public.loadouts(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  UNIQUE (loadout_id, slot_index)
);

CREATE TABLE public.loadout_of_the_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  loadout_id UUID NOT NULL REFERENCES public.loadouts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permissions
ALTER TABLE public.loadouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loadout_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loadout_of_the_day ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.loadouts TO anon, authenticated;
GRANT ALL ON public.loadouts TO authenticated;
GRANT ALL ON public.loadouts TO service_role;

GRANT SELECT ON public.loadout_units TO anon, authenticated;
GRANT ALL ON public.loadout_units TO authenticated;
GRANT ALL ON public.loadout_units TO service_role;

GRANT SELECT ON public.loadout_of_the_day TO anon, authenticated;
GRANT ALL ON public.loadout_of_the_day TO authenticated;
GRANT ALL ON public.loadout_of_the_day TO service_role;

-- Policies
CREATE POLICY "Public read loadouts" ON public.loadouts FOR SELECT USING (true);
CREATE POLICY "Editors manage loadouts" ON public.loadouts FOR ALL TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

CREATE POLICY "Public read loadout units" ON public.loadout_units FOR SELECT USING (true);
CREATE POLICY "Editors manage loadout units" ON public.loadout_units FOR ALL TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

CREATE POLICY "Public read loadout of the day" ON public.loadout_of_the_day FOR SELECT USING (true);
CREATE POLICY "Editors manage loadout of the day" ON public.loadout_of_the_day FOR ALL TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

-- Updated At Trigger
CREATE TRIGGER loadouts_touch BEFORE UPDATE ON public.loadouts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
