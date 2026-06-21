import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/summons/")({
  head: () => ({
    meta: [
      { title: "Summons — Carrot TD Values" },
      { name: "description", content: "All Carrot TD summon banners and their drop rates." },
    ],
  }),
  component: SummonsPage,
});

function fmtDate(d?: string | null) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
}

function SummonsPage() {
  const { data: summons, isLoading } = useQuery({
    queryKey: ["summons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("summons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const list = data || [];
      const ids = list.map((s) => s.id);

      const { data: addedLinks } = ids.length
        ? await supabase.from("update_summons").select("summon_id, update:updates(name, slug, released_at)").in("summon_id", ids)
        : { data: [] as any[] };
      const addedMap: Record<string, any> = {};
      for (const l of addedLinks || []) {
        const existing = addedMap[l.summon_id];
        if (!existing || (l.update?.released_at || "") < (existing.released_at || "")) addedMap[l.summon_id] = l.update;
      }

      const removedUpdateIds = Array.from(new Set(list.map((s) => s.removed_update_id).filter(Boolean)));
      const { data: removedUpdates } = removedUpdateIds.length
        ? await supabase.from("updates").select("id, name, slug, released_at").in("id", removedUpdateIds)
        : { data: [] as any[] };
      const removedMap: Record<string, any> = {};
      for (const u of removedUpdates || []) removedMap[u.id] = u;

      return list.map((s) => ({
        ...s,
        addedIn: addedMap[s.id] || null,
        removedIn: s.removed_update_id ? removedMap[s.removed_update_id] : null,
      }));
    },
  });

  const current = (summons || []).filter((s) => !s.removed_update_id);
  const past = (summons || []).filter((s) => s.removed_update_id);

  function SummonCard({ s }: { s: any }) {
    return (
      <Link to="/summons/$slug" params={{ slug: s.slug }}>
        <Card className="overflow-hidden p-0 hover:shadow-md hover:border-primary/40 transition">
          <div className="aspect-[16/9] bg-muted">
            {s.banner_url ? <img src={s.banner_url} alt={s.name} className="h-full w-full object-contain" /> :
              <div className="h-full w-full grid place-items-center text-muted-foreground"><Sparkles className="h-10 w-10" /></div>}
          </div>
          <div className="p-4">
            <h3 className="font-semibold">{s.name}</h3>
            {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              {s.addedIn && <p>Added: {s.addedIn.name}{fmtDate(s.addedIn.released_at) ? ` (${fmtDate(s.addedIn.released_at)})` : ""}</p>}
              {s.removedIn && <p>Removed: {s.removedIn.name}{fmtDate(s.removedIn.released_at) ? ` (${fmtDate(s.removedIn.released_at)})` : ""}</p>}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Page>
      <h1 className="text-3xl font-bold mb-2">Summons</h1>
      <p className="text-muted-foreground mb-6">Banner pools and drop rates.</p>
      {isLoading ? <div className="text-muted-foreground">Loading...</div> :
       !summons || summons.length === 0 ? (
        <Card className="p-10 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="mt-3">No summons yet.</p>
        </Card>
      ) : (
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-bold mb-3">Current Summons</h2>
            {current.length === 0 ? (
              <p className="text-sm text-muted-foreground">No current summons.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {current.map((s) => <SummonCard key={s.id} s={s} />)}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-3">Past Summons</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {past.map((s) => <SummonCard key={s.id} s={s} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
