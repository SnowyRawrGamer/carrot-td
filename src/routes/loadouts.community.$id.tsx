import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Carrot, ArrowLeft, ChevronUp, ChevronDown } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchUnitWithUpgrades, resolveUnitStats, computeLoadoutTotals, type ResolvedUnit } from "@/lib/loadout-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/loadouts/community/$id")({
  component: CommunityLoadoutDetail,
});

function CommunityLoadoutDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [overrides, setOverrides] = useState<Record<string, { pathIndex: number | null; level: number }>>({});
  const [resolvedMap, setResolvedMap] = useState<Record<string, ResolvedUnit>>({});
  const [unitMeta, setUnitMeta] = useState<Record<string, { unit: any; paths: any[]; levels: any[] }>>({});

  const { data } = useQuery({
    queryKey: ["community-loadout", id],
    queryFn: async () => {
      const { data: loadout, error } = await supabase
        .from("public_loadouts")
        .select("id, title, description, display_name")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: links } = await supabase
        .from("community_loadout_units")
        .select("unit_id, path_index, level, slot_index")
        .eq("loadout_id", id)
        .order("slot_index");

      const { data: score } = await supabase.from("community_loadout_scores").select("score").eq("loadout_id", id).maybeSingle();

      let myVote = 0;
      if (user) {
        const { data: v } = await supabase.from("community_loadout_votes").select("vote").eq("loadout_id", id).eq("user_id", user.id).maybeSingle();
        myVote = v?.vote || 0;
      }

      return { loadout, links: links || [], score: score?.score || 0, myVote };
    },
  });

  useEffect(() => {
    if (!data) return;
    (async () => {
      const meta: Record<string, any> = {};
      const initOverrides: Record<string, { pathIndex: number | null; level: number }> = {};
      const resolved: Record<string, ResolvedUnit> = {};
      for (const link of data.links) {
        const { unit, paths, levels } = await fetchUnitWithUpgrades(link.unit_id);
        meta[link.unit_id] = { unit, paths, levels };
        initOverrides[link.unit_id] = { pathIndex: link.path_index, level: link.level };
        resolved[link.unit_id] = resolveUnitStats(unit, paths, levels, { pathIndex: link.path_index, level: link.level });
      }
      setUnitMeta(meta);
      setOverrides(initOverrides);
      setResolvedMap(resolved);
    })();
  }, [data]);

  function updateSelection(unitId: string, pathIndex: number | null, level: number) {
    const meta = unitMeta[unitId];
    if (!meta) return;
    setOverrides((prev) => ({ ...prev, [unitId]: { pathIndex, level } }));
    setResolvedMap((prev) => ({ ...prev, [unitId]: resolveUnitStats(meta.unit, meta.paths, meta.levels, { pathIndex, level }) }));
  }

  const vote = useMutation({
    mutationFn: async (value: number) => {
      if (!user) throw new Error("Sign in to vote.");
      if (data?.myVote === value) {
        await supabase.from("community_loadout_votes").delete().eq("loadout_id", id).eq("user_id", user.id);
      } else {
        await supabase.from("community_loadout_votes").upsert({ loadout_id: id, user_id: user.id, vote: value });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-loadout", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (!data) return <Page><div className="text-muted-foreground">Loading...</div></Page>;
  const { loadout, score, myVote } = data;
  const resolvedList = Object.values(resolvedMap);
  const totals = computeLoadoutTotals(resolvedList as any);

  return (
    <Page>
      <Link to="/loadouts/community" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> All community loadouts
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div className="flex flex-col items-center shrink-0 pt-1">
          <button onClick={() => (user ? vote.mutate(1) : toast.error("Sign in to vote."))}>
            <ChevronUp className={`h-6 w-6 ${myVote === 1 ? "text-primary" : "text-muted-foreground"}`} />
          </button>
          <span className={`text-sm font-bold ${score > 0 ? "text-primary" : score < 0 ? "text-destructive" : ""}`}>{score > 0 ? `+${score}` : score}</span>
          <button onClick={() => (user ? vote.mutate(-1) : toast.error("Sign in to vote."))}>
            <ChevronDown className={`h-6 w-6 ${myVote === -1 ? "text-destructive" : "text-muted-foreground"}`} />
          </button>
        </div>
        <div>
          <h1 className="text-3xl font-bold">{loadout.title}</h1>
          <p className="text-sm text-muted-foreground">by {loadout.display_name}</p>
          {loadout.description && <p className="mt-3 text-sm">{loadout.description}</p>}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {Object.entries(unitMeta).map(([unitId, meta]) => {
          const sel = overrides[unitId] || { pathIndex: null, level: 0 };
          const resolved = resolvedMap[unitId];
          return (
            <Card key={unitId} className="p-4 flex flex-wrap items-center gap-3">
              <div className="h-14 w-14 rounded-md bg-muted overflow-hidden shrink-0">
                {meta.unit.photo_url ? <img src={meta.unit.photo_url} alt="" className="h-full w-full object-contain" /> : <Carrot className="h-6 w-6 m-auto mt-4 text-muted-foreground" />}
              </div>
              <div className="font-medium w-32 truncate">{meta.unit.name}</div>

              {meta.paths.length > 0 && (
                <Select value={sel.pathIndex === null ? "base" : String(sel.pathIndex)} onValueChange={(v) => updateSelection(unitId, v === "base" ? null : Number(v), v === "base" ? 0 : 1)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    {meta.paths.map((p: any) => <SelectItem key={p.id} value={String(p.path_index)}>Path {p.path_index}{p.label ? ` — ${p.label}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {sel.pathIndex !== null && (
                <Select value={String(sel.level)} onValueChange={(v) => updateSelection(unitId, sel.pathIndex, Number(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(1, meta.levels.filter((l: any) => l.path_id === meta.paths.find((p: any) => p.path_index === sel.pathIndex)?.id).length) }, (_, i) => i + 1).map((lvl) => (
                      <SelectItem key={lvl} value={String(lvl)}>Level {lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {resolved && (
                <div className="flex gap-3 text-xs text-muted-foreground ml-auto">
                  <span>DMG {String(resolved.stats["damage"] ?? "—")}</span>
                  <span>Placement {resolved.missingPlacement ? "1 (assumed)" : resolved.placementValue}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {totals.missingPlacementUnits.length > 0 && (
        <Card className="p-4 mb-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Error: {totals.missingPlacementUnits.join(", ")} missing placement stats — assumed 1.
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-semibold mb-2">Totals</h2>
        <div className="flex gap-6 text-sm">
          <div><span className="text-muted-foreground">Total damage:</span> <span className="font-semibold">{totals.totalDamage}</span></div>
          <div><span className="text-muted-foreground">Total cost:</span> <span className="font-semibold">{totals.totalCost}</span></div>
        </div>
      </Card>
    </Page>
  );
}
