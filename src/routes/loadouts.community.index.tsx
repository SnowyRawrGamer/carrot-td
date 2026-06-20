import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Carrot, ChevronUp, ChevronDown } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/loadouts/community/")({
  head: () => ({ meta: [{ title: "Community Loadouts — Carrot TD Values" }] }),
  component: CommunityLoadouts,
});

function CommunityLoadouts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sort, setSort] = useState<"newest" | "popular">("newest");

  const { data: loadouts } = useQuery({
    queryKey: ["community-loadouts"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
  .from("public_loadouts")
  .select("id, title, description, created_at, display_name")
  .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (rows || []).map((r) => r.id);
      const { data: scores } = ids.length
        ? await supabase.from("community_loadout_scores").select("*").in("loadout_id", ids)
        : { data: [] as any[] };
      const scoreMap: Record<string, number> = {};
      for (const s of scores || []) scoreMap[s.loadout_id] = s.score;

      const { data: units } = ids.length
        ? await supabase.from("community_loadout_units").select("loadout_id, slot_index, unit:units(name, photo_url, rarity)").in("loadout_id", ids).order("slot_index")
        : { data: [] as any[] };
      const unitsMap: Record<string, any[]> = {};
      for (const u of units || []) {
        if (!unitsMap[u.loadout_id]) unitsMap[u.loadout_id] = [];
        unitsMap[u.loadout_id].push(u.unit);
      }

      let myVotes: Record<string, number> = {};
      if (user) {
        const { data: votes } = await supabase.from("community_loadout_votes").select("loadout_id, vote").eq("user_id", user.id);
        for (const v of votes || []) myVotes[v.loadout_id] = v.vote;
      }

      return (rows || []).map((r: any) => ({
        ...r,
        score: scoreMap[r.id] || 0,
        units: unitsMap[r.id] || [],
        myVote: myVotes[r.id] || 0,
        displayName: r.show_real_name ? (r.profiles?.display_name || r.profiles?.email || "Unknown") : r.custom_display_name || "Anonymous",
      }));
    },
  });

  const vote = useMutation({
    mutationFn: async ({ loadoutId, value }: { loadoutId: string; value: number }) => {
      if (!user) throw new Error("Sign in to vote.");
      const existing = loadouts?.find((l) => l.id === loadoutId)?.myVote || 0;
      if (existing === value) {
        await supabase.from("community_loadout_votes").delete().eq("loadout_id", loadoutId).eq("user_id", user.id);
      } else {
        await supabase.from("community_loadout_votes").upsert({ loadout_id: loadoutId, user_id: user.id, vote: value });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-loadouts"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const sorted = [...(loadouts || [])].sort((a, b) =>
    sort === "popular" ? b.score - a.score : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Community Loadouts</h1>
          <p className="text-muted-foreground text-sm mt-1">Loadouts shared and voted on by the community.</p>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "popular")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {sorted.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center shrink-0">
                <button onClick={() => (user ? vote.mutate({ loadoutId: l.id, value: 1 }) : toast.error("Sign in to vote."))}>
                  <ChevronUp className={`h-5 w-5 ${l.myVote === 1 ? "text-primary" : "text-muted-foreground"}`} />
                </button>
                <span className={`text-sm font-bold ${l.score > 0 ? "text-primary" : l.score < 0 ? "text-destructive" : ""}`}>
                  {l.score > 0 ? `+${l.score}` : l.score}
                </span>
                <button onClick={() => (user ? vote.mutate({ loadoutId: l.id, value: -1 }) : toast.error("Sign in to vote."))}>
                  <ChevronDown className={`h-5 w-5 ${l.myVote === -1 ? "text-destructive" : "text-muted-foreground"}`} />
                </button>
              </div>

              <Link to="/loadouts/community/$id" params={{ id: l.id }} className="flex-1 min-w-0">
                <div className="font-semibold">{l.title}</div>
                <div className="text-xs text-muted-foreground mb-2">by {l.displayName}</div>
                <div className="flex gap-1">
                  {l.units.map((u: any, i: number) => (
                    <div key={i} className="h-10 w-10 rounded-md bg-muted overflow-hidden">
                      {u?.photo_url ? <img src={u.photo_url} alt={u.name} className="h-full w-full object-contain" /> : <Carrot className="h-4 w-4 m-auto mt-3 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              </Link>
            </div>
          </Card>
        ))}
        {sorted.length === 0 && <Card className="p-8 text-center text-muted-foreground">No community loadouts yet.</Card>}
      </div>
    </Page>
  );
}
