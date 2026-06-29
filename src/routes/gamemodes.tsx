import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Play, Calendar } from "lucide-react";

export const Route = createFileRoute("/gamemodes")({
  component: GamemodesPage,
});

function GamemodesPage() {
  const { data: gamemodes, isLoading } = useQuery({
    queryKey: ["gamemodes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gamemodes" as any).select("*, added_updates:update_gamemodes(update:updates(id, name, slug)), removed_update:updates!removed_update_id(id, name, slug)").order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <Page title="Gamemodes">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Gamemodes</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Learn about the various gamemodes you can play in Carrot TD.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading gamemodes...</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gamemodes?.map((mode: any) => {
            const addedUpdate = mode.added_updates?.[0]?.update;
            const removedUpdate = mode.removed_update;

            return (
              <Card key={mode.id} className="overflow-hidden flex flex-col">
                <div className="aspect-[16/9] bg-muted relative">
                  {mode.image_url ? (
                    <img src={mode.image_url} alt={mode.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-muted-foreground">
                      <Play className="h-12 w-12" />
                    </div>
                  )}
                  {removedUpdate && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                      <Badge variant="destructive" className="text-lg px-4 py-1">REMOVED</Badge>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="text-xl font-bold mb-2">{mode.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">{mode.description}</p>
                  
                  <div className="space-y-2 mt-auto pt-4 border-t">
                    {addedUpdate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Added in: </span>
                        <Link to="/updates/$slug" params={{ slug: addedUpdate.slug }} className="text-primary hover:underline font-medium">
                          {addedUpdate.name}
                        </Link>
                      </div>
                    )}
                    {removedUpdate && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <Calendar className="h-3 w-3" />
                        <span>Removed in: </span>
                        <Link to="/updates/$slug" params={{ slug: removedUpdate.slug }} className="text-destructive hover:underline font-medium">
                          {removedUpdate.name}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}
