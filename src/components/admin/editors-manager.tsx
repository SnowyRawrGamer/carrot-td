import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type RoleKind = "owner" | "editor" | "viewer";

export function EditorsManager() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const { data: rows, isLoading } = useQuery({
    queryKey: ["all-users-roles"],
    queryFn: async () => {
      // First try to get profiles. If RPC fails, fallback to simple select
      let profiles: any[] = [];
      const { data: rpcProfiles, error: rpcError } = await supabase.rpc("admin_list_profiles");
      
      if (rpcError) {
        console.warn("admin_list_profiles RPC failed, falling back to profiles table", rpcError);
        const { data: tableProfiles, error: tableError } = await supabase.from("profiles").select("id, email, display_name, public_name");
        if (tableError) throw tableError;
        profiles = tableProfiles || [];
      } else {
        profiles = rpcProfiles || [];
      }

      profiles.sort((a: any, b: any) => (a.email || "").localeCompare(b.email || ""));
      const ids = profiles.map((p) => p.id);
      
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("id, user_id, role").in("user_id", ids)
        : { data: [] as any[] };
        
      const roleMap = new Map<string, { id: string; role: RoleKind }>();
      for (const r of roles || []) roleMap.set(r.user_id, { id: r.id, role: r.role as RoleKind });
      
      return profiles.map((p) => ({
        ...p,
        role: (roleMap.get(p.id)?.role ?? "viewer") as RoleKind,
        roleRowId: roleMap.get(p.id)?.id ?? null,
      }));
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: RoleKind }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      if (newRole !== "viewer") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["all-users-roles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePublicName = useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const { error } = await supabase.from("profiles").update({ public_name: name }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Public name updated");
      qc.invalidateQueries({ queryKey: ["all-users-roles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Users & roles</h2>
        <p className="text-sm text-muted-foreground">
          Every signed-in user shows here. Owners can promote anyone to editor or owner, and set the
          public display name shown on the Editors page.
        </p>
      </div>

      <div className="grid gap-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading users...</div>
        ) : (rows || []).map((u) => (
          <Card key={u.id} className="p-3 flex items-center gap-3 flex-wrap">
            <Shield
              className={`h-5 w-5 ${
                u.role === "owner" ? "text-primary" : u.role === "editor" ? "text-foreground" : "text-muted-foreground"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{u.display_name || u.email || u.id}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>

            <Input
              placeholder="Public name on Editors page"
              defaultValue={u.public_name || ""}
              className="w-48"
              onChange={(e) => setEdits((prev) => ({ ...prev, [u.id]: e.target.value }))}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                updatePublicName.mutate({ userId: u.id, name: edits[u.id] ?? u.public_name ?? "" })
              }
            >
              Save name
            </Button>

            <Select
              value={u.role}
              onValueChange={(v) => changeRole.mutate({ userId: u.id, newRole: v as RoleKind })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </Card>
        ))}
        {rows && rows.length === 0 && !isLoading && (
          <Card className="p-4 text-sm text-muted-foreground">No users found.</Card>
        )}
      </div>
    </div>
  );
}
