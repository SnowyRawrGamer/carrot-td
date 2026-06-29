import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Map as MapIcon, Calendar } from "lucide-react";

export const Route = createFileRoute("/maps")({
  component: MapsPage,
});

function MapsPage() {
  const { data: maps, isLoading } = useQuery({
    queryKey: ["maps"],
    queryFn: async () => {
      const { data: mapsData, error } = await supabase.from("maps" as any).select("*, added_updates:update_maps(update:updates(id, name, slug)), removed_update:updates!removed_update_id(id, name, slug)").order("name");
      if (error) throw error;
      return mapsData;
    },
  });

  return (
    <Page>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Maps</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Explore the different maps available in Carrot TD.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading maps...</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {maps?.map((map: any) => {
            const addedUpdate = map.added_updates?.[0]?.update;
            const removedUpdate = map.removed_update;

            return (
              <Link key={map.id} to="/maps/$slug" params={{ slug: map.slug }}>
                <Card className="overflow-hidden h-full flex flex-col hover:border-primary/50 transition-colors cursor-pointer group">
                  <div className="aspect-[16/9] bg-muted relative">
                    {map.image_url ? (
                      <img src={map.image_url} alt={map.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-muted-foreground">
                        <MapIcon className="h-12 w-12" />
                      </div>
                    )}
                    {removedUpdate && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                        <Badge variant="destructive" className="text-lg px-4 py-1">REMOVED</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{map.name}</h2>
                    <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">{map.description}</p>
                    
                    <div className="space-y-2 mt-auto pt-4 border-t">
                      {addedUpdate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Added in: {addedUpdate.name}</span>
                        </div>
                      )}
                      {removedUpdate && (
                        <div className="flex items-center gap-2 text-xs text-destructive">
                          <Calendar className="h-3 w-3" />
                          <span>Removed in: {removedUpdate.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Page>
  );
}
