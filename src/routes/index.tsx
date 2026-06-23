import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Carrot, Sparkles, Package, ArrowRight, History } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { rarityClass } from "@/lib/utils-slug";
import { DailyLoadoutCard } from "@/components/DailyLoadoutCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carrot TD Values — Unit stats, summons & chests" },
      { name: "description", content: "Community value list for Carrot TD. Browse unit stats, upgrade paths, summon pools and chest contents." },
    ],
  }),
  component: Home,
});

function Home() {
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
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Loadout of the Day</h2>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/daily-vault" className="gap-1">
              <History className="h-4 w-4" /> View Vault
            </Link>
          </Button>
        </div>

        <DailyLoadoutCard />
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
