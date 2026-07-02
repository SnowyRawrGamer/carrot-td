import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X, Trash2, Carrot, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export function LoadoutsManager() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: loadouts, error: queryError } = useQuery({
    queryKey: ["admin-loadouts"],
    queryFn: async () => {
      // Fetch loadouts first. We don't join profiles here to avoid RLS-induced join failures
      // that might omit rows if the join target isn't readable.
      const { data: rawLoadouts, error: lError } = await supabase
        .from("community_loadouts")
        .select("id, title, description, status, created_at, show_real_name, custom_display_name, creator_id")
        .order("created_at", { ascending: false });
      
      if (lError) throw lError;
      if (!rawLoadouts) return [];

      const loadoutIds = rawLoadouts.map((l) => l.id);
      const creatorIds = Array.from(new Set(rawLoadouts.map((l) => l.creator_id).filter(Boolean)));

      // Fetch units and profiles in parallel
      const [unitsRes, profilesRes] = await Promise.all([
        loadoutIds.length 
          ? supabase
              .from("community_loadout_units")
              .select("loadout_id, slot_index, path_index, level, placement_count, unit:units(name, photo_url, rarity)")
              .in("loadout_id", loadoutIds)
              .order("slot_index")
          : Promise.resolve({ data: [] }),
        creatorIds.length
          ? supabase
              .from("profiles")
              .select("id, display_name")
              .in("id", creatorIds)
          : Promise.resolve({ data: [] })
      ]);

      const unitsMap: Record<string, any[]> = {};
      for (const u of unitsRes.data || []) {
        if (!unitsMap[u.loadout_id]) unitsMap[u.loadout_id] = [];
        unitsMap[u.loadout_id].push(u);
      }

      const profilesMap: Record<string, any> = {};
      for (const p of profilesRes.data || []) {
        profilesMap[p.id] = p;
      }

      return rawLoadouts.map((l) => ({ 
        ...l, 
        units: unitsMap[l.id] || [],
        profiles: profilesMap[l.creator_id] || null
      }));
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("community_loadouts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-loadouts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_loadouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-loadouts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (queryError) {
    return (
      <div className="p-4 border border-destructive/50 bg-destructive/5 rounded-lg text-destructive">
        <p className="font-bold">Error loading loadouts:</p>
        <p className="text-sm">{(queryError as any).message}</p>
      </div>
    );
  }

  const pending = (loadouts || []).filter((l) => l.status === "pending");
  const approved = (loadouts || []).filter((l) => l.status === "approved");

  function Row({ l }: { l: any }) {
    const creatorInfo = l.profiles?.display_name || l.profiles?.email || "Unknown User";
    const who = l.show_real_name ? creatorInfo : (l.custom_display_name || "Anonymous");
    const isOpen = expanded === l.id;
    return (
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(isOpen ? null : l.id)} className="flex-1 min-w-0 text-left flex items-center gap-2">
            {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            <div>
              <div className="font-medium truncate">{l.title}</div>
              <div className="text-xs text-muted-foreground truncate">by {who} · {new Date(l.created_at).toLocaleDateString()}</div>
            </div>
          </button>
          {l.status === "pending" ? (
            <>
              <Button size="sm" onClick={() => setStatus.mutate({ id: l.id, status: "approved" })}><Check className="h-4 w-4 mr-1" /> Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: l.id, status: "rejected" })}><X className="h-4 w-4 mr-1" /> Reject</Button>
            </>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => remove.mutate(l.id)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          )}
        </div>

        {isOpen && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {l.description && <p className="text-sm text-muted-foreground">{l.description}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {l.units.map((u: any, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded-md border p-2">
                  <div className="h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                    {u.unit?.photo_url ? <img src={u.unit.photo_url} alt="" className="h-full w-full object-contain" /> : <Carrot className="h-4 w-4 m-auto mt-3 text-muted-foreground" />}
                  </div>
                  <div className="text-xs">
                    <div className="font-medium">{u.unit?.name}</div>
                    <div className="text-muted-foreground">
                      {u.path_index !== null ? `Path ${u.path_index}, Lvl ${u.level}` : "Base"} · {u.placement_count}x placed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Community Loadouts</h2>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 space-y-2">
          {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing pending.</p> : pending.map((l) => <Row key={l.id} l={l} />)}
        </TabsContent>
        <TabsContent value="approved" className="mt-4 space-y-2">
          {approved.length === 0 ? <p className="text-sm text-muted-foreground">No approved loadouts yet.</p> : approved.map((l) => <Row key={l.id} l={l} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
