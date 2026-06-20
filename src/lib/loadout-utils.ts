import { supabase } from "@/integrations/supabase/client";

export type StatsMap = Record<string, string | number>;

export interface ResolvedUnit {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  rarity: string | null;
  stats: StatsMap;
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
  return { value: Number.isFinite(num) ? num : 1, missing: !Number.isFinite(num) };
}

export function resolveUnitStats(
  unit: any,
  paths: any[],
  levels: any[],
  selection: { pathIndex: number | null; level: number }
): ResolvedUnit {
  let stats: StatsMap = { ...(unit.base_stats || {}) };

  if (selection.pathIndex !== null && selection.level > 0) {
    const path = paths.find((p) => p.path_index === selection.pathIndex);
    if (path) {
      const pathLevels = levels
        .filter((l) => l.path_id === path.id && l.level <= selection.level)
        .sort((a, b) => a.level - b.level);
      for (const lvl of pathLevels) {
        stats = { ...stats, ...(lvl.stats || {}) };
      }
    }
  }

  const { value, missing } = getPlacement(stats);

  return {
    id: unit.id,
    name: unit.name,
    slug: unit.slug,
    photo_url: unit.photo_url,
    rarity: unit.rarity,
    stats,
    missingPlacement: missing,
    placementValue: value,
  };
}

export interface LoadoutTotals {
  totalDamage: number;
  totalCost: number;
  missingPlacementUnits: string[];
  perUnitDamage: Record<string, number>;
}

export function computeLoadoutTotals(resolved: ResolvedUnit[]): LoadoutTotals {
  let totalDamage = 0;
  let totalCost = 0;
  const missingPlacementUnits: string[] = [];
  const perUnitDamage: Record<string, number> = {};

  for (const u of resolved) {
    const damage = Number(u.stats["damage"] ?? 0) || 0;
    const cost = Number(u.stats["cost"] ?? 0) || 0;
    const effectiveDamage = damage * u.placementValue;
    perUnitDamage[u.id] = effectiveDamage;
    totalDamage += effectiveDamage;
    totalCost += cost;
    if (u.missingPlacement) missingPlacementUnits.push(u.name);
  }

  return { totalDamage, totalCost, missingPlacementUnits, perUnitDamage };
}
