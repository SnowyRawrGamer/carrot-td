import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare, Plus, Pin, Settings, Info, Mail } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InboxDrawer } from "@/components/forum/InboxDrawer";

export const Route = createFileRoute("/forum/")({
  head: () => ({ meta: [{ title: "Forum — Carrot TD Values" }] }),
  component: ForumIndex,
});

function trustLabel(level: string) {
  if (level === "trusted_moderator" || level === "basic_moderator") return "Moderator";
  if (level === "trusted") return "Trusted";
  if (level === "semi_trusted") return "Semi-Trusted";
  return "New";
}

function ForumIndex() {
  const { user } = useAuth();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "activity">("newest");
  const [inboxOpen, setInboxOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("username, trust_level").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["forum-tags"],
    queryFn: async () => (await supabase.from("forum_tags").select("*").order("name")).data || [],
  });

  const { data: posts } = useQuery({
    queryKey: ["forum-posts", tagFilter, sort],
    queryFn: async () => {
      let q = supabase.from("forum_posts")
        .select("id, title, status, pinned, view_count, created_at, updated_at, author:profiles!author_id(username, trust_level)")
        .eq("status", "approved");
      if (sort === "newest") q = q.order("created_at", { ascending: false });
      else q = q.order("updated_at", { ascending: false });
      const { data: rows } = await q;

      if (tagFilter) {
        const { data: tagged } = await supabase.from("forum_post_tags").select("post_id").eq("tag_id", tagFilter);
        const ids = new Set((tagged || []).map((r: any) => r.post_id));
        return (rows || []).filter((p: any) => ids.has(p.id));
      }
      return rows || [];
    },
  });

  const { data: commentCounts } = useQuery({
    queryKey: ["forum-comment-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("forum_comments").select("post_id").eq("status", "approved");
      const counts: Record<string, number> = {};
      for (const r of data || []) counts[r.post_id] = (counts[r.post_id] || 0) + 1;
      return counts;
    },
  });

  const pinned = (posts || []).filter((p: any) => p.pinned);
  const regular = (posts || []).filter((p: any) => !p.pinned);

  function PostRow({ p }: { p: any }) {
    const label = trustLabel(p.author?.trust_level || "basic");
    return (
      <Link to="/forum/post/$id" params={{ id: p.id }}>
        <Card className="p-4 hover:border-primary/40 transition flex items-start gap-3">
          {p.pinned && <Pin className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{p.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              by <span className="font-medium">{p.author?.username || "Unknown"}</span>
              {label !== "New" && <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{label}</span>}
              {" "}· {new Date(p.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <MessageSquare className="h-3.5 w-3.5" />
            {commentCounts?.[p.id] || 0}
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Forum</h1>
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link to="/settings">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </Link>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Trust Levels</DialogTitle></DialogHeader>
                <div className="space-y-4 text-sm">
                  <div className="border-l-4 border-muted p-3 bg-muted/20">
                    <p className="font-bold">Tier 1 (New)</p>
                    <p className="text-muted-foreground">Posts & comments need approval before appearing.</p>
                  </div>
                  <div className="border-l-4 border-blue-500 p-3 bg-blue-500/5">
                    <p className="font-bold text-blue-500">Tier 2 (Semi-Trusted)</p>
                    <p className="text-muted-foreground">Comments appear instantly, posts need approval.</p>
                  </div>
                  <div className="border-l-4 border-green-500 p-3 bg-green-500/5">
                    <p className="font-bold text-green-500">Tier 3 (Trusted)</p>
                    <p className="text-muted-foreground">All posts & comments appear instantly. Can edit own posts. Can use Private Messaging (with other trusted users).</p>
                  </div>
                  <div className="border-l-4 border-primary p-3 bg-primary/5">
                    <p className="font-bold text-primary">Tier 4 (Basic Mod)</p>
                    <p className="text-muted-foreground">Can approve pending content, pin posts, message anyone, and review flagged private messages.</p>
                  </div>
                  <div className="border-l-4 border-primary p-3 bg-primary/10">
                    <p className="font-bold text-primary">Tier 5 (Owner/Mod)</p>
                    <p className="text-muted-foreground">Full administrative control.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Discuss Carrot TD with the community.</p>
          {profile && (
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-2 bg-muted/50 inline-block px-2 py-0.5 rounded">
              Your Level: <span className="text-primary">{trustLabel(profile.trust_level)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {user && (
            <Button variant="outline" onClick={() => setInboxOpen(true)}>
              <Mail className="h-4 w-4 mr-2" /> Messages
            </Button>
          )}
          {user && (
            <Button asChild><Link to="/forum/new"><Plus className="h-4 w-4 mr-1" /> New post</Link></Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setTagFilter(null)} className={`px-3 py-1 rounded-full text-xs border transition ${!tagFilter ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}>All</button>
        {(tags || []).map((t: any) => (
          <button key={t.id} onClick={() => setTagFilter(t.id === tagFilter ? null : t.id)}
            className={`px-3 py-1 rounded-full text-xs border transition ${tagFilter === t.id ? "text-white" : "bg-card hover:bg-accent"}`}
            style={tagFilter === t.id ? { backgroundColor: t.color, borderColor: t.color } : { borderColor: t.color, color: t.color }}>
            {t.name}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          {(["newest","activity"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={`px-3 py-1 rounded-full text-xs border transition ${sort === s ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}>
              {s === "newest" ? "Newest" : "Activity"}
            </button>
          ))}
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pinned</p>
          {pinned.map((p: any) => <PostRow key={p.id} p={p} />)}
        </div>
      )}

      <div className="space-y-2">
        {regular.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">No posts yet. Be the first!</Card>
        ) : regular.map((p: any) => <PostRow key={p.id} p={p} />)}
      </div>

      <InboxDrawer open={inboxOpen} onOpenChange={setInboxOpen} />
    </Page>
  );
}
