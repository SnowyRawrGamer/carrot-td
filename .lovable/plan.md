## What happened

Your browser is talking to a different backend than your actual database.

- Network requests from the preview are going to `https://beuzyqudahxusphhbtqh.supabase.co` using a `sb_publishable_…` key, and every call comes back with `PGRST205: Could not find the table 'public.units'` — that project has no tables.
- Your real backend (the one with your 15 units, your `owner` role, the migrations I've been running, etc.) lives at a different project entirely — `biosklbeesyohleiyyqz`, which is what `.env` and `src/integrations/supabase/client.ts` are configured for.

So nothing was actually deleted. The frontend is just hitting the wrong project, which is why every page looks empty and every account looks broken.

## How it likely happened

The browser preview is running a build/cached bundle that was compiled with the old `beuzyqudahxusphhbtqh` URL + key baked in. `.env` has since been updated to the correct project, but the running preview hasn't picked it up (Vite inlines `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time, so a stale module/cache keeps the old values alive until the dev server reloads).

## Fix

1. Confirm `.env` is pointing at the right project (`biosklbeesyohleiyyqz`) — already verified.
2. Restart the Vite dev server so the new env vars are inlined into the bundle.
3. Have the preview reload (hard refresh) so the browser drops the stale `beuzyqud…` chunk and picks up the rebuilt one.
4. Re-check the network tab — requests should now go to `https://biosklbeesyohleiyyqz.supabase.co` and return your real units, profile, roles, etc.
5. If after the restart the preview is still hitting `beuzyqud…`, search the repo for any hardcoded URL/key (I already grepped — nothing matched, but I'll re-verify after the rebuild) and clear any cached Vite output (`node_modules/.vite`).

No data migration is required — your data is intact on the project the `.env` points to. This is purely a "preview is stuck on the previous backend URL" issue.

## Technical details

- Browser request seen: `GET https://beuzyqudahxusphhbtqh.supabase.co/rest/v1/units…` → 404 `PGRST205`.
- `.env` (current): `VITE_SUPABASE_URL=https://biosklbeesyohleiyyqz.supabase.co`.
- `psql` (which uses the actively-attached backend) reports `SELECT count(*) FROM public.units → 15`, plus all your `user_roles`, `profiles`, migrations, and security policies are present on that project.
- Action: `code--restart_dev_server` to reload env, then verify in the live preview.