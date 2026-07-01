import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function UsernameGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [value, setValue] = useState("");

  const { data: username, isLoading, isError } = useQuery({
    queryKey: ["my-username", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_username");
      if (error) throw error;
      return data as string | null;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(value)) throw new Error("3-30 characters, letters/numbers/underscores only");
      const { error } = await supabase
        .from("profiles")
        .update({ username: value.trim() })
        .eq("id", user.id);
      if (error) {
        if (error.code === "23505") throw new Error("That username is already taken");
        throw error;
      }
      return value.trim();
    },
    onSuccess: (savedUsername) => {
      toast.success("Username set!");
      // Immediately update cache so dialog closes without waiting for refetch
      qc.setQueryData(["my-username", user?.id], savedUsername);
      // Also update the profile query key used elsewhere
      qc.setQueryData(["my-profile", user?.id], (old: any) => ({ ...(old || {}), username: savedUsername }));
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Not signed in or still loading → just show the app
  if (!user || isLoading) return <>{children}</>;

  // If the query errored, don't block the user — they can set username from Settings
  if (isError) return <>{children}</>;

  // Username already set → nothing to do
  if (username) return <>{children}</>;

  // No username yet → show prompt
  return (
    <>
      {children}
      <Dialog open>
        <DialogContent
          className="max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Choose your username</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pick a unique username to use on Carrot TD Values. You can change it later in Settings.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Username</Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. CarrotKing99"
                onKeyDown={(e) => e.key === "Enter" && value.length >= 3 && save.mutate()}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                3-30 characters. Letters, numbers, underscores only.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || value.length < 3}
            >
              {save.isPending ? "Saving..." : "Set username"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
