import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type RoleKind = "owner" | "editor" | "viewer";

export function EditorsManager() {
  const qc = useQueryClient();

  const { data: rows } = useQuery({
    queryKey: ["all-users-roles"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .order("email");
      if (error) throw error;
      const ids = (profiles || []).map((p) => p.id);
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("id, user_id, role").in("user_id", ids)
        : { data: [] as any[] };
      const roleMap = new Map<string, { id: string; role: RoleKind }>();
      for (const r of roles || []) roleMap.set(r.user_id, { id: r.id, role: r.role as RoleKind });
      return (profiles || []).map((p) => ({
        ...p,
        role: (roleMap.get(p.id)?.role ?? "viewer") as RoleKind,
        roleRowId: roleMap.get(p.id)?.id ?? null,
      }));
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: RoleKind }) => {
      // Remove any existing role rows for this user, then insert the new one
      // (unless the new role is 'viewer', which we treat as "no row").
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Users & roles</h2>
        <p className="text-sm text-muted-foreground">
          Every signed-in user shows here. Owners can promote anyone to editor or owner.
        </p>
      </div>

      <div className="grid gap-2">
        {(rows || []).map((u) => (
          <Card key={u.id} className="p-3 flex items-center gap-3">
            <Shield
              className={`h-5 w-5 ${
                u.role === "owner" ? "text-primary" : u.role === "editor" ? "text-foreground" : "text-muted-foreground"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{u.display_name || u.email || u.id}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>
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
        {rows && rows.length === 0 && (
          <Card className="p-4 text-sm text-muted-foreground">No users found.</Card>
        )}
      </div>
    </div>
  );
}
