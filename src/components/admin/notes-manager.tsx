import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MessageSquare, Trash2, Edit2, Check, X, ThumbsUp, ThumbsDown, HelpCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const COLUMNS: { key: string; label: string }[] = [
  { key: "viewer_ideas", label: "Viewer Ideas" },
  { key: "declined", label: "Declined Ideas" },
  { key: "maybe", label: "Maybe" },
  { key: "accepted", label: "Accepted Ideas" },
  { key: "working", label: "Working on it" },
  { key: "completed", label: "Completed" },
];

const STATUS_MAP: Record<string, string> = {
  viewer_ideas: "pending",
  declined: "declined",
  maybe: "maybe",
  accepted: "accepted",
  working: "working",
  completed: "completed"
};

export function NotesManager() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [openNote, setOpenNote] = useState<any | null>(null);

  const { data: notes } = useQuery({
    queryKey: ["site-notes"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("site_notes")
          .select("*, author:profiles!created_by(display_name, public_name)")
          .order("created_at", { ascending: false });
        
        if (error) {
          if (error.code === 'PGRST108' || error.message?.includes('profiles')) {
            const { data: directData, error: directError } = await supabase
              .from("site_notes")
              .select("*")
              .order("created_at", { ascending: false });
            if (directError) throw directError;
            return directData;
          }
          throw error;
        }
        return data;
      } catch (e) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("site_notes")
          .select("*")
          .order("created_at", { ascending: false });
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!newTitle.trim()) throw new Error("Give it a title");
      const { error } = await supabase.from("site_notes").insert({
        title: newTitle.trim(), 
        body: newBody.trim() || null, 
        created_by: user.id, 
        status: "viewer_ideas",
        is_feedback: false
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Posted");
      setCreating(false); setNewTitle(""); setNewBody("");
      qc.invalidateQueries({ queryKey: ["site-notes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error: noteError } = await supabase
        .from("site_notes")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (noteError) throw noteError;

      const userStatus = STATUS_MAP[status];
      if (userStatus) {
        const { error: feedbackError } = await supabase
          .from("site_feedback")
          .update({ status: userStatus, updated_at: new Date().toISOString() })
          .eq("note_id", id);
        if (feedbackError) {
          console.error("Feedback status sync failed", feedbackError);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-notes"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: feedbackError } = await supabase
        .from("site_feedback")
        .delete()
        .eq("note_id", id);
      if (feedbackError) console.warn("Feedback deletion failed", feedbackError);

      const { error } = await supabase.from("site_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); setOpenNote(null); qc.invalidateQueries({ queryKey: ["site-notes"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function authorName(n: any) {
    return n.author?.public_name || n.author?.display_name || "User";
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Notes & Ideas</h2>
          <p className="text-sm text-muted-foreground">Internal board — visible to editors and owners only.</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New post</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New idea</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>
              <div><Label>Details</Label><Textarea rows={4} value={newBody} onChange={(e) => setNewBody(e.target.value)} /></div>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>Post</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {COLUMNS.map((col) => {
          const colNotes = (notes || []).filter((n: any) => n.status === col.key);
          return (
            <div key={col.key} className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">{col.label} ({colNotes.length})</h3>
              {colNotes.map((n: any) => (
                <Card key={n.id} className="p-3 cursor-pointer hover:border-primary/40" onClick={() => setOpenNote(n)}>
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">by {authorName(n)}</div>
                  {n.is_feedback === true && (
                    <div className="mt-2 text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded inline-block">
                      User Feedback
                    </div>
                  )}
                </Card>
              ))}
              {colNotes.length === 0 && <p className="text-xs text-muted-foreground">Nothing here.</p>}
            </div>
          );
        })}
      </div>

      <Dialog open={!!openNote} onOpenChange={(o) => !o && setOpenNote(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {openNote && (
            <NoteDetail
              note={openNote}
              onMove={(status) => move.mutate({ id: openNote.id, status })}
              onDelete={() => remove.mutate(openNote.id)}
              authorName={authorName(openNote)}
              onUpdated={() => {
                qc.invalidateQueries({ queryKey: ["site-notes"] });
                setOpenNote(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteDetail({ note, onMove, onDelete, authorName, onUpdated }: { note: any; onMove: (s: string) => void; onDelete: () => void; authorName: string; onUpdated: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editBody, setEditBody] = useState(note.body || "");
  const [adminResponse, setAdminResponse] = useState("");

  const { data: feedback } = useQuery({
    queryKey: ["linked-feedback", note.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_feedback")
        .select("*")
        .eq("note_id", note.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!note.id // Always check for feedback for every note
  });

  const isFeedback = !!feedback;

  const { data: comments } = useQuery({
    queryKey: ["note-comments", note.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("site_note_comments")
          .select("*, author:profiles!author_id(display_name, public_name)")
          .eq("note_id", note.id)
          .order("created_at");
        
        if (error) {
          if (error.code === 'PGRST108' || error.message?.includes('profiles')) {
            const { data: directData, error: directError } = await supabase
              .from("site_note_comments")
              .select("*")
              .eq("note_id", note.id)
              .order("created_at");
            if (directError) throw directError;
            return directData;
          }
          throw error;
        }
        return data;
      } catch (e) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("site_note_comments")
          .select("*")
          .eq("note_id", note.id)
          .order("created_at");
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
    },
  });

  const postComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!comment.trim()) return;
      const { error } = await supabase.from("site_note_comments").insert({ 
        note_id: note.id, 
        author_id: user.id, 
        body: comment.trim() 
      });
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["note-comments", note.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_notes")
        .update({
          title: editTitle.trim(),
          body: editBody.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", note.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      setIsEditing(false);
      onUpdated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleResponse = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase
        .from("site_feedback")
        .update({ allow_response: val })
        .eq("note_id", note.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings updated");
      qc.invalidateQueries({ queryKey: ["linked-feedback", note.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resolveFeedback = useMutation({
    mutationFn: async (resolution: "accepted" | "declined" | "maybe") => {
      const { error: feedbackError } = await supabase
        .from("site_feedback")
        .update({
          status: resolution,
          admin_response: adminResponse.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq("note_id", note.id);

      if (feedbackError) throw feedbackError;

      if (adminResponse.trim()) {
        if (user?.id) {
          await supabase.from("site_note_comments").insert({
            note_id: note.id,
            author_id: user.id,
            body: adminResponse.trim()
          });
        }
      }

      onMove(resolution);
    },
    onSuccess: () => {
      toast.success("Feedback resolved");
      onUpdated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        {isEditing ? (
          <div className="flex-1 space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Details</Label>
              <Textarea rows={4} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => updateNote.mutate()} disabled={updateNote.isPending}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <DialogHeader><DialogTitle>{note.title}</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">by {authorName}</p>
            {note.body && <p className="text-sm mt-3 whitespace-pre-wrap">{note.body}</p>}
          </div>
        )}
        {!isEditing && (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isFeedback && (
        <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold flex items-center gap-1.5"><Shield className="h-4 w-4" /> Resolve Feedback</h4>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Allow Response</Label>
              <Switch 
                checked={feedback?.allow_response || false} 
                onCheckedChange={(val) => toggleResponse.mutate(val)} 
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Quick Response (optional)</Label>
            <Input 
              placeholder="Feedback response to the user..." 
              className="h-8 text-sm"
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => resolveFeedback.mutate("accepted")}
              disabled={resolveFeedback.isPending}
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Accept
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              className="flex-1"
              onClick={() => resolveFeedback.mutate("declined")}
              disabled={resolveFeedback.isPending}
            >
              <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Decline
            </Button>
            <Button 
              size="sm" 
              variant="secondary" 
              className="flex-1"
              onClick={() => resolveFeedback.mutate("maybe")}
              disabled={resolveFeedback.isPending}
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1" /> Maybe
            </Button>
          </div>
        </div>
      )}

      <div>
        <Label>Status</Label>
        <Select value={note.status} onValueChange={onMove}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border-t pt-3 space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Conversation ({comments?.length || 0})</h4>
        <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
          {(comments || []).map((c: any) => {
             const senderName = c.author?.public_name || c.author?.display_name || "User";
             return (
               <div key={c.id} className={`text-sm rounded p-2 ${c.author_id === user?.id ? 'bg-primary/5 border-l-2 border-primary ml-4' : 'bg-muted/40 mr-4'}`}>
                 <div className="flex justify-between items-center mb-1">
                   <span className="font-bold text-[10px] uppercase tracking-wider">{senderName}</span>
                   <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                 </div>
                 {c.body}
               </div>
             );
          })}
          {(!comments || comments.length === 0) && (
            <p className="text-xs text-muted-foreground py-2 italic text-center">No messages in this thread.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postComment.mutate()} />
          <Button size="sm" onClick={() => postComment.mutate()} disabled={!comment.trim() || postComment.isPending}>Send</Button>
        </div>
      </div>

      <div className="flex justify-end border-t pt-3">
        <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" /> Delete post</Button>
      </div>
    </div>
  );
}
