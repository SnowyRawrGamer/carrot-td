
-- 1. Create private schema for security-definer helpers (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- 2. Recreate helpers in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','editor'))
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','editor'))
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_editor(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.is_editor(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, anon;

-- 3. Recreate every policy that references the public helpers to use the private ones

-- audit_log
DROP POLICY "owners view audit log" ON public.audit_log;
CREATE POLICY "owners view audit log" ON public.audit_log FOR SELECT USING (private.has_role(auth.uid(),'owner'::public.app_role));

-- chest_entries
DROP POLICY "editors write chest_entries" ON public.chest_entries;
CREATE POLICY "editors write chest_entries" ON public.chest_entries FOR ALL USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

-- chests
DROP POLICY "editors write chests" ON public.chests;
CREATE POLICY "editors write chests" ON public.chests FOR ALL USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

-- community_loadout_units
DROP POLICY "staff delete loadout units" ON public.community_loadout_units;
CREATE POLICY "staff delete loadout units" ON public.community_loadout_units FOR DELETE USING (private.is_staff(auth.uid()));
DROP POLICY "view units of visible loadouts" ON public.community_loadout_units;
CREATE POLICY "view units of visible loadouts" ON public.community_loadout_units FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_loadouts cl
          WHERE cl.id = community_loadout_units.loadout_id
            AND (cl.status = 'approved' OR cl.creator_id = auth.uid() OR private.is_staff(auth.uid())))
);

-- community_loadouts
DROP POLICY "staff delete loadouts" ON public.community_loadouts;
CREATE POLICY "staff delete loadouts" ON public.community_loadouts FOR DELETE USING (private.is_staff(auth.uid()));
DROP POLICY "staff update loadouts" ON public.community_loadouts;
CREATE POLICY "staff update loadouts" ON public.community_loadouts FOR UPDATE USING (private.is_staff(auth.uid()));
DROP POLICY "view approved or own or staff" ON public.community_loadouts;
CREATE POLICY "view approved or own or staff" ON public.community_loadouts FOR SELECT USING (
  status = 'approved' OR creator_id = auth.uid() OR private.is_staff(auth.uid())
);

-- profiles
DROP POLICY "owners update any profile" ON public.profiles;
CREATE POLICY "owners update any profile" ON public.profiles FOR UPDATE USING (private.has_role(auth.uid(),'owner'::public.app_role));
DROP POLICY "profiles owner read all" ON public.profiles;
CREATE POLICY "profiles owner read all" ON public.profiles FOR SELECT USING (private.has_role(auth.uid(),'owner'::public.app_role));

-- site_note_comments
DROP POLICY "staff full access comments" ON public.site_note_comments;
CREATE POLICY "staff full access comments" ON public.site_note_comments FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- site_notes
DROP POLICY "staff full access notes" ON public.site_notes;
CREATE POLICY "staff full access notes" ON public.site_notes FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- summon_entries
DROP POLICY "editors write summon_entries" ON public.summon_entries;
CREATE POLICY "editors write summon_entries" ON public.summon_entries FOR ALL USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

-- summons
DROP POLICY "editors write summons" ON public.summons;
CREATE POLICY "editors write summons" ON public.summons FOR ALL USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

-- unit_upgrade_levels
DROP POLICY "editors write levels" ON public.unit_upgrade_levels;
CREATE POLICY "editors write levels" ON public.unit_upgrade_levels FOR ALL USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

-- unit_upgrade_paths
DROP POLICY "editors write paths" ON public.unit_upgrade_paths;
CREATE POLICY "editors write paths" ON public.unit_upgrade_paths FOR ALL USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

-- units
DROP POLICY "editors delete units" ON public.units;
CREATE POLICY "editors delete units" ON public.units FOR DELETE USING (private.is_editor(auth.uid()));
DROP POLICY "editors insert units" ON public.units;
CREATE POLICY "editors insert units" ON public.units FOR INSERT WITH CHECK (private.is_editor(auth.uid()));
DROP POLICY "editors update units" ON public.units;
CREATE POLICY "editors update units" ON public.units FOR UPDATE USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

-- update_chests / update_summons / update_units / updates
DROP POLICY "Editors manage update-chests" ON public.update_chests;
CREATE POLICY "Editors manage update-chests" ON public.update_chests FOR ALL USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));
DROP POLICY "staff manage update_summons" ON public.update_summons;
CREATE POLICY "staff manage update_summons" ON public.update_summons FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
DROP POLICY "Editors manage update-units" ON public.update_units;
CREATE POLICY "Editors manage update-units" ON public.update_units FOR ALL USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));
DROP POLICY "Editors manage updates" ON public.updates;
CREATE POLICY "Editors manage updates" ON public.updates FOR ALL USING (private.is_editor(auth.uid())) WITH CHECK (private.is_editor(auth.uid()));

-- user_roles
DROP POLICY "owners manage roles" ON public.user_roles;
CREATE POLICY "owners manage roles" ON public.user_roles FOR ALL USING (private.has_role(auth.uid(),'owner'::public.app_role)) WITH CHECK (private.has_role(auth.uid(),'owner'::public.app_role));
DROP POLICY "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR private.has_role(auth.uid(),'owner'::public.app_role));

-- 4. Update admin_list_profiles to use private.has_role and add explicit owner gate
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE(id uuid, email text, display_name text, public_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(),'owner'::public.app_role) THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT p.id, p.email, p.display_name, p.public_name FROM public.profiles p;
END;
$$;
-- admin_list_profiles is still RPC-called from the admin UI, but the body now hard-blocks non-owners.
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- 5. Drop the now-unused public helpers
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_editor(uuid);
DROP FUNCTION IF EXISTS public.is_staff(uuid);

-- 6. Replace public_editors view to drop dependency on get_editors and run as invoker
DROP VIEW IF EXISTS public.public_editors;
CREATE VIEW public.public_editors WITH (security_invoker = true) AS
  SELECT p.id, p.public_name, ur.role
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('editor','owner');
GRANT SELECT ON public.public_editors TO anon, authenticated;
DROP FUNCTION IF EXISTS public.get_editors();

-- 7. Make other public views security_invoker
ALTER VIEW public.public_loadouts SET (security_invoker = true);
ALTER VIEW public.community_loadout_scores SET (security_invoker = true);

-- 8. daily_loadouts: restrict insert to staff
DROP POLICY "enable insert for authenticated users" ON public.daily_loadouts;
CREATE POLICY "staff insert daily_loadouts" ON public.daily_loadouts FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));

-- 9. community_loadout_votes: restrict SELECT to authenticated users
DROP POLICY "anyone view votes" ON public.community_loadout_votes;
CREATE POLICY "authenticated view votes" ON public.community_loadout_votes FOR SELECT TO authenticated USING (true);

-- 10. enforce_feedback_limit: set search_path
CREATE OR REPLACE FUNCTION public.enforce_feedback_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.site_feedback WHERE user_id = NEW.user_id AND status = 'pending') >= 3 THEN
    RAISE EXCEPTION 'You already have 3 pending submissions.';
  END IF;
  RETURN NEW;
END;
$$;
