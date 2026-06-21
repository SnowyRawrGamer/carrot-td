import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chests/")({
  head: () => ({
    meta: [
      { title: "Chests — Carrot TD Values" },
      { name: "description", content: "All Carrot TD chests and their contents." },
    ],
  }),
  component: ChestsPage,
});

function fmtDate(d?: string | null) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
}

function ChestsPage() {
  const { data: chests, isLoading } = useQuery({
    queryKey: ["chests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const list = data || [];
      const ids = list.map((c) => c.id);

      const { data: addedLinks } = ids.length
        ? await supabase.from("update_chests").select("chest_id, update:updates(name, slug, released_at)").in("chest_id", ids)
        : { data: [] as any[] };
      const addedMap: Record<string, any> = {};
      for (const l of addedLinks || []) {
        const existing = addedMap[l.chest_id];
        if (!existing || (l.update?.released_at || "") < (existing.released_at || "")) addedMap[l.chest_id] = l.update;
      }

      const removedUpdateIds = Array.from(new Set(list.map((c) => c.removed_update_id).filter(Boolean)));
      const { data: removedUpdates } = removedUpdateIds.length
        ? await supabase.from("updates").select("id, name, slug, released_at").in("id", removedUpdateIds)
        : { data: [] as any[] };
      const removedMap: Record<string, any> = {};
      for (const u of removedUpdates || []) removedMap[u.id] = u;

      return list.map((c) => ({
        ...c,
        addedIn: addedMap[c.id] || null,
        removedIn: c.removed_update_id ? removedMap[c.removed_update_id] : null,
      }));
    },
  });

  const current = (chests || []).filter((c) => !c.removed_update_id);
  const past = (chests || []).filter((c) => c.removed_update_id);

  function ChestCard({ c }: { c: any }) {
    return (
      <Link to="/chests/$slug" params={{ slug: c.slug }}>
        <Card className="overflow-hidden p-0 hover:shadow-md hover:border-primary/40 transition">
          <div className="aspect-[16/9] bg-muted">
            {c.image_url ? <img src={c.image_url} alt={c.name} className="h-full w-full object-contain" /> :
              <div className="h-full w-full grid place-items-center text-muted-foreground"><Package className="h-10 w-10" /></div>}
          </div>
          <div className="p-4">
            <h3 className="font-semibold">{c.name}</h3>
            {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              {c.addedIn && <p>Added: {c.addedIn.name}{fmtDate(c.addedIn.released_at) ? ` (${fmtDate(c.addedIn.released_at)})` : ""}</p>}
              {c.removedIn && <p>Removed: {c.removedIn.name}{fmtDate(c.removedIn.released_at) ? ` (${fmtDate(c.removedIn.released_at)})` : ""}</p>}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Page>
      <h1 className="text-3xl font-bold mb-2">Chests</h1>
      <p className="text-muted-foreground mb-6">Chest types and their drop tables.</p>
      {isLoading ? <div className="text-muted-foreground">Loading...</div> :
        !chests || chests.length === 0 ? (
        <Card className="p-10 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="mt-3">No chests yet.</p>
        </Card>
      ) : (
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-bold mb-3">Current Chests</h2>
            {current.length === 0 ? (
              <p className="text-sm text-muted-foreground">No current chests.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {current.map((c) => <ChestCard key={c.id} c={c} />)}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-3">Past Chests</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {past.map((c) => <ChestCard key={c.id} c={c} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
