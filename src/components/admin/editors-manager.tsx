import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function EditorsManager() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: editors } = useQuery({
    queryKey: ["editors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, role, user_id, profiles:profiles!user_roles_user_id_fkey(email, display_name)");
      // Fall back if relation alias fails — fetch profiles separately
      if (error) {
        const { data: rs } = await supabase.from("user_roles").select("id, role, user_id");
        const ids = (rs || []).map((r: any) => r.user_id);
        const { data: ps } = ids.length ? await supabase.from("profiles").select("id, email, display_name").in("id", ids) : { data: [] as any[] };
        const map = new Map((ps || []).map((p: any) => [p.id, p]));
        return (rs || []).map((r: any) => ({ ...r, profiles: map.get(r.user_id) }));
      }
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: prof, error: pe } = await supabase.from("profiles").select("id").eq("email", email.trim()).maybeSingle();
      if (pe) throw pe;
      if (!prof) throw new Error("No user with that email has signed in yet. Ask them to sign in first.");
      const { error } = await supabase.from("user_roles").insert({ user_id: prof.id, role: "editor" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Editor approved"); setEmail(""); qc.invalidateQueries({ queryKey: ["editors"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("user_roles").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["editors"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Editors</h2>
        <p className="text-sm text-muted-foreground">Owners can approve users as editors. The user must sign in once first.</p>
      </div>
      <Card className="p-4">
        <Label>Approve user by email</Label>
        <div className="flex gap-2 mt-1">
          <Input placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={() => add.mutate()} disabled={!email.trim() || add.isPending}>
            <ShieldCheck className="h-4 w-4 mr-1" /> Approve
          </Button>
        </div>
      </Card>

      <div className="grid gap-2">
        {(editors || []).map((r: any) => (
          <Card key={r.id} className="p-3 flex items-center gap-3">
            <Shield className={`h-5 w-5 ${r.role === "owner" ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{r.profiles?.display_name || r.profiles?.email || r.user_id}</div>
              <div className="text-xs text-muted-foreground">{r.profiles?.email}</div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded border bg-muted">{r.role}</span>
            {r.role !== "owner" && (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)}>
                <ShieldOff className="h-4 w-4 mr-1" /> Revoke
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
