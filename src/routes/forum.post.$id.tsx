import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Flag, Trash2, Pin, Edit2, X, Check, Mail } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { InboxDrawer } from "@/components/forum/InboxDrawer";

export const Route = createFileRoute("/forum/post/$id")({
  component: ForumPost,
});

function trustLabel(level: string) {
  if (level === "trusted_moderator" || level === "basic_moderator") return "Moderator";
  if (level === "trusted") return "Trusted";
  if (level === "semi_trusted") return "Semi-Trusted";
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

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  
  const [inboxOpen, setInboxOpen] = useState(false);
  const [targetPMUser, setTargetPMUser] = useState<string | null>(null);

  const { data: profile } = useQuery<any>({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: p } = await supabase.from("profiles").select("username, trust_level").eq("id", user!.id).single();
      const { data: m } = await supabase.from("profile_moderation").select("forum_banned_until, forum_ban_reason").eq("user_id", user!.id).maybeSingle();
      return { ...(p || {}), forum_banned_until: m?.forum_banned_until ?? null, forum_ban_reason: m?.forum_ban_reason ?? null };
    },
  });

  const { data } = useQuery({
    queryKey: ["forum-post", id],
    queryFn: async () => {
      try { await supabase.rpc("increment_view_count", { post_id: id }); } catch {}
      const { data: post } = await supabase.from("forum_posts")
        .select("*, author:profiles!author_id(id, username, trust_level), tags:forum_post_tags(tag:forum_tags(id, name, color))")
        .eq("id", id).single();
      const { data: comments } = await supabase.from("forum_comments")
        .select("*, author:profiles!author_id(id, username, trust_level)")
        .eq("post_id", id).eq("status", "approved").order("created_at");
      const { data: likes } = await supabase.from("forum_likes").select("*").or(`post_id.eq.${id},comment_id.in.(${(comments || []).map((c: any) => c.id).join(",")||"null"})`);
      
      let myFlags: any[] = [];
      if (user) {
        const { data: f } = await supabase.from("forum_flags")
          .select("id, post_id, comment_id")
          .eq("user_id", user.id)
          .eq("resolved", false);
        myFlags = f || [];
      }

      return { post, comments: comments || [], likes: likes || [], myFlags };
    },
  });

  useEffect(() => {
    if (data?.post) {
      setEditTitle(data.post.title);
      setEditBody(data.post.body);
    }
  }, [data?.post]);

  const isStaff = ["basic_moderator","trusted_moderator"].includes(profile?.trust_level || "");
  const canPin = ["trusted_moderator", "basic_moderator"].includes(profile?.trust_level || "") || profile?.trust_level === "trusted";
  const canEdit = ["trusted", "trusted_moderator", "basic_moderator"].includes(profile?.trust_level || "");

  const canPM = (authorTrust: string) => {
    if (!user) return false;
    const myLevel = profile?.trust_level || "basic";
    const isMyTrusted = ["trusted", "basic_moderator", "trusted_moderator"].includes(myLevel);
    const isOtherTrusted = ["trusted", "basic_moderator", "trusted_moderator"].includes(authorTrust);
    const isStaff = ["basic_moderator", "trusted_moderator"].includes(myLevel);
    
    // Moderators can message anyone, Trusted can message other Trusted
    return isStaff || (isMyTrusted && isOtherTrusted);
  };

  const startPM = (userId: string) => {
    setTargetPMUser(userId);
    setInboxOpen(true);
  };

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
        const { error } = await supabase.from("forum_likes").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("forum_likes").insert({ user_id: user.id, [col]: targetId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forum-post", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async () => {
      if (!canPin) throw new Error("Unauthorized");
      const { error } = await supabase.from("forum_posts").update({ pinned: !data?.post.pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(data?.post.pinned ? "Post unpinned" : "Post pinned");
      qc.invalidateQueries({ queryKey: ["forum-post", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!user || (user.id !== data?.post.author_id && !isStaff)) throw new Error("Unauthorized");
      if (!editTitle.trim() || !editBody.trim()) throw new Error("Fields required");
      const { error } = await supabase.from("forum_posts").update({
        title: editTitle.trim(),
        body: editBody.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post updated");
      setIsEditingPost(false);
      qc.invalidateQueries({ queryKey: ["forum-post", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitFlag = useMutation({
    mutationFn: async () => {
      if (!user || !flagTarget || !flagReason.trim()) throw new Error("Reason required");
      
      const col = flagTarget.type === "post" ? "post_id" : "comment_id";
      const alreadyFlagged = data?.myFlags.some((f: any) => f[col] === flagTarget.id);
      if (alreadyFlagged) throw new Error(`You have already flagged this ${flagTarget.type}`);

      const payload: any = { user_id: user.id, reason: flagReason.trim() };
      if (flagTarget.type === "post") payload.post_id = flagTarget.id;
      else payload.comment_id = flagTarget.id;
      
      const { error } = await supabase.from("forum_flags").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Flagged for review"); setFlagTarget(null); setFlagReason(""); qc.invalidateQueries({ queryKey: ["forum-post", id] }); },
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
  const { post, comments, likes, myFlags } = data;
  const postLikeCount = likes.filter((l: any) => l.post_id === post.id).length;
  const myPostLike = user && likes.find((l: any) => l.post_id === post.id && l.user_id === user.id);
  const postAuthorLabel = trustLabel(post.author?.trust_level || "");
  const alreadyFlaggedPost = myFlags.some((f: any) => f.post_id === post.id);

  return (
    <Page>
      <Link to="/forum" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Forum
      </Link>

      <Card className="p-5 mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          {isEditingPost ? (
            <div className="flex-1 space-y-3">
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{post.title}</h1>
              {post.pinned && <Pin className="h-4 w-4 text-primary fill-primary" />}
            </div>
          )}
          <div className="flex items-center gap-1">
            {canPin && (
              <Button size="icon" variant="ghost" onClick={() => togglePin.mutate()} disabled={togglePin.isPending}>
                <Pin className={`h-4 w-4 ${post.pinned ? "text-primary fill-primary" : "text-muted-foreground"}`} />
              </Button>
            )}
            {canEdit && user?.id === post.author?.id && !isEditingPost && (
              <Button size="icon" variant="ghost" onClick={() => setIsEditingPost(true)}>
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {isStaff && (
              <Button size="icon" variant="ghost" onClick={() => deleteContent.mutate({ type: "post", targetId: post.id })}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span className="font-medium text-foreground">{post.author?.username}</span>
          {postAuthorLabel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{postAuthorLabel}</span>}
          <span>· {new Date(post.created_at).toLocaleDateString()}</span>
          {post.updated_at !== post.created_at && (
            <span className="italic text-[10px]">(edited)</span>
          )}
          {user && post.author?.id !== user.id && canPM(post.author?.trust_level || "basic") && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => startPM(post.author!.id)}>
              <Mail className="h-3 w-3 mr-1" /> Message
            </Button>
          )}
        </div>
        {post.tags?.length > 0 && (
          <div className="flex gap-1 mb-4 flex-wrap">
            {post.tags.map((t: any) => (
              <span key={t.tag.id} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: t.tag.color, color: t.tag.color }}>{t.tag.name}</span>
            ))}
          </div>
        )}
        {isEditingPost ? (
          <div className="space-y-3">
            <Textarea rows={6} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingPost(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{post.body}</p>
        )}
        {post.image_url && <img src={post.image_url} alt="" className="mt-4 rounded-md max-h-96 object-contain" />}
        {!isEditingPost && (
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant={myPostLike ? "default" : "outline"} onClick={() => toggleLike.mutate({ type: "post", targetId: post.id })}>
              <Heart className={`h-4 w-4 mr-1 ${myPostLike ? "fill-current" : ""}`} /> {postLikeCount}
            </Button>
            {user && user.id !== post.author?.id && (
              <Button size="sm" variant={alreadyFlaggedPost ? "secondary" : "ghost"} onClick={() => !alreadyFlaggedPost && setFlagTarget({ type: "post", id: post.id })} disabled={alreadyFlaggedPost}>
                <Flag className={`h-4 w-4 mr-1 ${alreadyFlaggedPost ? "fill-current" : ""}`} /> {alreadyFlaggedPost ? "Flagged" : "Flag"}
              </Button>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-3 mb-6">
        <h2 className="font-semibold">{comments.length} {comments.length === 1 ? "Reply" : "Replies"}</h2>
        {comments.map((c: any) => {
          const commentLikeCount = likes.filter((l: any) => l.comment_id === c.id).length;
          const myCommentLike = user && likes.find((l: any) => l.comment_id === c.id && l.user_id === user.id);
          const commentAuthorLabel = trustLabel(c.author?.trust_level || "");
          const alreadyFlaggedComment = myFlags.some((f: any) => f.comment_id === c.id);
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="font-medium text-foreground">{c.author?.username}</span>
                {commentAuthorLabel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{commentAuthorLabel}</span>}
                <span>· {new Date(c.created_at).toLocaleDateString()}</span>
                {user && c.author?.id !== user.id && canPM(c.author?.trust_level || "basic") && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => startPM(c.author!.id)}>
                    <Mail className="h-3 w-3 mr-1" /> Message
                  </Button>
                )}
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
                  <Heart className={`h-3 w-3 mr-1 ${myCommentLike ? "fill-current" : ""}`} /> {commentLikeCount}
                </Button>
                {user && user.id !== c.author?.id && (
                  <Button size="sm" variant={alreadyFlaggedComment ? "secondary" : "ghost"} onClick={() => !alreadyFlaggedComment && setFlagTarget({ type: "comment", id: c.id })} disabled={alreadyFlaggedComment}>
                    <Flag className={`h-3 w-3 mr-1 ${alreadyFlaggedComment ? "fill-current" : ""}`} /> {alreadyFlaggedComment ? "Flagged" : "Flag"}
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
          <Link to="/auth" className="text-primary underline">Sign in</Link> to leave a reply.
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

      <InboxDrawer open={inboxOpen} onOpenChange={setInboxOpen} initialTargetUser={targetPMUser} />
    </Page>
  );
}
