import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Carrot, Package } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { rarityClass } from "@/lib/utils-slug";

export const Route = createFileRoute("/updates/$slug")({
  component: UpdateDetail,
});

function formatDate(d?: string | null) {
  if (!d) return null;
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); }
  catch { return d; }
}

function UpdateDetail() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["update", slug],
    queryFn: async () => {
      const { data: update, error } = await supabase.from("updates").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!update) return null;
      const [{ data: units }, { data: chests }] = await Promise.all([
        supabase.from("update_units").select("unit:units(id, slug, name, photo_url, rarity, tier)").eq("update_id", update.id),
        supabase.from("update_chests").select("chest:chests(id, slug, name, image_url)").eq("update_id", update.id),
      ]);
      return {
        update,
        units: (units || []).map((r: any) => r.unit).filter(Boolean),
        chests: (chests || []).map((r: any) => r.chest).filter(Boolean),
      };
    },
  });

  if (isLoading) return <Page><div className="text-muted-foreground">Loading...</div></Page>;
  if (!data) return <Page><Card className="p-8 text-center">Update not found. <Link to="/updates" className="text-primary underline">Back to updates</Link></Card></Page>;
  const { update, units, chests } = data;

  return (
    <Page>
      <Link to="/updates" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> All updates
      </Link>

      <Card className="overflow-hidden p-0 mb-6">
        <div className="aspect-[21/9] bg-muted">
          {update.image_url ? <img src={update.image_url} alt={update.name} className="h-full w-full object-cover" /> :
            <div className="h-full w-full grid place-items-center text-muted-foreground"><Sparkles className="h-12 w-12" /></div>}
        </div>
        <div className="p-5">
          <h1 className="text-2xl font-bold">{update.name}</h1>
          {update.released_at && <div className="text-sm text-muted-foreground mt-1">Released {formatDate(update.released_at)}</div>}
          {update.description && <p className="mt-3 whitespace-pre-wrap">{update.description}</p>}
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <h2 className="font-semibold mb-3">Units added ({units.length})</h2>
        {units.length === 0 ? (
          <p className="text-sm text-muted-foreground">No units linked to this update.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {units.map((u: any) => (
              <Link key={u.id} to="/units/$slug" params={{ slug: u.slug }}
                className="rounded-lg border bg-muted/30 p-2 text-center hover:border-primary/40 transition">
                <div className="aspect-square w-full rounded-md bg-muted overflow-hidden mb-2">
                  {u.photo_url ? <img src={u.photo_url} alt="" className="h-full w-full object-contain" /> :
                    <div className="h-full w-full grid place-items-center text-muted-foreground"><Carrot className="h-6 w-6" /></div>}
                </div>
                <div className="text-sm font-medium truncate">{u.name}</div>
                {u.rarity && <span className={`text-[10px] px-1 py-0.5 rounded border ${rarityClass(u.rarity)}`}>{u.rarity}</span>}
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Chests added ({chests.length})</h2>
        {chests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chests linked to this update.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {chests.map((c: any) => (
              <Link key={c.id} to="/chests/$slug" params={{ slug: c.slug }}
                className="rounded-lg border bg-muted/30 p-2 hover:border-primary/40 transition">
                <div className="aspect-[16/9] w-full rounded-md bg-muted overflow-hidden mb-2">
                  {c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-contain" /> :
                    <div className="h-full w-full grid place-items-center text-muted-foreground"><Package className="h-6 w-6" /></div>}
                </div>
                <div className="text-sm font-medium truncate text-center">{c.name}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}
