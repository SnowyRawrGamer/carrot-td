import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/updates/")({
  head: () => ({
    meta: [
      { title: "Updates — Carrot TD Values" },
      { name: "description", content: "All Carrot TD game updates with release dates and new content." },
    ],
  }),
  component: UpdatesPage,
});

function UpdatesPage() {
  const { data: updates, isLoading } = useQuery({
    queryKey: ["updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("updates")
        .select("*")
        .order("released_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Page>
      <h1 className="text-3xl font-bold mb-2">Updates</h1>
      <p className="text-muted-foreground mb-6">Patch notes and release history for Carrot TD.</p>
      {isLoading ? <div className="text-muted-foreground">Loading...</div> :
        !updates || updates.length === 0 ? (
        <Card className="p-10 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="mt-3">No updates yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {updates.map((u) => (
            <Link key={u.id} to="/updates/$slug" params={{ slug: u.slug }}>
              <Card className="overflow-hidden p-0 hover:shadow-md hover:border-primary/40 transition h-full">
                <div className="aspect-[16/9] bg-muted">
                  {u.image_url ? <img src={u.image_url} alt={u.name} className="h-full w-full object-cover" /> :
                    <div className="h-full w-full grid place-items-center text-muted-foreground"><Sparkles className="h-10 w-10" /></div>}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{u.name}</h3>
                  {u.released_at && <div className="text-xs text-muted-foreground mt-0.5">{formatDate(u.released_at)}</div>}
                  {u.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{u.description}</p>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

function formatDate(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); }
  catch { return d; }
}
