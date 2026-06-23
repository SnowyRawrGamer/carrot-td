import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Carrot, Sparkles, Package, ArrowRight, Star, History, Clock } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { rarityClass } from "@/lib/utils-slug";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carrot TD Values — Unit stats, summons & chests" },
      { name: "description", content: "Community value list for Carrot TD. Browse unit stats, upgrade paths, summon pools and chest contents." },
    ],
  }),
  component: Home,
});

function DailyCountdown({ onComplete }: { onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const nextDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = nextDay.getTime() - now.getTime();

      if (diff <= 0) {
        onComplete();
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono text-muted-foreground border border-border/50">
        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        <span>Resets in: {timeLeft}</span>
      </div>
      <span className="text-[9px] text-muted-foreground/60 ml-1 italic">Resets at UTC midnight</span>
    </div>
  );
}

function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: units } = useQuery({
    queryKey: ["units", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units").select("id, slug, name, photo_url, rarity, tier")
        .order("created_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data;
    },
  });

  const { data: dailyLoadout, isLoading: loadingLoadout, error: loadoutError } = useQuery({
    queryKey: ["daily-loadout", "today"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      console.log("[DailyLoadout] Fetching for date:", today);
      
      // Try to get today's loadout
      const { data: loadout, error } = await supabase
        .from("daily_loadouts" as any)
        .select("*, daily_loadout_ratings(*)")
        .eq("date", today)
        .maybeSingle();

      if (error) {
        console.error("[DailyLoadout] Fetch error:", error);
        throw error;
      }

      // If it doesn't exist, we'll try to generate it
      if (!loadout) {
        console.log("[DailyLoadout] Today's loadout not found, attempting generation...");
        
        const { data: randomUnits, error: fetchError } = await supabase
          .from("units")
          .select("id")
          .limit(100);
        
        if (fetchError) {
          console.error("[DailyLoadout] Error fetching units for generation:", fetchError);
          throw fetchError;
        }
        
        if (randomUnits && randomUnits.length >= 5) {
          const selected = randomUnits
            .sort(() => 0.5 - Math.random())
            .slice(0, 5)
            .map(u => u.id);
          
          console.log("[DailyLoadout] Inserting new loadout with units:", selected);
          
          const { data: newLoadout, error: insertError } = await supabase
            .from("daily_loadouts" as any)
            .insert({ date: today, unit_ids: selected })
            .select()
            .single();
          
          if (insertError) {
            console.error("[DailyLoadout] Insert error (could be RLS):", insertError);
            // Handle race condition: check if another user inserted it while we were trying
            const { data: retryLoadout } = await supabase
              .from("daily_loadouts" as any)
              .select("*, daily_loadout_ratings(*)")
              .eq("date", today)
              .maybeSingle();
            
            if (retryLoadout) return await fetchFullUnits(retryLoadout);
            
            // If retry fails, we have to throw so the UI can show the error
            throw insertError;
          }

          return newLoadout ? await fetchFullUnits({ ...(newLoadout as any), daily_loadout_ratings: [] }) : null;
        } else {
          console.warn("[DailyLoadout] Not enough units in database to generate loadout:", randomUnits?.length);
        }
      } else {
        return await fetchFullUnits(loadout);
      }
      return null;
    },
    retry: false
  });

  async function fetchFullUnits(loadout: any) {
    const { data: fullUnits, error: unitsError } = await supabase
      .from("units")
      .select("id, name, photo_url, rarity, slug")
      .in("id", loadout.unit_ids);
    
    if (unitsError) {
      console.error("[DailyLoadout] Error fetching full unit details:", unitsError);
      throw unitsError;
    }
    
    return {
      ...loadout,
      units: fullUnits
    };
  }

  const userRating = dailyLoadout?.daily_loadout_ratings?.find((r: any) => r.user_id === user?.id);

  const rateMutation = useMutation({
    mutationFn: async ({ fun, difficulty }: { fun: number, difficulty: number }) => {
      if (!user) throw new Error("Must be signed in");
      if (!dailyLoadout) throw new Error("No loadout found");

      const ratingData = {
        loadout_id: dailyLoadout.id,
        user_id: user.id,
        fun_rating: fun,
        difficulty_rating: difficulty
      };

      if (userRating) {
        const { error } = await supabase
          .from("daily_loadout_ratings" as any)
          .update(ratingData)
          .eq("id", userRating.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_loadout_ratings" as any)
          .insert(ratingData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-loadout"] });
      toast.success("Rating submitted!");
    },
    onError: (err) => {
      toast.error("Failed to submit rating: " + err.message);
    }
  });

  return (
    <Page>
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-accent via-background to-background p-8 md:p-14">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
            <Carrot className="h-3.5 w-3.5 text-primary" /> Community value list
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
            Every unit, every upgrade, every pull.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Browse Carrot TD unit stats, compare upgrade paths, and see exactly what's in every summon pool and chest.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="lg"><Link to="/units">Browse units <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/summons">Summons & chests</Link></Button>
          </div>
        </div>
      </section>

      {/* Loadout of the Day Section */}
      <section className="mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              <h2 className="text-2xl font-bold">Loadout of the Day</h2>
            </div>
            <DailyCountdown onComplete={() => queryClient.invalidateQueries({ queryKey: ["daily-loadout"] })} />
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/daily-vault" className="gap-1">
              <History className="h-4 w-4" /> View Vault
            </Link>
          </Button>
        </div>

        <Card className="p-6 bg-card/50 border-primary/20">
          {loadingLoadout ? (
            <div className="h-48 flex items-center justify-center">Loading today's challenge...</div>
          ) : loadoutError ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4">
              <p className="text-destructive font-medium">Failed to load or generate today's loadout.</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-xs">
                {(loadoutError as any)?.message || "Check RLS policies or database connectivity."}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["daily-loadout"] })}
              >
                Retry
              </Button>
            </div>
          ) : dailyLoadout ? (
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <div className="grid grid-cols-5 gap-2">
                  {dailyLoadout.units?.map((u: any) => (
                    <Link key={u.id} to="/units/$slug" params={{ slug: u.slug }} className="group">
                      <div className="aspect-square rounded-xl overflow-hidden border bg-muted relative">
                        {u.photo_url ? (
                          <img src={u.photo_url} alt={u.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                        ) : (
                          <div className="h-full w-full grid place-items-center"><Carrot className="h-6 w-6 text-muted-foreground" /></div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1">
                          <p className="text-[8px] text-white truncate text-center font-medium">{u.name}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-4 flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 fill-primary" />
                    <span className="font-bold">
                      {dailyLoadout.daily_loadout_ratings?.length > 0 
                        ? (dailyLoadout.daily_loadout_ratings.reduce((acc: number, curr: any) => acc + curr.fun_rating, 0) / dailyLoadout.daily_loadout_ratings.length).toFixed(1)
                        : "N/A"}
                    </span>
                    <span className="text-primary/70 text-xs">Fun</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 fill-orange-500" />
                    <span className="font-bold">
                      {dailyLoadout.daily_loadout_ratings?.length > 0 
                        ? (dailyLoadout.daily_loadout_ratings.reduce((acc: number, curr: any) => acc + curr.difficulty_rating, 0) / dailyLoadout.daily_loadout_ratings.length).toFixed(1)
                        : "N/A"}
                    </span>
                    <span className="text-orange-600/70 text-xs">Difficulty</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center border-l pl-8">
                {user ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Rate today's loadout</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">How fun is it?</p>
                        <RatingPicker 
                          value={userRating?.fun_rating || 0} 
                          onChange={(v) => rateMutation.mutate({ fun: v, difficulty: userRating?.difficulty_rating || 3 })}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Challenge level?</p>
                        <RatingPicker 
                          value={userRating?.difficulty_rating || 0} 
                          onChange={(v) => rateMutation.mutate({ fun: userRating?.fun_rating || 3, difficulty: v })}
                          color="text-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <p className="text-muted-foreground text-sm">Sign in to rate and help others find the best loadouts!</p>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/auth">Sign in to rate</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">No daily loadout available today.</div>
          )}
        </Card>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <FeatureCard icon={<Carrot className="h-5 w-5" />} title="Unit stats" desc="Damage, range, speed, custom stats, and full upgrade tables for 1 or 2 paths." to="/units" />
        <FeatureCard icon={<Sparkles className="h-5 w-5" />} title="Summon pools" desc="See what's in every banner with exact drop rates." to="/summons" />
        <FeatureCard icon={<Package className="h-5 w-5" />} title="Chests" desc="All chest types and what they can drop." to="/chests" />
      </section>

      {units && units.length > 0 && (
        <section className="mt-14">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl font-bold">Recently added</h2>
            <Link to="/units" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {units.map((u) => (
              <Link key={u.id} to="/units/$slug" params={{ slug: u.slug }} className="group">
                <Card className="overflow-hidden p-0 hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-muted">
                    {u.photo_url ? (
                      <img src={u.photo_url} alt={u.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-muted-foreground"><Carrot className="h-8 w-8" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm truncate">{u.name}</div>
                    {u.rarity && (
                      <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded border ${rarityClass(u.rarity)}`}>{u.rarity}</span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

function RatingPicker({ value, onChange, color = "text-yellow-500" }: { value: number, onChange: (v: number) => void, color?: string }) {
  const [hover, setHover] = useState(0);
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform active:scale-90"
        >
          <Star 
            className={`h-6 w-6 ${(hover || value) >= star ? `fill-current ${color}` : "text-muted-foreground/30"}`} 
          />
        </button>
      ))}
    </div>
  );
}

function FeatureCard({ icon, title, desc, to }: { icon: React.ReactNode; title: string; desc: string; to: string }) {
  return (
    <Link to={to}>
      <Card className="p-5 h-full hover:border-primary/40 hover:shadow-sm transition">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h3 className="mt-3 font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </Card>
    </Link>
  );
}
