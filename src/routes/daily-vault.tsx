import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Star, Carrot } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/daily-vault")({
  head: () => ({
    meta: [
      { title: "Daily Loadout Vault — Past Challenges" },
      { name: "description", content: "Browse past Loadouts of the Day and see how the community rated them." },
    ],
  }),
  component: DailyVault,
});

function DailyVault() {
  const { data: loadouts, isLoading } = useQuery({
    queryKey: ["daily-loadouts", "past"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("daily_loadouts" as any)
        .select("*, daily_loadout_ratings(*)")
        .lt("date", today)
        .order("date", { ascending: false });
      
      if (error) throw error;

      // Batch fetch units for all loadouts
      const allUnitIds = [...new Set(data.flatMap((l: any) => l.unit_ids))];
      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select("id, name, photo_url, slug")
        .in("id", allUnitIds);
      
      if (unitsError) throw unitsError;

      const unitMap = new Map(units.map(u => [u.id, u]));

      return data.map((l: any) => ({
        ...l,
        units: l.unit_ids.map((id: string) => unitMap.get(id)).filter(Boolean),
        avgFun: l.daily_loadout_ratings.length > 0 
          ? l.daily_loadout_ratings.reduce((acc: number, curr: any) => acc + curr.fun_rating, 0) / l.daily_loadout_ratings.length 
          : 0,
        avgDifficulty: l.daily_loadout_ratings.length > 0 
          ? l.daily_loadout_ratings.reduce((acc: number, curr: any) => acc + curr.difficulty_rating, 0) / l.daily_loadout_ratings.length 
          : 0
      }));
    },
  });

  return (
    <Page>
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8 text-primary" />
          Daily Loadout Vault
        </h1>
        <p className="text-muted-foreground mt-2">Past daily challenges and their community scores.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {loadouts?.map((loadout: any) => (
            <Card key={loadout.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">
                  {new Date(loadout.date).toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {loadout.units.map((u: any) => (
                  <Link key={u.id} to="/units/$slug" params={{ slug: u.slug }} className="group">
                    <div className="aspect-square rounded-lg overflow-hidden border bg-muted relative">
                      {u.photo_url ? (
                        <img src={u.photo_url} alt={u.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                      ) : (
                        <div className="h-full w-full grid place-items-center"><Carrot className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex gap-4 border-t pt-4">
                <div className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-yellow-500" />
                  <span>Fun: {loadout.avgFun > 0 ? loadout.avgFun.toFixed(1) : "N/A"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-orange-500" />
                  <span>Diff: {loadout.avgDifficulty > 0 ? loadout.avgDifficulty.toFixed(1) : "N/A"}</span>
                </div>
              </div>
            </Card>
          ))}

          {loadouts?.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl text-muted-foreground">
              No past loadouts in the vault yet.
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
