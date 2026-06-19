import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Carrot, Search } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { rarityClass, RARITIES } from "@/lib/utils-slug";

export const Route = createFileRoute("/units/")({
  head: () => ({
    meta: [
      { title: "Units — Carrot TD Values" },
      { name: "description", content: "Browse all Carrot TD units with stats, rarities, and upgrade paths." },
    ],
  }),
  component: UnitsPage,
});

type SortMode = "alphabetical" | "newest" | "rarity";

const RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  "ultra-rare": 3,
};

function UnitsPage() {
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<string>("All");
  const [sort, setSort] = useState<SortMode>("alphabetical");

  const { data: units, isLoading } = useQuery({
    queryKey: ["units", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, slug, name, photo_url, rarity, tier")
        .order("name");
      if (error) throw error;

      const ids = (data || []).map((u) => u.id);
      let addedDates: Record<string, string> = {};
      if (ids.length) {
        const { data: links } = await supabase
          .from("update_units")
          .select("unit_id, updates(released_at)")
          .in("unit_id", ids);
        for (const l of links || []) {
          const released = (l as any).updates?.released_at;
          if (released && (!addedDates[l.unit_id] || released > addedDates[l.unit_id])) {
            addedDates[l.unit_id] = released;
          }
        }
      }
      return (data || []).map((u) => ({ ...u, added_at: addedDates[u.id] || null }));
    },
  });

  const filtered = (units || []).filter((u) => {
    if (rarity !== "All" && (u.rarity || "").toLowerCase() !== rarity.toLowerCase()) return false;
    if (q && !u.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "alphabetical") return a.name.localeCompare(b.name);
    if (sort === "newest") {
      if (!a.added_at && !b.added_at) return 0;
      if (!a.added_at) return 1;
      if (!b.added_at) return -1;
      return b.added_at.localeCompare(a.added_at);
    }
    if (sort === "rarity") {
      const ra = RARITY_ORDER[(a.rarity || "").toLowerCase()] ?? -1;
      const rb = RARITY_ORDER[(b.rarity || "").toLowerCase()] ?? -1;
      return ra - rb;
    }
    return 0;
  });

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Units</h1>
          <p className="text-muted-foreground text-sm mt-1">{units?.length || 0} units in the database</p>
        </div>
        <div className="flex gap-2 items-center w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search units..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rarity">Rarity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {["All", ...RARITIES].map((r) => (
          <button
            key={r}
            onClick={() => setRarity(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              rarity === r ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"
            }`}
          >{r}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : sorted.length === 0 ? (
        <Card className="p-12 text-center">
          <Carrot className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="mt-3 font-medium">No units found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {units?.length === 0 ? "Add the first unit from the Admin panel." : "Try a different search or filter."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {sorted.map((u) => (
            <Link key={u.id} to="/units/$slug" params={{ slug: u.slug }} className="group">
              <Card className="overflow-hidden p-0 hover:shadow-md hover:border-primary/40 transition">
                <div className="aspect-square bg-muted">
                  {u.photo_url ? (
                    <img src={u.photo_url} alt={u.name} className="h-full w-full object-contain group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-muted-foreground"><Carrot className="h-8 w-8" /></div>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-semibold text-sm truncate">{u.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {u.rarity && (
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${rarityClass(u.rarity)}`}>{u.rarity}</span>
                    )}
                    {u.tier && (
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-muted text-muted-foreground">Tier {u.tier}</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
