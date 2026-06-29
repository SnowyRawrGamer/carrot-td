import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Carrot, Package, Map as MapIcon, Play } from "lucide-react";
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
      const [{ data: units }, { data: chests }, { data: summons }, { data: maps }, { data: gamemodes }] = await Promise.all([
        supabase.from("update_units").select("unit:units(id, slug, name, photo_url, rarity, tier)").eq("update_id", update.id),
        supabase.from("update_chests").select("chest:chests(id, slug, name, image_url)").eq("update_id", update.id),
        supabase.from("update_summons").select("summon:summons(id, slug, name, banner_url)").eq("update_id", update.id),
        supabase.from("update_maps" as any).select("map:maps(id, slug, name, image_url)").eq("update_id", update.id),
        supabase.from("update_gamemodes" as any).select("gamemode:gamemodes(id, slug, name, image_url)").eq("update_id", update.id),
      ]);

      const [{ data: removedUnits }, { data: removedChests }, { data: removedSummons }, { data: removedMaps }, { data: removedGamemodes }] = await Promise.all([
        supabase.from("units").select("id, slug, name, photo_url, rarity, tier").eq("removed_update_id", update.id),
        supabase.from("chests").select("id, slug, name, image_url").eq("removed_update_id", update.id),
        supabase.from("summons").select("id, slug, name, banner_url").eq("removed_update_id", update.id),
        supabase.from("maps" as any).select("id, slug, name, image_url").eq("removed_update_id", update.id),
        supabase.from("gamemodes" as any).select("id, slug, name, image_url").eq("removed_update_id", update.id),
      ]);

      return {
        update,
        units: (units || []).map((r: any) => r.unit).filter(Boolean),
        chests: (chests || []).map((r: any) => r.chest).filter(Boolean),
        summons: (summons || []).map((r: any) => r.summon).filter(Boolean),
        maps: (maps || []).map((r: any) => r.map).filter(Boolean),
        gamemodes: (gamemodes || []).map((r: any) => r.gamemode).filter(Boolean),
        removedUnits: removedUnits || [],
        removedChests: removedChests || [],
        removedSummons: removedSummons || [],
        removedMaps: removedMaps || [],
        removedGamemodes: removedGamemodes || [],
      };
    },
  });

  if (isLoading) return <Page><div className="text-muted-foreground">Loading...</div></Page>;
  if (!data) return <Page><Card className="p-8 text-center">Update not found. <Link to="/updates" className="text-primary underline">Back to updates</Link></Card></Page>;
  const { update, units, chests, summons, maps, gamemodes, removedUnits, removedChests, removedSummons, removedMaps, removedGamemodes } = data;

  const renderItem = (item: any, type: 'unit' | 'chest' | 'summon' | 'map' | 'gamemode') => {
    let to = "";
    let img = "";
    let Icon: any = Sparkles;
    let aspect = "aspect-square";

    switch(type) {
      case 'unit': to = "/units/$slug"; img = item.photo_url; Icon = Carrot; break;
      case 'chest': to = "/chests/$slug"; img = item.image_url; Icon = Package; aspect = "aspect-[16/9]"; break;
      case 'summon': to = "/summons/$slug"; img = item.banner_url; Icon = Sparkles; aspect = "aspect-[16/9]"; break;
      case 'map': to = "/maps"; img = item.image_url; Icon = MapIcon; aspect = "aspect-[16/9]"; break;
      case 'gamemode': to = "/gamemodes"; img = item.image_url; Icon = Play; aspect = "aspect-[16/9]"; break;
    }

    return (
      <Link key={item.id} to={to as any} {...((type === 'map' || type === 'gamemode') ? {} : { params: { slug: item.slug } as any })}
        className="rounded-lg border bg-muted/30 p-2 text-center hover:border-primary/40 transition flex flex-col">
        <div className={`${aspect} w-full rounded-md bg-muted overflow-hidden mb-2`}>
          {img ? <img src={img} alt="" className="h-full w-full object-contain" /> :
            <div className="h-full w-full grid place-items-center text-muted-foreground"><Icon className="h-6 w-6" /></div>}
        </div>
        <div className="text-sm font-medium truncate">{item.name}</div>
        {type === 'unit' && item.rarity && <span className={`mx-auto text-[10px] px-1 py-0.5 rounded border ${rarityClass(item.rarity)}`}>{item.rarity}</span>}
      </Link>
    );
  };

  return (
    <Page>
      <Link to="/updates" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> All updates
      </Link>

      <Card className="overflow-hidden p-0 mb-6">
        <div className="aspect-[21/9] bg-muted">
          {update.image_url ? <img src={update.image_url} alt={update.name} className="h-full w-full object-contain" /> :
            <div className="h-full w-full grid place-items-center text-muted-foreground"><Sparkles className="h-12 w-12" /></div>}
        </div>
        <div className="p-5">
          <h1 className="text-2xl font-bold">{update.name}</h1>
          {update.released_at && <div className="text-sm text-muted-foreground mt-1">Released {formatDate(update.released_at)}</div>}
          {update.description && <p className="mt-3 whitespace-pre-wrap">{update.description}</p>}
        </div>
      </Card>

      {units.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-3">Units added ({units.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {units.map(u => renderItem(u, 'unit'))}
          </div>
        </Card>
      )}

      {summons.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-3">Summons added ({summons.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {summons.map(s => renderItem(s, 'summon'))}
          </div>
        </Card>
      )}

      {chests.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-3">Chests added ({chests.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {chests.map(c => renderItem(c, 'chest'))}
          </div>
        </Card>
      )}

      {maps.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-3">Maps added ({maps.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {maps.map(m => renderItem(m, 'map'))}
          </div>
        </Card>
      )}

      {gamemodes.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-3">Gamemodes added ({gamemodes.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gamemodes.map(g => renderItem(g, 'gamemode'))}
          </div>
        </Card>
      )}

      {(removedUnits.length > 0 || removedSummons.length > 0 || removedChests.length > 0 || removedMaps.length > 0 || removedGamemodes.length > 0) && (
        <>
          <h2 className="text-lg font-bold mt-8 mb-3 text-destructive">Removed in this update</h2>

          {removedUnits.length > 0 && (
            <Card className="p-5 mb-6">
              <h3 className="font-semibold mb-3">Units removed ({removedUnits.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {removedUnits.map(u => renderItem(u, 'unit'))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Removed units are still available in trading.</p>
            </Card>
          )}

          {removedSummons.length > 0 && (
            <Card className="p-5 mb-6">
              <h3 className="font-semibold mb-3">Summons removed ({removedSummons.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {removedSummons.map(s => renderItem(s, 'summon'))}
              </div>
            </Card>
          )}

          {removedChests.length > 0 && (
            <Card className="p-5 mb-6">
              <h3 className="font-semibold mb-3">Chests removed ({removedChests.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {removedChests.map(c => renderItem(c, 'chest'))}
              </div>
            </Card>
          )}

          {removedMaps.length > 0 && (
            <Card className="p-5 mb-6">
              <h3 className="font-semibold mb-3">Maps removed ({removedMaps.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {removedMaps.map(m => renderItem(m, 'map'))}
              </div>
            </Card>
          )}

          {removedGamemodes.length > 0 && (
            <Card className="p-5 mb-6">
              <h3 className="font-semibold mb-3">Gamemodes removed ({removedGamemodes.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {removedGamemodes.map(g => renderItem(g, 'gamemode'))}
              </div>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
