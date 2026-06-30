import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/forum/new")({
  head: () => ({ meta: [{ title: "New Post — Forum" }] }),
  component: NewPost,
});

function NewPost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("username, trust_level, forum_banned_until, forum_ban_reason").eq("id", user!.id).single()).data,
  });

  const { data: tags } = useQuery({
    queryKey: ["forum-tags"],
    queryFn: async () => (await supabase.from("forum_tags").select("*").order("name")).data || [],
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !profile) throw new Error("Sign in first");
      if (!profile.username) throw new Error("Set a username in Settings before posting");
      if (!title.trim() || !body.trim()) throw new Error("Title and body are required");

      const needsApproval = !["trusted", "basic_moderator", "trusted_moderator"].includes(profile.trust_level || "basic");
      const status = needsApproval ? "pending" : "approved";

      const { data: post, error } = await supabase.from("forum_posts").insert({
        author_id: user.id, title: title.trim(), body: body.trim(),
        image_url: imageUrl.trim() || null, status,
      }).select("id").single();
      if (error) throw error;

      if (selectedTags.length) {
        await supabase.from("forum_post_tags").insert(selectedTags.map((tag_id) => ({ post_id: post.id, tag_id })));
      }
      return { postId: post.id, needsApproval };
    },
    onSuccess: ({ postId, needsApproval }) => {
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
      if (needsApproval) {
        toast.success("Post submitted! It'll appear once a moderator approves it.");
        navigate({ to: "/forum" });
      } else {
        navigate({ to: "/forum/post/$id", params: { id: postId } });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) return (
    <Page><Card className="p-8 text-center">Please <Link to="/login" className="text-primary underline">sign in</Link> to post.</Card></Page>
  );

  const isBanned = profile?.forum_banned_until && (profile.forum_banned_until === "infinity" || new Date(profile.forum_banned_until) > new Date());
  if (isBanned) return (
    <Page>
      <Card className="p-8 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold mb-2">You're banned from the forum</h2>
        <p className="text-muted-foreground text-sm">
          {profile.forum_banned_until === "infinity" ? "This ban is permanent." : `Until ${new Date(profile.forum_banned_until!).toLocaleDateString()}.`}
        </p>
        {profile.forum_ban_reason && <p className="text-sm mt-2">Reason: {profile.forum_ban_reason}</p>}
      </Card>
    </Page>
  );

  return (
    <Page>
      <h1 className="text-2xl font-bold mb-6">New Post</h1>
      <Card className="p-5 max-w-2xl space-y-4">
        <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your post about?" /></div>
        <div><Label>Body *</Label><Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your post..." /></div>
        <div><Label>Image URL (optional)</Label><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." /></div>
        {(tags || []).length > 0 && (
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(tags || []).map((t: any) => (
                <button key={t.id} type="button"
                  onClick={() => setSelectedTags((prev) => prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id])}
                  className={`px-3 py-1 rounded-full text-xs border transition`}
                  style={selectedTags.includes(t.id) ? { backgroundColor: t.color, borderColor: t.color, color: "white" } : { borderColor: t.color, color: t.color }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {profile && !["trusted","basic_moderator","trusted_moderator"].includes(profile.trust_level || "") && (
          <p className="text-xs text-muted-foreground">Your post will be reviewed by a moderator before it becomes public.</p>
        )}
        <div className="flex gap-2">
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>{submit.isPending ? "Posting..." : "Submit Post"}</Button>
          <Button variant="outline" asChild><Link to="/forum">Cancel</Link></Button>
        </div>
      </Card>
    </Page>
  );
}
