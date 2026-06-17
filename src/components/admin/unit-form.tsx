import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugify, RARITIES } from "@/lib/utils-slug";
import { toast } from "sonner";

type StatRow = { key: string; value: string };
type LevelRow = { level: number; cost: string; stats: StatRow[] };
type PathRow = { label: string; levels: LevelRow[] };

const STANDARD_STATS = ["damage", "range", "speed", "dps"];

function emptyStats(): StatRow[] {
  return STANDARD_STATS.map((k) => ({ key: k, value: "" }));
}

function statsToObject(rows: StatRow[]): Record<string, string | number> {
  const obj: Record<string, string | number> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (!k || r.value === "") continue;
    const num = Number(r.value);
    obj[k] = Number.isFinite(num) && r.value.trim() !== "" && !isNaN(num) ? num : r.value;
  }
  return obj;
}

function statsFromObject(obj: any): StatRow[] {
  const base = emptyStats();
  if (!obj || typeof obj !== "object") return base;
  const seen = new Set(STANDARD_STATS);
  for (const k of STANDARD_STATS) {
    const v = obj[k];
    if (v !== undefined) base.find((r) => r.key === k)!.value = String(v);
  }
  const extras: StatRow[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (!seen.has(k)) extras.push({ key: k, value: String(v) });
  }
  return [...base, ...extras];
}

