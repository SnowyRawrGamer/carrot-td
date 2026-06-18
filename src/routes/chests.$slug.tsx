import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Carrot } from "lucide-react";
import { useState } from "react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { rarityClass } from "@/lib/utils-slug";

export const Route = createFileRoute("/chests/$slug")({
  component: ChestDetail,
});

function weightedRoll(entries: any[]) {
  const total = entries.reduce((s, e) => s + Number(e.drop_rate || 0), 0);
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= Number(e.drop_rate || 0);
    if (roll <= 0) return e.unit;
  }
  return entries[entries.length - 1]?.unit;
}

function ChestDetail() {
  const { slug } = Route.useParams();
  const [results, setResults] = useState<any[] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["chest", slug],
    queryFn: async () => {
      const { data: chest, error } = await supabase.from("chests").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!chest) return null;
      const { data: entries } = await supabase
        .from("chest_entries")
        .select("drop_rate, unit:units(id, slug, name, photo_url, rarity, tier)")
        .eq("chest_id", chest.id);
      return { chest, entries: (entries || []) as any[] };
    },
  });

  if (isLoading) return <Page><div className="text-muted-foreground">Loading...</div></Page>;
  if (!data) return <Page><Card className="p-8 text-center">Chest not found.</Card></Page>;
  const { chest, entries } = data;
  const total = entries.reduce((s, e) => s + Number(e.drop_rate || 0), 0);
  const sorted = [...entries].sort((a, b) => Number(b.drop_rate) - Number(a.drop_rate));
  const canSimulate = entries.length > 0;

  function rollOne() { setResults([weightedRoll(entries)]); }
  function rollTen() { setResults(Array.from({ length: 10 }, () => weightedRoll(entries))); }

  return (
    <Page>
      <Link to="/chests" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> All chests
      </Link>
      <Card className="overflow-hidden p-0 mb-6">
        <div className="aspect-[21/9] bg-muted">
          {chest.image_url ? <img src={chest.image_url} alt={chest.name} className="h-full w-full object-contain" /> :
            <div className="h-full w-full grid place-items-center text-muted-foreground"><Package className="h-12 w-12" /></div>}
        </div>
        <div className="p-5">
          <h1 className="text-2xl font-bold">{chest.name}</h1>
          {chest.description && <p className="text-muted-foreground mt-1">{chest.description}</p>}
        </div>
      </Card>

      {canSimulate && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-3">Simulate Chest</h2>
          <div className="flex gap-2 mb-4">
            <Button onClick={rollOne}>Single Pull</Button>
            <Button variant="outline" onClick={rollTen}>10 Pull</Button>
            {results && <Button variant="ghost" onClick={() => setResults(null)}>Clear</Button>}
          </div>
          {results && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {results.map((unit, i) => {
                const entry = entries.find((e) => e.unit?.id === unit.id);
                return unit && (
                  <Link key={i} to="/units/$slug" params={{ slug: unit.slug }}>
                    <div className="rounded-lg border bg-muted/30 p-2 text-center hover:border-primary/40 transition">
                      <div className="h-16 w-full rounded-md bg-muted overflow-hidden mb-2">
                        {unit.photo_url
                          ? <img src={unit.photo_url} alt="" className="h-full w-full object-contain" />
                          : <div className="h-full w-full grid place-items-center text-muted-foreground"><Package className="h-6 w-6" /></div>}
                      </div>
                      <div className="text-xs font-medium truncate">{unit.name}</div>
                      {unit.rarity && <span className={`text-[10px] px-1 py-0.5 rounded border ${rarityClass(unit.rarity)}`}>{unit.rarity}</span>}
                      {entry && <div className="text-[10px] text-muted-foreground mt-0.5">{Number(entry.drop_rate).toFixed(2)}%</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold">Contents ({entries.length} units)</h2>
          <span className="text-sm text-muted-foreground">Total: {total.toFixed(2)}%</span>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No units in this chest yet.</p>
        ) : (
          <div className="divide-y">
            {sorted.map((e, i) => e.unit && (
              <Link key={i} to="/units/$slug" params={{ slug: e.unit.slug }} className="flex items-center gap-3 py-3 hover:bg-accent/50 -mx-2 px-2 rounded">
                <div className="h-12 w-12 rounded-md bg-muted overflow-hidden shrink-0">
                  {e.unit.photo_url ? <img src={e.unit.photo_url} alt="" className="h-full w-full object-cover" /> :
                    <div className="h-full w-full grid place-items-center text-muted-foreground"><Carrot className="h-5 w-5" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{e.unit.name}</div>
                  {e.unit.rarity && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rarityClass(e.unit.rarity)}`}>{e.unit.rarity}</span>}
                </div>
                <div className="font-semibold tabular-nums">{Number(e.drop_rate).toFixed(2)}%</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}
