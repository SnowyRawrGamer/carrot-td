import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export function LoadoutsManager() {
  const qc = useQueryClient();

  const { data: loadouts } = useQuery({
    queryKey: ["admin-loadouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_loadouts")
        .select("id, title, description, status, created_at, show_real_name, custom_display_name, profiles:creator_id(display_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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

  const pending = (loadouts || []).filter((l) => l.status === "pending");
  const approved = (loadouts || []).filter((l) => l.status === "approved");

  function Row({ l }: { l: any }) {
    const who = l.show_real_name ? (l.profiles?.display_name || l.profiles?.email) : l.custom_display_name;
    return (
      <Card className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{l.title}</div>
          <div className="text-xs text-muted-foreground truncate">by {who} · {new Date(l.created_at).toLocaleDateString()}</div>
        </div>
        {l.status === "pending" ? (
          <>
            <Button size="sm" onClick={() => setStatus.mutate({ id: l.id, status: "approved" })}><Check className="h-4 w-4 mr-1" /> Approve</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: l.id, status: "rejected" })}><X className="h-4 w-4 mr-1" /> Reject</Button>
          </>
        ) : (
          <Button size="sm" variant="destructive" onClick={() => remove.mutate(l.id)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
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
