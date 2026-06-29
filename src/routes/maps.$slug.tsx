import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Map as MapIcon, Image as ImageIcon } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/maps/$slug")({
  component: MapDetail,
});

function MapDetail() {
  const { slug } = Route.useParams();
  const { data: map, isLoading } = useQuery({
    queryKey: ["map", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maps" as any)
        .select("*, added_updates:update_maps(update:updates(id, name, slug)), removed_update:updates!removed_update_id(id, name, slug)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Page><div className="text-muted-foreground">Loading...</div></Page>;
  if (!map) return <Page><Card className="p-8 text-center">Map not found. <Link to="/maps" className="text-primary underline">Back to maps</Link></Card></Page>;

  const addedUpdate = map.added_updates?.[0]?.update;
  const removedUpdate = map.removed_update;

  return (
    <Page>
      <Link to="/maps" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> All maps
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="aspect-video bg-muted relative">
              {map.image_url ? (
                <img src={map.image_url} alt={map.name} className="h-full w-full object-contain" />
              ) : (
                <div className="h-full w-full grid place-items-center text-muted-foreground">
                  <MapIcon className="h-12 w-12" />
                </div>
              )}
              {removedUpdate && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                  <Badge variant="destructive" className="text-xl px-6 py-2">REMOVED</Badge>
                </div>
              )}
            </div>
            <div className="p-6">
              <h1 className="text-3xl font-bold mb-4">{map.name}</h1>
              {map.description && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {map.description}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {map.gallery_urls && map.gallery_urls.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ImageIcon className="h-5 w-5" /> Gallery
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {map.gallery_urls.map((url: string, i: number) => (
                  <div key={i} className="aspect-video rounded-lg overflow-hidden bg-muted border">
                    <img src={url} alt={`${map.name} gallery ${i + 1}`} className="h-full w-full object-contain hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-bold mb-4 uppercase text-xs tracking-widest text-muted-foreground">Availability</h2>
            <div className="space-y-4">
              {addedUpdate ? (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Added in</div>
                    <Link to="/updates/$slug" params={{ slug: addedUpdate.slug }} className="text-primary hover:underline text-sm font-bold">
                      {addedUpdate.name}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">Addition date unknown</div>
              )}

              {removedUpdate && (
                <div className="flex items-start gap-3 border-t pt-4">
                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-destructive">Removed in</div>
                    <Link to="/updates/$slug" params={{ slug: removedUpdate.slug }} className="text-destructive hover:underline text-sm font-bold">
                      {removedUpdate.name}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