export function UnitForm({ unitId, onDone }: { unitId?: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [rarity, setRarity] = useState<string>("");
  const [tier, setTier] = useState<string>("");
  const [description, setDescription] = useState("");
  const [baseStats, setBaseStats] = useState<StatRow[]>(emptyStats());
  const [paths, setPaths] = useState<PathRow[]>([]);

  // Load existing unit
  const { data: existing } = useQuery({
    queryKey: ["unit-edit", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data: unit } = await supabase.from("units").select("*").eq("id", unitId!).maybeSingle();
      const { data: ps } = await supabase.from("unit_upgrade_paths").select("*").eq("unit_id", unitId!).order("path_index");
      const pathIds = (ps || []).map((p) => p.id);
      const { data: lvls } = pathIds.length
        ? await supabase.from("unit_upgrade_levels").select("*").in("path_id", pathIds).order("level")
        : { data: [] as any[] };
      return { unit, paths: ps || [], levels: lvls || [] };
    },
  });

  useEffect(() => {
    if (!existing?.unit) return;
    const u = existing.unit;
    setName(u.name); setSlug(u.slug); setSlugTouched(true);
    setPhotoUrl(u.photo_url || ""); setRarity(u.rarity || ""); setTier(u.tier || "");
    setDescription(u.description || "");
    setBaseStats(statsFromObject(u.base_stats));
    setPaths(existing.paths.map((p) => ({
      label: p.label || "",
      levels: existing.levels.filter((l) => l.path_id === p.id).sort((a,b) => a.level - b.level).map((l) => ({
        level: l.level, cost: l.cost != null ? String(l.cost) : "", stats: statsFromObject(l.stats),
      })),
    })));
  }, [existing]);

  useEffect(() => { if (!slugTouched) setSlug(slugify(name)); }, [name, slugTouched]);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !slug.trim()) throw new Error("Name and slug required");
      const payload = {
        name: name.trim(), slug: slug.trim(),
        photo_url: photoUrl.trim() || null,
        rarity: rarity || null, tier: tier.trim() || null,
        description: description.trim() || null,
        base_stats: statsToObject(baseStats),
      };
      let id = unitId;
      if (id) {
        const { error } = await supabase.from("units").update(payload).eq("id", id);
        if (error) throw error;
        await supabase.from("unit_upgrade_paths").delete().eq("unit_id", id);
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("units")
          .insert({ ...payload, created_by: u.user?.id }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      // Insert paths + levels
      for (let i = 0; i < paths.length; i++) {
        const p = paths[i];
        const { data: pathRow, error: pe } = await supabase.from("unit_upgrade_paths")
          .insert({ unit_id: id!, path_index: i + 1, label: p.label || null })
          .select("id").single();
        if (pe) throw pe;
        if (p.levels.length) {
          const { error: le } = await supabase.from("unit_upgrade_levels").insert(
            p.levels.map((l) => ({
              path_id: pathRow.id, level: l.level,
              cost: l.cost === "" ? null : Number(l.cost),
              stats: statsToObject(l.stats),
            }))
          );
          if (le) throw le;
        }
      }
    },
    onSuccess: () => {
      toast.success(unitId ? "Unit updated" : "Unit created");
      qc.invalidateQueries({ queryKey: ["units"] });
      qc.invalidateQueries({ queryKey: ["unit", slug] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  function setPathCount(n: number) {
    setPaths((cur) => {
      if (n === 0) return [];
      const out = [...cur];
      while (out.length < n) out.push({ label: "", levels: [] });
      return out.slice(0, n);
    });
  }

  return (
    <div className="space-y-6">
      {/* Basics */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Basics</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Carrot Knight" />
          </div>
          <div>
            <Label>Slug *</Label>
            <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="carrot-knight" />
          </div>
          <div className="md:col-span-2">
            <Label>Photo URL</Label>
            <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
            {photoUrl && <img src={photoUrl} alt="" className="mt-2 h-24 w-24 object-cover rounded border" />}
          </div>
          <div>
            <Label>Rarity</Label>
            <Select value={rarity} onValueChange={setRarity}>
              <SelectTrigger><SelectValue placeholder="Select rarity" /></SelectTrigger>
              <SelectContent>{RARITIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tier (optional)</Label>
            <Input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="S / A / 1 / 2..." />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
      </Card>

      {/* Base stats */}
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Base stats</h3>
        <p className="text-sm text-muted-foreground mb-4">Standard stats are pre-filled. Use "Add custom stat" for unit-specific stats like splash radius.</p>
        <StatsEditor rows={baseStats} setRows={setBaseStats} />
      </Card>

      {/* Upgrades */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Upgrade paths</h3>
            <p className="text-sm text-muted-foreground">Most units have 1 or 2 paths. Each level shows how stats change.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant={paths.length === 0 ? "default" : "outline"} size="sm" onClick={() => setPathCount(0)}>0 paths</Button>
            <Button type="button" variant={paths.length === 1 ? "default" : "outline"} size="sm" onClick={() => setPathCount(1)}>1 path</Button>
            <Button type="button" variant={paths.length === 2 ? "default" : "outline"} size="sm" onClick={() => setPathCount(2)}>2 paths</Button>
          </div>
        </div>

        <div className="space-y-6">
          {paths.map((p, pi) => (
            <div key={pi} className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="font-semibold">Path {pi + 1}</div>
                <Input className="max-w-xs" placeholder="Label (e.g. DPS path)" value={p.label}
                  onChange={(e) => setPaths(cur => cur.map((x, i) => i === pi ? { ...x, label: e.target.value } : x))} />
              </div>
              <div className="space-y-3">
                {p.levels.map((lvl, li) => (
                  <div key={li} className="rounded border bg-card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-xs">Level</Label>
                      <Input className="w-20" type="number" value={lvl.level}
                        onChange={(e) => updateLevel(pi, li, { level: Number(e.target.value) })} />
                      <Label className="text-xs">Cost</Label>
                      <Input className="w-32" type="number" value={lvl.cost}
                        onChange={(e) => updateLevel(pi, li, { cost: e.target.value })} />
                      <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => removeLevel(pi, li)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <StatsEditor rows={lvl.stats} setRows={(rows) => updateLevel(pi, li, { stats: typeof rows === "function" ? rows(lvl.stats) : rows })} compact />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addLevel(pi)}>
                  <Plus className="h-4 w-4 mr-1" /> Add level
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2 justify-end sticky bottom-4 bg-background/90 backdrop-blur p-3 rounded-lg border">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving..." : unitId ? "Save changes" : "Create unit"}
        </Button>
      </div>
    </div>
  );

  function updateLevel(pi: number, li: number, patch: Partial<LevelRow>) {
    setPaths(cur => cur.map((p, i) => i !== pi ? p : { ...p, levels: p.levels.map((l, j) => j === li ? { ...l, ...patch } : l) }));
  }
  function removeLevel(pi: number, li: number) {
    setPaths(cur => cur.map((p, i) => i !== pi ? p : { ...p, levels: p.levels.filter((_, j) => j !== li) }));
  }
  function addLevel(pi: number) {
    setPaths(cur => cur.map((p, i) => {
      if (i !== pi) return p;
      const nextLvl = p.levels.length ? Math.max(...p.levels.map(l => l.level)) + 1 : 1;
      return { ...p, levels: [...p.levels, { level: nextLvl, cost: "", stats: emptyStats() }] };
    }));
  }
}

function StatsEditor({ rows, setRows, compact }: { rows: StatRow[]; setRows: React.Dispatch<React.SetStateAction<StatRow[]>>; compact?: boolean }) {
  return (
    <div className="space-y-2">
      <div className={`grid gap-2 ${compact ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {rows.map((r, i) => {
          const isStandard = STANDARD_STATS.includes(r.key) && i < STANDARD_STATS.length;
          return (
            <div key={i} className="flex gap-2 items-center">
              <Input className="flex-1" value={r.key} disabled={isStandard}
                onChange={(e) => setRows(cur => cur.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                placeholder="stat name" />
              <Input className="flex-1" value={r.value}
                onChange={(e) => setRows(cur => cur.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                placeholder="value" />
              {!isStandard && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setRows(cur => cur.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => setRows(cur => [...cur, { key: "", value: "" }])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add custom stat
      </Button>
    </div>
  );
}
