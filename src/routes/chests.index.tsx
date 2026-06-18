import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chests/")({
  head: () => ({
    meta: [
      { title: "Chests — Carrot TD Values" },
      { name: "description", content: "All Carrot TD chests and their contents." },
    ],
  }),
  component: ChestsPage,
});

function ChestsPage() {
  const { data: chests, isLoading } = useQuery({
    queryKey: ["chests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Page>
      <h1 className="text-3xl font-bold mb-2">Chests</h1>
      <p className="text-muted-foreground mb-6">Chest types and their drop tables.</p>
      {isLoading ? <div className="text-muted-foreground">Loading...</div> :
        !chests || chests.length === 0 ? (
        <Card className="p-10 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="mt-3">No chests yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chests.map((c) => (
            <Link key={c.id} to="/chests/$slug" params={{ slug: c.slug }}>
              <Card className="overflow-hidden p-0 hover:shadow-md hover:border-primary/40 transition">
                <div className="aspect-[16/9] bg-muted">
                  {c.image_url ? <img src={c.image_url} alt={c.name} className="h-full w-full object-contain" /> :
                    <div className="h-full w-full grid place-items-center text-muted-foreground"><Package className="h-10 w-10" /></div>}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{c.name}</h3>
                  {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
