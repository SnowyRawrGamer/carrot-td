
-- ROLES
CREATE TYPE public.app_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_editor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','editor'))
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "owners manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles update self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- AUTO-CREATE PROFILE + FIRST USER = OWNER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- UNITS
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  photo_url TEXT,
  rarity TEXT,
  tier TEXT,
  description TEXT,
  base_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.units TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units public read" ON public.units FOR SELECT USING (true);
CREATE POLICY "editors insert units" ON public.units FOR INSERT TO authenticated
  WITH CHECK (public.is_editor(auth.uid()));
CREATE POLICY "editors update units" ON public.units FOR UPDATE TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));
CREATE POLICY "editors delete units" ON public.units FOR DELETE TO authenticated
  USING (public.is_editor(auth.uid()));

CREATE TABLE public.unit_upgrade_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  path_index SMALLINT NOT NULL CHECK (path_index IN (1,2)),
  label TEXT,
  UNIQUE (unit_id, path_index)
);
GRANT SELECT ON public.unit_upgrade_paths TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.unit_upgrade_paths TO authenticated;
GRANT ALL ON public.unit_upgrade_paths TO service_role;
ALTER TABLE public.unit_upgrade_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paths public read" ON public.unit_upgrade_paths FOR SELECT USING (true);
CREATE POLICY "editors write paths" ON public.unit_upgrade_paths FOR ALL TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

CREATE TABLE public.unit_upgrade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.unit_upgrade_paths(id) ON DELETE CASCADE,
  level SMALLINT NOT NULL,
  cost NUMERIC,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (path_id, level)
);
GRANT SELECT ON public.unit_upgrade_levels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.unit_upgrade_levels TO authenticated;
GRANT ALL ON public.unit_upgrade_levels TO service_role;
ALTER TABLE public.unit_upgrade_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels public read" ON public.unit_upgrade_levels FOR SELECT USING (true);
CREATE POLICY "editors write levels" ON public.unit_upgrade_levels FOR ALL TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

-- SUMMONS
CREATE TABLE public.summons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  banner_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.summons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.summons TO authenticated;
GRANT ALL ON public.summons TO service_role;
ALTER TABLE public.summons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summons public read" ON public.summons FOR SELECT USING (true);
CREATE POLICY "editors write summons" ON public.summons FOR ALL TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

CREATE TABLE public.summon_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summon_id UUID NOT NULL REFERENCES public.summons(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  drop_rate NUMERIC NOT NULL DEFAULT 0,
  UNIQUE (summon_id, unit_id)
);
GRANT SELECT ON public.summon_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.summon_entries TO authenticated;
GRANT ALL ON public.summon_entries TO service_role;
ALTER TABLE public.summon_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summon_entries public read" ON public.summon_entries FOR SELECT USING (true);
CREATE POLICY "editors write summon_entries" ON public.summon_entries FOR ALL TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

-- CHESTS
CREATE TABLE public.chests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chests TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chests TO authenticated;
GRANT ALL ON public.chests TO service_role;
ALTER TABLE public.chests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chests public read" ON public.chests FOR SELECT USING (true);
CREATE POLICY "editors write chests" ON public.chests FOR ALL TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

CREATE TABLE public.chest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chest_id UUID NOT NULL REFERENCES public.chests(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  drop_rate NUMERIC NOT NULL DEFAULT 0,
  UNIQUE (chest_id, unit_id)
);
GRANT SELECT ON public.chest_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chest_entries TO authenticated;
GRANT ALL ON public.chest_entries TO service_role;
ALTER TABLE public.chest_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chest_entries public read" ON public.chest_entries FOR SELECT USING (true);
CREATE POLICY "editors write chest_entries" ON public.chest_entries FOR ALL TO authenticated
  USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER units_touch BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER summons_touch BEFORE UPDATE ON public.summons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER chests_touch BEFORE UPDATE ON public.chests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
