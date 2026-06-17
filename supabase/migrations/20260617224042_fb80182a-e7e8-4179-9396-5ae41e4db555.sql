
-- Restore Data API grants on public tables (a prior security migration revoked them,
-- which made PostgREST unable to read any table even with RLS policies in place).

-- Publicly readable content (anon + authenticated read; editors write via RLS)
GRANT SELECT ON public.units              TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.units              TO authenticated;
GRANT ALL ON public.units              TO service_role;

GRANT SELECT ON public.unit_upgrade_paths TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.unit_upgrade_paths TO authenticated;
GRANT ALL ON public.unit_upgrade_paths TO service_role;

GRANT SELECT ON public.unit_upgrade_levels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.unit_upgrade_levels TO authenticated;
GRANT ALL ON public.unit_upgrade_levels TO service_role;

GRANT SELECT ON public.chests             TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chests             TO authenticated;
GRANT ALL ON public.chests             TO service_role;

GRANT SELECT ON public.chest_entries      TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chest_entries      TO authenticated;
GRANT ALL ON public.chest_entries      TO service_role;

GRANT SELECT ON public.summons            TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.summons            TO authenticated;
GRANT ALL ON public.summons            TO service_role;

GRANT SELECT ON public.summon_entries     TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.summon_entries     TO authenticated;
GRANT ALL ON public.summon_entries     TO service_role;

-- Auth-only tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles   TO authenticated;
GRANT ALL ON public.profiles   TO service_role;

GRANT SELECT ON public.user_roles  TO authenticated;
GRANT ALL ON public.user_roles  TO service_role;
