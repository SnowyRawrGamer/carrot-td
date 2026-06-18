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

function SummonsPage() {
  const { data: summons, isLoading } = useQuery({
    queryKey: ["summons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("summons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summons.map((s) => (
            <Link key={s.id} to="/summons/$slug" params={{ slug: s.slug }}>
              <Card className="overflow-hidden p-0 hover:shadow-md hover:border-primary/40 transition">
                <div className="aspect-[16/9] bg-muted">
                  {s.banner_url ? <img src={s.banner_url} alt={s.name} className="h-full w-full object-contain" /> :
                    <div className="h-full w-full grid place-items-center text-muted-foreground"><Sparkles className="h-10 w-10" /></div>}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
