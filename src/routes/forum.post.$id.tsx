import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Flag, Trash2 } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/forum/post/$id")({
  component: ForumPost,
});

function trustLabel(level: string) {
  if (level === "trusted_moderator" || level === "basic_moderator") return "Moderator";
  if (level === "trusted") return "Trusted";
  return null;
}

function BanCheck({ profile, children }: { profile: any; children: React.ReactNode }) {
  const isBanned = profile?.forum_banned_until && (profile.forum_banned_until === "infinity" || new Date(profile.forum_banned_until) > new Date());
  if (!isBanned) return <>{children}</>;
  return (
    <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
      You've been banned from the forum
      {profile.forum_banned_until !== "infinity" ? ` until ${new Date(profile.forum_banned_until).toLocaleDateString()}` : " permanently"}.
      {profile.forum_ban_reason && ` Reason: ${profile.forum_ban_reason}`}
    </Card>
  );
}

function ForumPost() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [replyBody, setReplyBody] = useState("");
  const [replyImage, setReplyImage] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [flagTarget, setFlagTarget] = useState<{ type: "post" | "comment"; id: string } | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("username, trust_level, forum_banned_until, forum_ban_reason").eq("id", user!.id).single()).data,
  });

  const { data } = useQuery({
    queryKey: ["forum-post", id],
    queryFn: async () => {
      await supabase.rpc("increment_view_count", { post_id: id }).catch(() => {});
      const { data: post } = await supabase.from("forum_posts")
        .select("*, author:profiles!author_id(id, username, trust_level), tags:forum_post_tags(tag:forum_tags(id, name, color))")
        .eq("id", id).single();
      const { data: comments } = await supabase.from("forum_comments")
        .select("*, author:profiles!author_id(id, username, trust_level)")
        .eq("post_id", id).eq("status", "approved").order("created_at");
      const { data: likes } = await supabase.from("forum_likes").select("post_id, comment_id, user_id").or(`post_id.eq.${id},comment_id.in.(${(comments || []).map((c: any) => c.id).join(",")||"null"})`);
      return { post, comments: comments || [], likes: likes || [] };
    },
  });

  const isStaff = ["basic_moderator","trusted_moderator"].includes(profile?.trust_level || "");

  const postComment = useMutation({
    mutationFn: async () => {
      if (!user || !profile?.username) throw new Error("Set a username first");
      if (!replyBody.trim()) throw new Error("Comment can't be empty");
      const needsApproval = !["semi_trusted","trusted","basic_moderator","trusted_moderator"].includes(profile?.trust_level || "");
      const status = needsApproval ? "pending" : "approved";
      const { error } = await supabase.from("forum_comments").insert({
        post_id: id, author_id: user.id, body: replyBody.trim(),
        image_url: replyImage.trim() || null, status,
      });
      if (error) throw error;
      return needsApproval;
    },
    onSuccess: (needsApproval) => {
      setReplyBody(""); setReplyImage("");
      qc.invalidateQueries({ queryKey: ["forum-post", id] });
      if (needsApproval) toast.success("Reply submitted for review!");
      else toast.success("Reply posted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ type, targetId }: { type: "post" | "comment"; targetId: string }) => {
      if (!user) throw new Error("Sign in to like");
      const col = type === "post" ? "post_id" : "comment_id";
      const existing = data?.likes.find((l: any) => l.user_id === user.id && l[col] === targetId);
      if (existing) {
        await supabase.from("forum_likes").delete().eq("id", existing.id);
      } else {
        await supabase.from("forum_likes").insert({ user_id: user.id, [col]: targetId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum-post", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const submitFlag = useMutation({
    mutationFn: async () => {
      if (!user || !flagTarget || !flagReason.trim()) throw new Error("Reason required");
      const payload: any = { user_id: user.id, reason: flagReason.trim() };
      if (flagTarget.type === "post") payload.post_id = flagTarget.id;
      else payload.comment_id = flagTarget.id;
      const { error } = await supabase.from("forum_flags").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Flagged for review"); setFlagTarget(null); setFlagReason(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteContent = useMutation({
    mutationFn: async ({ type, targetId }: { type: "post" | "comment"; targetId: string }) => {
      if (type === "post") {
        await supabase.from("forum_posts").update({ status: "deleted" }).eq("id", targetId);
      } else {
        await supabase.from("forum_comments").update({ status: "deleted" }).eq("id", targetId);
      }
    },
    onSuccess: (_, { type }) => {
      if (type === "post") navigate({ to: "/forum" });
      else qc.invalidateQueries({ queryKey: ["forum-post", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!data?.post) return <Page><div className="text-muted-foreground">Loading...</div></Page>;
  const { post, comments, likes } = data;
  const postLikeCount = likes.filter((l: any) => l.post_id === post.id).length;
  const myPostLike = user && likes.find((l: any) => l.post_id === post.id && l.user_id === user.id);
  const postAuthorLabel = trustLabel(post.author?.trust_level || "");

  return (
    <Page>
      <Link to="/forum" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Forum
      </Link>

      <Card className="p-5 mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-2xl font-bold">{post.title}</h1>
          {isStaff && (
            <Button size="icon" variant="ghost" onClick={() => deleteContent.mutate({ type: "post", targetId: post.id })}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span className="font-medium text-foreground">{post.author?.username}</span>
          {postAuthorLabel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{postAuthorLabel}</span>}
          <span>· {new Date(post.created_at).toLocaleDateString()}</span>
        </div>
        {post.tags?.length > 0 && (
          <div className="flex gap-1 mb-4 flex-wrap">
            {post.tags.map((t: any) => (
              <span key={t.tag.id} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: t.tag.color, color: t.tag.color }}>{t.tag.name}</span>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm">{post.body}</p>
        {post.image_url && <img src={post.image_url} alt="" className="mt-4 rounded-md max-h-96 object-contain" />}
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant={myPostLike ? "default" : "outline"} onClick={() => toggleLike.mutate({ type: "post", targetId: post.id })}>
            <Heart className="h-4 w-4 mr-1" /> {postLikeCount}
          </Button>
          {user && user.id !== post.author?.id && (
            <Button size="sm" variant="ghost" onClick={() => setFlagTarget({ type: "post", id: post.id })}>
              <Flag className="h-4 w-4 mr-1" /> Flag
            </Button>
          )}
        </div>
      </Card>

      <div className="space-y-3 mb-6">
        <h2 className="font-semibold">{comments.length} {comments.length === 1 ? "Reply" : "Replies"}</h2>
        {comments.map((c: any) => {
          const commentLikeCount = likes.filter((l: any) => l.comment_id === c.id).length;
          const myCommentLike = user && likes.find((l: any) => l.comment_id === c.id && l.user_id === user.id);
          const commentAuthorLabel = trustLabel(c.author?.trust_level || "");
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="font-medium text-foreground">{c.author?.username}</span>
                {commentAuthorLabel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{commentAuthorLabel}</span>}
                <span>· {new Date(c.created_at).toLocaleDateString()}</span>
                {isStaff && (
                  <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => deleteContent.mutate({ type: "comment", targetId: c.id })}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
              {c.image_url && <img src={c.image_url} alt="" className="mt-2 rounded-md max-h-60 object-contain" />}
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant={myCommentLike ? "default" : "ghost"} onClick={() => toggleLike.mutate({ type: "comment", targetId: c.id })}>
                  <Heart className="h-3 w-3 mr-1" /> {commentLikeCount}
                </Button>
                {user && user.id !== c.author?.id && (
                  <Button size="sm" variant="ghost" onClick={() => setFlagTarget({ type: "comment", id: c.id })}>
                    <Flag className="h-3 w-3 mr-1" /> Flag
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {user ? (
        <BanCheck profile={profile}>
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Leave a reply</h3>
            <Textarea rows={4} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Write a reply..." />
            <Input value={replyImage} onChange={(e) => setReplyImage(e.target.value)} placeholder="Image URL (optional)" />
            {profile && !["semi_trusted","trusted","basic_moderator","trusted_moderator"].includes(profile.trust_level || "") && (
              <p className="text-xs text-muted-foreground">Your reply will be reviewed before it's visible.</p>
            )}
            <Button onClick={() => postComment.mutate()} disabled={postComment.isPending}>Post reply</Button>
          </Card>
        </BanCheck>
      ) : (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary underline">Sign in</Link> to leave a reply.
        </Card>
      )}

      {flagTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-5 max-w-sm w-full mx-4 space-y-3">
            <h3 className="font-semibold">Flag this {flagTarget.type}?</h3>
            <Textarea value={flagReason} onChange={(e) => setFlagReason(e.target.value)} placeholder="Why are you flagging this?" rows={3} />
            <div className="flex gap-2">
              <Button onClick={() => submitFlag.mutate()} disabled={submitFlag.isPending}>Submit Flag</Button>
              <Button variant="outline" onClick={() => setFlagTarget(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}
