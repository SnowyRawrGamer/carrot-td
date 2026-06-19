import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shield, Crown } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/editors/")({
  head: () => ({
    meta: [
      { title: "Editors — Carrot TD Values" },
      { name: "description", content: "Meet the owners and editors behind Carrot TD Values." },
    ],
  }),
  component: EditorsPage,
});

function EditorsPage() {
  const { data: editors, isLoading } = useQuery({
    queryKey: ["public-editors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_editors")
        .select("*")
        .order("role");
      if (error) throw error;
      return data;
    },
  });

  const owners = (editors || []).filter((e) => e.role === "owner");
  const eds = (editors || []).filter((e) => e.role === "editor");

  return (
    <Page>
      <h1 className="text-3xl font-bold mb-2">Editors</h1>
      <p className="text-muted-foreground mb-6">The people who keep Carrot TD Values up to date.</p>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Owners</h2>
            {owners.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {owners.map((o) => (
                  <div key={o.id} className="rounded-md border p-3 font-medium">{o.public_name}</div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4" /> Editors</h2>
            {eds.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {eds.map((e) => (
                  <div key={e.id} className="rounded-md border p-3 font-medium">{e.public_name}</div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </Page>
  );
}
