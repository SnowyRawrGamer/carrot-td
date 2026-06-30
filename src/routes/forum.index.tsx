import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare, Plus, Pin, Settings } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/forum/")({
  head: () => ({ meta: [{ title: "Forum — Carrot TD Values" }] }),
  component: ForumIndex,
});

function trustLabel(level: string) {
  if (level === "trusted_moderator" || level === "basic_moderator") return "Moderator";
  if (level === "trusted") return "Trusted";
  return null;
}

function ForumIndex() {
  const { user } = useAuth();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "activity">("newest");

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
              {label && <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{label}</span>}
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
          </div>
          <p className="text-muted-foreground text-sm mt-1">Discuss Carrot TD with the community.</p>
        </div>
        {user && (
          <Button asChild><Link to="/forum/new"><Plus className="h-4 w-4 mr-1" /> New post</Link></Button>
        )}
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
    </Page>
  );
}
