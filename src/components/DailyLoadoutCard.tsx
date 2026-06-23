import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Carrot, Sparkles, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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

export function DailyLoadoutCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: dailyLoadout, isLoading: loadingLoadout, error: loadoutError } = useQuery({
    queryKey: ["daily-loadout", "today"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data: loadout, error } = await supabase
        .from("daily_loadouts" as any)
        .select("*, daily_loadout_ratings(*)")
        .eq("date", today)
        .maybeSingle();

      if (error) throw error;

      if (!loadout) {
        const { data: randomUnits, error: fetchError } = await supabase
          .from("units")
          .select("id")
          .limit(100);
        
        if (fetchError) throw fetchError;
        
        if (randomUnits && randomUnits.length >= 5) {
          const selected = randomUnits
            .sort(() => 0.5 - Math.random())
            .slice(0, 5)
            .map(u => u.id);
          
          const { data: newLoadout, error: insertError } = await supabase
            .from("daily_loadouts" as any)
            .insert({ date: today, unit_ids: selected })
            .select()
            .single();
          
          if (insertError) {
            const { data: retryLoadout } = await supabase
              .from("daily_loadouts" as any)
              .select("*, daily_loadout_ratings(*)")
              .eq("date", today)
              .maybeSingle();
            
            if (retryLoadout) return await fetchFullUnits(retryLoadout);
            throw insertError;
          }

          return newLoadout ? await fetchFullUnits({ ...(newLoadout as any), daily_loadout_ratings: [] }) : null;
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
    
    if (unitsError) throw unitsError;
    
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
    <Card className="p-6 bg-card/50 border-primary/20">
      {loadingLoadout ? (
        <div className="h-48 flex items-center justify-center">Loading today's challenge...</div>
      ) : loadoutError ? (
        <div className="h-48 flex flex-col items-center justify-center text-center p-4">
          <p className="text-destructive font-medium">Failed to load or generate today's loadout.</p>
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
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <h3 className="font-bold text-lg">Loadout of the Day</h3>
              <DailyCountdown onComplete={() => queryClient.invalidateQueries({ queryKey: ["daily-loadout"] })} />
            </div>
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
  );
}
