import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Carrot, ArrowLeft } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { rarityClass } from "@/lib/utils-slug";

export const Route = createFileRoute("/units/$slug")({
  component: UnitDetail,
  notFoundComponent: () => (
    <Page><Card className="p-8 text-center">Unit not found. <Link to="/units" className="text-primary underline">Back to units</Link></Card></Page>
  ),
});

type StatsMap = Record<string, string | number>;

function fmtDate(d?: string | null) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
}

function UnitDetail() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["unit", slug],
    queryFn: async () => {
      const { data: unit, error } = await supabase
        .from("units").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!unit) throw notFound();
      const { data: paths } = await supabase
        .from("unit_upgrade_paths").select("*").eq("unit_id", unit.id).order("path_index");
      const pathIds = (paths || []).map((p) => p.id);
      const { data: levels } = pathIds.length
        ? await supabase.from("unit_upgrade_levels").select("*").in("path_id", pathIds).order("level")
        : { data: [] as any[] };
      const { data: updateLinks } = await supabase
        .from("update_units")
        .select("update:updates(id, slug, name, released_at)")
        .eq("unit_id", unit.id);
      const addedIn = (updateLinks || [])
        .map((r: any) => r.update)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.released_at || "").localeCompare(b.released_at || ""))[0] || null;

      let removedIn = null;
      if (unit.removed_update_id) {
        const { data: ru } = await supabase.from("updates").select("id, slug, name, released_at").eq("id", unit.removed_update_id).maybeSingle();
        removedIn = ru;
      }
      return { unit, paths: paths || [], levels: levels || [], addedIn, removedIn };
    },
  });

  if (isLoading) return <Page><div className="text-muted-foreground">Loading...</div></Page>;
  if (!data) return null;
  const { unit, paths, levels, addedIn, removedIn } = data;
  const baseStats = (unit.base_stats || {}) as StatsMap;
  const addedDate = fmtDate(addedIn?.released_at);
  const removedDate = fmtDate(removedIn?.released_at);

  return (
    <Page>
      <Link to="/units" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> All units
      </Link>

      {(addedIn || removedIn) && (
        <Card className="p-3 mb-4 bg-primary/5 border-primary/30 text-sm space-y-1">
          {addedIn && (
            <p>
              This unit was added on{" "}
              <Link to="/updates/$slug" params={{ slug: addedIn.slug }} className="font-semibold text-primary hover:underline">
                {addedIn.name}
              </Link>
              {addedDate ? ` (${addedDate})` : ""}
              {removedIn && " and"}
              {removedIn && (
                <>
                  {" "}removed on{" "}
                  <Link to="/updates/$slug" params={{ slug: removedIn.slug }} className="font-semibold text-primary hover:underline">
                    {removedIn.name}
                  </Link>
                  {removedDate ? ` (${removedDate})` : ""}
                </>
              )}
              .
            </p>
          )}
          {!addedIn && removedIn && (
            <p>
              This unit was removed on{" "}
              <Link to="/updates/$slug" params={{ slug: removedIn.slug }} className="font-semibold text-primary hover:underline">
                {removedIn.name}
              </Link>
              {removedDate ? ` (${removedDate})` : ""}.
            </p>
          )}
          {removedIn && (
            <p className="text-muted-foreground text-xs">Removed units are still available in trading.</p>
          )}
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="aspect-square bg-muted">
            {unit.photo_url ? (
              <img src={unit.photo_url} alt={unit.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-muted-foreground"><Carrot className="h-16 w-16" /></div>
            )}
          </div>
          <div className="p-4">
            <h1 className="text-2xl font-bold">{unit.name}</h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {unit.rarity && <span className={`text-xs px-2 py-0.5 rounded border ${rarityClass(unit.rarity)}`}>{unit.rarity}</span>}
              {unit.tier && <span className="text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground">Tier {unit.tier}</span>}
              {removedIn && <span className="text-xs px-2 py-0.5 rounded border bg-destructive/10 text-destructive border-destructive/30">Removed</span>}
            </div>
            {unit.description && <p className="text-sm text-muted-foreground mt-3">{unit.description}</p>}
          </div>
        </Card>

        <div>
          <Tabs defaultValue="stats">
            <TabsList>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
              <TabsTrigger value="values">Values</TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="mt-4">
              <Card className="p-5">
                <h2 className="font-semibold mb-3">Base stats</h2>
                {Object.keys(baseStats).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No stats added.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(baseStats).map(([k, v]) => (
                      <div key={k} className="rounded-lg border p-3">
                        <div className="text-xs uppercase text-muted-foreground tracking-wide">{k}</div>
                        <div className="text-lg font-semibold">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="upgrades" className="mt-4 space-y-4">
              {paths.length === 0 ? (
                <Card className="p-5 text-sm text-muted-foreground">No upgrade paths added.</Card>
              ) : paths.map((p) => {
                const pathLevels = levels.filter((l) => l.path_id === p.id);
                const allStatKeys = Array.from(new Set([
                  ...Object.keys(baseStats),
                  ...pathLevels.flatMap((l) => Object.keys((l.stats || {}) as StatsMap)),
                ])).filter((k) => k !== "cost");
                const baseCost = (baseStats as any).cost;
                return (
                  <Card key={p.id} className="p-5">
                    <h3 className="font-semibold mb-3">Path {p.path_index}{p.label ? ` — ${p.label}` : ""}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Level</th>
                            <th className="py-2 pr-3 font-medium">Cost</th>
                            {allStatKeys.map((k) => <th key={k} className="py-2 pr-3 font-medium capitalize">{k}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b bg-muted/30">
                            <td className="py-2 pr-3 font-semibold">0</td>
                            <td className="py-2 pr-3">{baseCost != null ? String(baseCost) : "—"}</td>
                            {allStatKeys.map((k) => <td key={k} className="py-2 pr-3">{baseStats[k] != null ? String(baseStats[k]) : "—"}</td>)}
                          </tr>
                          {pathLevels.map((l) => {
                            const stats = (l.stats || {}) as StatsMap;
                            return (
                              <tr key={l.id} className="border-b last:border-0">
                                <td className="py-2 pr-3 font-semibold">{l.level}</td>
                                <td className="py-2 pr-3">{l.cost ?? "—"}</td>
                                {allStatKeys.map((k) => <td key={k} className="py-2 pr-3">{stats[k] != null ? String(stats[k]) : "—"}</td>)}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="values" className="mt-4">
              <Card className="p-10 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                  <Carrot className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Values — coming soon</h3>
                <p className="text-sm text-muted-foreground mt-1">Trade values will live here.</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Page>
  );
}
