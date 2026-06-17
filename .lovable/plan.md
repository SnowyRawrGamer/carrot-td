
# Carrot TD Value List

A public, browsable value list site for Carrot TD with an admin-managed catalog of units, summons, and chests. Built on Lovable Cloud (database, auth, storage) with role-based editor access.

## Pages

- **Home (`/`)** — hero, featured/recent units, quick links to Units, Summons, Chests.
- **Units (`/units`)** — clean, minimal grid: photo, name, rarity/tier badge. Filters: rarity, tier, search.
- **Unit detail (`/units/$slug`)** — full stats card, upgrade table (path 1 and optional path 2), photo gallery, "Values — coming soon" tab.
- **Summons (`/summons`)** — list of summon banners/pools; each shows the units in the pool with drop rates.
- **Summon detail (`/summons/$slug`)** — banner art, full pool with rarities and percentages, total odds sanity check.
- **Chests (`/chests`)** — list of chest types; each shows contents and drop rates.
- **Chest detail (`/chests/$slug`)** — same shape as summon detail.
- **Auth (`/auth`)** — email/password + Google sign-in.
- **Admin (`/_authenticated/admin`)** — gated by editor or owner role.
  - **Units manager** — list, create, edit, delete units. Editor form is the priority UX (see below).
  - **Summons manager** — create/edit pools, attach units with drop rates.
  - **Chests manager** — same as summons.
  - **Editors manager** (owner only) — approve/revoke editor role for signed-up users.

## Unit editor UX (priority)

A single-screen form with clear sections, designed so a non-technical admin can add or edit a unit in one pass:

1. **Basics** — name, slug (auto from name), photo upload, rarity, tier, short description.
2. **Base stats** — damage, range, speed, DPS, plus an "Add custom stat" button (label + value rows) for unit-specific stats.
3. **Upgrades** — a "Number of paths" toggle (1 or 2).
   - For each path: a label (e.g. "Path 1 — DPS"), then a repeatable list of upgrade levels. Each level row has: level number, cost, and the same stat fields as base (with custom-stat support), so the admin sees exactly how each stat changes per level.
   - "Add level" / "Remove level" buttons; drag to reorder.
4. **Save / Save and add another / Cancel**, with inline validation and a live preview panel showing how the public unit page will look.

## Data model (Lovable Cloud)

- `profiles` (id → auth.users, display_name, avatar)
- `app_role` enum: `owner`, `editor`, `viewer`
- `user_roles` (user_id, role) + `has_role()` security-definer function
- `units` (id, slug, name, photo_url, rarity, tier, description, base_stats jsonb, created_by, timestamps)
- `unit_upgrade_paths` (id, unit_id, path_index 1|2, label)
- `unit_upgrade_levels` (id, path_id, level, cost, stats jsonb)
- `summons` (id, slug, name, banner_url, description)
- `summon_entries` (id, summon_id, unit_id, drop_rate numeric)
- `chests` (id, slug, name, image_url, description)
- `chest_entries` (id, chest_id, unit_id, drop_rate numeric)
- Storage bucket `unit-images` (public read, editor write)

`base_stats` and per-level `stats` are JSONB so custom stats are trivial: `{ damage: 100, range: 5, speed: 1.2, "splash_radius": 3 }`.

## Access control

- Public read on all content tables (`anon` SELECT).
- Write/update/delete on content tables: `editor` or `owner` (RLS via `has_role`).
- `user_roles` writes: `owner` only. Owner is bootstrapped via a migration that grants the first signed-up email the owner role (or a manual SQL step you run once).
- Editors must be approved by the owner from the Editors manager before they can edit.

## Tech notes (for reference)

- TanStack Start routes as listed above; admin pages live under `_authenticated/`.
- TanStack Query for all reads; `createServerFn` only where we need privileged writes (role grants). Most CRUD goes directly through the Supabase client with RLS.
- Image uploads via Supabase Storage; previews handled client-side before upload.
- Validation with Zod on all forms.
- Design: clean, minimal, light theme with a warm carrot-orange accent and rarity color tokens (common/rare/epic/legendary/mythic). Semantic tokens in `src/styles.css`.

## Out of scope (this round)

- The Values page itself — placeholder "coming soon" tab on unit detail.
- Tier-list drag-and-drop, comments, change history, public submissions.
