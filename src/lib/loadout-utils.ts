import { supabase } from "@/integrations/supabase/client";

export type StatsMap = Record<string, string | number>;

export interface ResolvedUnit {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  rarity: string | null;
  stats: StatsMap; // gameplay stats (damage, range, cooldown, etc) — "cost" here is always placement cost
  placementCost: number; // cost to place the unit (never changes with upgrades)
  upgradeCost: number; // cumulative cost spent on upgrades to reach the selected level
  totalCost: number; // placementCost + upgradeCost
  missingPlacement: boolean;
  placementValue: number;
}

export async function fetchUnitWithUpgrades(unitId: string) {
  const { data: unit, error } = await supabase.from("units").select("*").eq("id", unitId).maybeSingle();
  if (error) throw error;
  const { data: paths } = await supabase
    .from("unit_upgrade_paths")
    .select("*")
    .eq("unit_id", unitId)
    .order("path_index");
  const pathIds = (paths || []).map((p: any) => p.id);
  const { data: levels } = pathIds.length
    ? await supabase.from("unit_upgrade_levels").select("*").in("path_id", pathIds).order("level")
    : { data: [] as any[] };
  return { unit, paths: paths || [], levels: levels || [] };
}

function getPlacement(stats: StatsMap): { value: number; missing: boolean } {
  const raw = stats["Placement"] ?? stats["Placement Limit"];
  if (raw === undefined || raw === null) return { value: 1, missing: true };
  const num = Number(raw);
  return { value: Number.isFinite(num) && num > 0 ? num : 1, missing: !Number.isFinite(num) };
}

export function resolveUnitStats(
  unit: any,
  paths: any[],
  levels: any[],
  selection: { pathIndex: number | null; level: number }
): ResolvedUnit {
  const placementCost = Number(unit.base_stats?.["cost"] ?? 0) || 0;
  let stats: StatsMap = { ...(unit.base_stats || {}) };
  let upgradeCost = 0;

  if (selection.pathIndex !== null && selection.level > 0) {
    const path = paths.find((p) => p.path_index === selection.pathIndex);
    if (path) {
      const pathLevels = levels
        .filter((l) => l.path_id === path.id && l.level <= selection.level)
        .sort((a, b) => a.level - b.level);
      for (const lvl of pathLevels) {
        const { cost: levelUpgradeCost, ...rest } = lvl.stats || {};
        stats = { ...stats, ...rest }; // merge everything EXCEPT cost (cost is an upgrade price, not a stat override)
        upgradeCost += Number(levelUpgradeCost ?? 0) || 0;
      }
    }
  }

  stats["cost"] = placementCost; // always the real placement cost, never overridden by a level's upgrade price

  const { value, missing } = getPlacement(stats);

  return {
    id: unit.id,
    name: unit.name,
    slug: unit.slug,
    photo_url: unit.photo_url,
    rarity: unit.rarity,
    stats,
    placementCost,
    upgradeCost,
    totalCost: placementCost + upgradeCost,
    missingPlacement: missing,
    placementValue: value,
  };
}

/** Returns all level rows for a path. "cost" shown per row is that level's upgrade price (not merged), every other stat is cumulative. */
export function levelBreakdown(unit: any, paths: any[], levels: any[], pathIndex: number) {
  const path = paths.find((p) => p.path_index === pathIndex);
  if (!path) return [];
  const pathLevels = levels.filter((l) => l.path_id === path.id).sort((a, b) => a.level - b.level);
  let running: StatsMap = { ...(unit.base_stats || {}) };
  const baseCost = Number(unit.base_stats?.["cost"] ?? 0) || 0;
  const rows: { level: number; stats: StatsMap; upgradeCost: number }[] = [{ level: 0, stats: { ...running, cost: baseCost }, upgradeCost: 0 }];
  for (const lvl of pathLevels) {
    const { cost: levelUpgradeCost, ...rest } = lvl.stats || {};
    running = { ...running, ...rest };
    rows.push({ level: lvl.level, stats: { ...running, cost: baseCost }, upgradeCost: Number(levelUpgradeCost ?? 0) || 0 });
  }
  return rows;
}

export interface SlotForTotals {
  resolved: ResolvedUnit;
  placementCount: number;
}

export interface LoadoutTotals {
  totalDamage: number;
  totalCost: number;
  missingPlacementUnits: string[];
}

export function computeLoadoutTotals(slots: SlotForTotals[]): LoadoutTotals {
  let totalDamage = 0;
  let totalCost = 0;
  const missingPlacementUnits: string[] = [];

  for (const { resolved: u, placementCount } of slots) {
    const damage = Number(u.stats["damage"] ?? 0) || 0;
    totalDamage += damage * placementCount;
    totalCost += u.totalCost * placementCount;
    if (u.missingPlacement) missingPlacementUnits.push(u.name);
  }

  return { totalDamage, totalCost, missingPlacementUnits };
}
