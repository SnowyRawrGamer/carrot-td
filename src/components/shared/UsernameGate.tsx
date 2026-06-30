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

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("username").eq("id", user!.id).single();
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(value)) throw new Error("3-30 characters, letters/numbers/underscores only");
      const { error } = await supabase.from("profiles").update({ username: value.trim() }).eq("id", user.id);
      if (error) {
        if (error.code === "23505") throw new Error("That username is already taken");
        throw error;
      }
    },
    onSuccess: () => { toast.success("Username set!"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user || isLoading) return <>{children}</>;
  if (profile?.username) return <>{children}</>;

  return (
    <>
      {children}
      <Dialog open>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Choose your username</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Pick a unique username to use on Carrot TD Values. You can change it later in Settings.</p>
          <div className="space-y-3">
            <div>
              <Label>Username</Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. CarrotKing99"
                onKeyDown={(e) => e.key === "Enter" && save.mutate()}
              />
              <p className="text-xs text-muted-foreground mt-1">3-30 characters. Letters, numbers, underscores only.</p>
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || value.length < 3}>
              {save.isPending ? "Saving..." : "Set username"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
