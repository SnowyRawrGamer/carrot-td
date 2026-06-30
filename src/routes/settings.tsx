import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Carrot TD Values" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("username, display_name, public_name").eq("id", user!.id).single();
      return data;
    },
  });

  const [username, setUsername] = useState("");
  const [publicName, setPublicName] = useState("");

  // Pre-fill once loaded
  useState(() => {
    if (profile?.username) setUsername(profile.username);
    if (profile?.public_name) setPublicName(profile.public_name);
  });

  const saveUsername = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) throw new Error("3-30 characters, letters/numbers/underscores only");
      const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);
      if (error) { if (error.code === "23505") throw new Error("That username is already taken"); throw error; }
    },
    onSuccess: () => { toast.success("Username updated!"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const savePublicName = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update({ public_name: publicName.trim() || null }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Display name updated!"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) return (
    <Page><Card className="p-8 text-center text-muted-foreground">Sign in to access settings.</Card></Page>
  );

  return (
    <Page>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="max-w-lg space-y-6">
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Username</h2>
          <p className="text-sm text-muted-foreground">This is how you appear on the forum.</p>
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={profile?.username || "Not set"}
            />
            <p className="text-xs text-muted-foreground mt-1">3-30 characters. Letters, numbers, underscores only.</p>
          </div>
          <Button onClick={() => saveUsername.mutate()} disabled={saveUsername.isPending}>Save username</Button>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Public display name</h2>
          <p className="text-sm text-muted-foreground">Shown on the Editors page and community loadouts instead of your real account name.</p>
          <div>
            <Label>Display name</Label>
            <Input value={publicName} onChange={(e) => setPublicName(e.target.value)} placeholder="Optional" />
          </div>
          <Button onClick={() => savePublicName.mutate()} disabled={savePublicName.isPending}>Save display name</Button>
        </Card>
      </div>
    </Page>
  );
}
