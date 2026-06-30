import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Plus, Trash2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export function ForumManager() {
  return (
    <Tabs defaultValue="queue">
      <TabsList>
        <TabsTrigger value="queue">Approval Queue</TabsTrigger>
        <TabsTrigger value="flags">Flags</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="tags">Tags</TabsTrigger>
      </TabsList>
      <TabsContent value="queue" className="mt-4"><ApprovalQueue /></TabsContent>
      <TabsContent value="flags" className="mt-4"><FlagsPanel /></TabsContent>
      <TabsContent value="users" className="mt-4"><UsersPanel /></TabsContent>
      <TabsContent value="tags" className="mt-4"><TagsPanel /></TabsContent>
    </Tabs>
  );
}

function ApprovalQueue() {
  const qc = useQueryClient();

  const { data: posts } = useQuery({
    queryKey: ["pending-posts"],
    queryFn: async () => {
      const { data } = await supabase.from("forum_posts")
        .select("*, author:profiles!author_id(username, trust_level)")
        .eq("status", "pending").order("created_at");
      return data || [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["pending-comments"],
    queryFn: async () => {
      const { data } = await supabase.from("forum_comments")
        .select("*, author:profiles!author_id(username), post:forum_posts!post_id(title)")
        .eq("status", "pending").order("created_at");
      return data || [];
    },
  });

  const setPostStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("forum_posts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["pending-posts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const setCommentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("forum_comments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["pending-comments"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Pending Posts ({posts?.length || 0})</h3>
        <div className="space-y-2">
          {(!posts || posts.length === 0) && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
          {posts?.map((p: any) => (
            <Card key={p.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">by {p.author?.username} · {new Date(p.created_at).toLocaleDateString()}</div>
                  <p className="text-sm mt-1 line-clamp-3">{p.body}</p>
                  {p.image_url && <img src={p.image_url} alt="" className="mt-2 rounded max-h-32 object-cover" />}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" onClick={() => setPostStatus.mutate({ id: p.id, status: "approved" })}><Check className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setPostStatus.mutate({ id: p.id, status: "rejected" })}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Pending Replies ({comments?.length || 0})</h3>
        <div className="space-y-2">
          {(!comments || comments.length === 0) && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
          {comments?.map((c: any) => (
            <Card key={c.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">by {c.author?.username} on "{c.post?.title}" · {new Date(c.created_at).toLocaleDateString()}</div>
                  <p className="text-sm mt-1">{c.body}</p>
                  {c.image_url && <img src={c.image_url} alt="" className="mt-2 rounded max-h-32 object-cover" />}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" onClick={() => setCommentStatus.mutate({ id: c.id, status: "approved" })}><Check className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setCommentStatus.mutate({ id: c.id, status: "rejected" })}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlagsPanel() {
  const qc = useQueryClient();

  const { data: flags } = useQuery({
    queryKey: ["forum-flags"],
    queryFn: async () => {
      const { data } = await supabase.from("forum_flags")
        .select("*, reporter:profiles!user_id(username), post:forum_posts(title, body), comment:forum_comments(body)")
        .eq("resolved", false).order("created_at");
      return data || [];
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, valid }: { id: string; valid: boolean }) => {
      const { error } = await supabase.from("forum_flags").update({ resolved: true, resolved_valid: valid }).eq("id", id);
      if (error) throw error;
      if (valid) {
        const flag = flags?.find((f: any) => f.id === id);
        if (flag?.post_id) await supabase.from("forum_posts").update({ status: "deleted" }).eq("id", flag.post_id);
        if (flag?.comment_id) await supabase.from("forum_comments").update({ status: "deleted" }).eq("id", flag.comment_id);
      }
    },
    onSuccess: () => { toast.success("Flag resolved"); qc.invalidateQueries({ queryKey: ["forum-flags"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      {(!flags || flags.length === 0) && <p className="text-sm text-muted-foreground">No open flags.</p>}
      {flags?.map((f: any) => (
        <Card key={f.id} className="p-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">Flagged by {f.reporter?.username} · Reason: {f.reason}</div>
              {f.post && <p className="text-sm font-medium">Post: {f.post.title}</p>}
              {f.comment && <p className="text-sm">Comment: {f.comment.body}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="destructive" onClick={() => resolve.mutate({ id: f.id, valid: true })}>Remove content</Button>
              <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: f.id, valid: false })}>Dismiss</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const [banTarget, setBanTarget] = useState<any | null>(null);
  const [banDays, setBanDays] = useState<string>("");
  const [banReason, setBanReason] = useState("");

  const { data: users } = useQuery({
    queryKey: ["forum-users"],
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_list_profiles");
      return data || [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["forum-user-roles"],
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("id, username, trust_level, help_points").order("help_points", { ascending: false });
      const { data: mods } = await supabase.from("profile_moderation").select("user_id, forum_banned_until, forum_ban_reason");
      const modMap = new Map((mods || []).map((m: any) => [m.user_id, m]));
      return (profs || []).map((p: any) => ({ ...p, forum_banned_until: modMap.get(p.id)?.forum_banned_until ?? null, forum_ban_reason: modMap.get(p.id)?.forum_ban_reason ?? null }));
    },
  });

  const updateTrust = useMutation({
    mutationFn: async ({ id, trust_level }: { id: string; trust_level: string }) => {
      const { error } = await supabase.from("profiles").update({ trust_level }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Trust level updated"); qc.invalidateQueries({ queryKey: ["forum-user-roles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const applyBan = useMutation({
    mutationFn: async () => {
      if (!banTarget) return;
      const until = banDays === "0" || banDays === "" ? "infinity" : new Date(Date.now() + Number(banDays) * 86400000).toISOString();
      const { error } = await supabase.from("profile_moderation").upsert({ user_id: banTarget.id, forum_banned_until: until, forum_ban_reason: banReason.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ban applied"); setBanTarget(null); setBanDays(""); setBanReason(""); qc.invalidateQueries({ queryKey: ["forum-user-roles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const unban = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profile_moderation").upsert({ user_id: id, forum_banned_until: null, forum_ban_reason: null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Unbanned"); qc.invalidateQueries({ queryKey: ["forum-user-roles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      {(roles || []).map((u: any) => {
        const isBanned = u.forum_banned_until && (u.forum_banned_until === "infinity" || new Date(u.forum_banned_until) > new Date());
        return (
          <Card key={u.id} className="p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium">{u.username || "(no username)"}</div>
              <div className="text-xs text-muted-foreground">
                {u.help_points} HP
                {isBanned && <span className="ml-2 text-destructive">Banned{u.forum_banned_until !== "infinity" ? ` until ${new Date(u.forum_banned_until).toLocaleDateString()}` : " permanently"}</span>}
              </div>
            </div>
            <Select value={u.trust_level || "basic"} onValueChange={(v) => updateTrust.mutate({ id: u.id, trust_level: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="semi_trusted">Semi-Trusted</SelectItem>
                <SelectItem value="trusted">Trusted</SelectItem>
                <SelectItem value="basic_moderator">Basic Moderator</SelectItem>
                <SelectItem value="trusted_moderator">Trusted Moderator</SelectItem>
              </SelectContent>
            </Select>
            {isBanned ? (
              <Button size="sm" variant="outline" onClick={() => unban.mutate(u.id)}>Unban</Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => setBanTarget(u)}><Shield className="h-4 w-4 mr-1" /> Ban</Button>
            )}
          </Card>
        );
      })}

      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ban {banTarget?.username}?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Duration (days) — leave blank or 0 for permanent</Label>
              <Input type="number" value={banDays} onChange={(e) => setBanDays(e.target.value)} placeholder="e.g. 7" min="0" />
            </div>
            <div>
              <Label>Reason (shown to user)</Label>
              <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Optional" />
            </div>
            <Button variant="destructive" onClick={() => applyBan.mutate()} disabled={applyBan.isPending}>Apply ban</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TagsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");

  const { data: tags } = useQuery({
    queryKey: ["forum-tags"],
    queryFn: async () => (await supabase.from("forum_tags").select("*").order("name")).data || [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name required");
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { error } = await supabase.from("forum_tags").insert({ name: name.trim(), slug, color });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setColor("#6366f1"); toast.success("Tag created"); qc.invalidateQueries({ queryKey: ["forum-tags"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("forum_tags").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Tag deleted"); qc.invalidateQueries({ queryKey: ["forum-tags"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 flex gap-2 items-end">
        <div className="flex-1"><Label>Tag name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Color</Label><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded border" /></div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}><Plus className="h-4 w-4 mr-1" /> Create</Button>
      </Card>
      <div className="space-y-2">
        {(tags || []).map((t: any) => (
          <Card key={t.id} className="p-3 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="flex-1 font-medium">{t.name}</span>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
