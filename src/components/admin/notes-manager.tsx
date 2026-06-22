import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MessageSquare, Trash2, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const COLUMNS: { key: string; label: string }[] = [
  { key: "viewer_ideas", label: "Viewer Ideas" },
  { key: "declined", label: "Declined" },
  { key: "idea", label: "Idea" },
  { key: "maybe", label: "Maybe" },
  { key: "working", label: "Working on it" },
  { key: "almost", label: "Almost completed" },
  { key: "completed", label: "Completed" },
];

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
      const { data, error } = await supabase
        .from("site_notes")
        .select("*, author:profiles!created_by(display_name, public_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!newTitle.trim()) throw new Error("Give it a title");
      const { error } = await supabase.from("site_notes").insert({
        title: newTitle.trim(), body: newBody.trim() || null, created_by: user.id, status: "idea",
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
      const { error } = await supabase.from("site_notes").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-notes"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); setOpenNote(null); qc.invalidateQueries({ queryKey: ["site-notes"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function authorName(n: any) {
    return n.author?.public_name || n.author?.display_name || "Unknown";
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

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {COLUMNS.map((col) => {
          const colNotes = (notes || []).filter((n: any) => n.status === col.key);
          return (
            <div key={col.key} className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">{col.label} ({colNotes.length})</h3>
              {colNotes.map((n: any) => (
                <Card key={n.id} className="p-3 cursor-pointer hover:border-primary/40" onClick={() => setOpenNote(n)}>
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">by {authorName(n)}</div>
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

  const { data: comments } = useQuery({
    queryKey: ["note-comments", note.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_note_comments")
        .select("*, author:profiles!author_id(display_name, public_name)")
        .eq("note_id", note.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const postComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!comment.trim()) return;
      const { error } = await supabase.from("site_note_comments").insert({ note_id: note.id, author_id: user.id, body: comment.trim() });
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
        <h4 className="text-sm font-semibold flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Comments ({comments?.length || 0})</h4>
        {(comments || []).map((c: any) => (
          <div key={c.id} className="text-sm bg-muted/40 rounded p-2">
            <span className="font-medium">{c.author?.public_name || c.author?.display_name || "Unknown"}:</span> {c.body}
          </div>
        ))}
        <div className="flex gap-2">
          <Input placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button size="sm" onClick={() => postComment.mutate()}>Send</Button>
        </div>
      </div>

      <div className="flex justify-end border-t pt-3">
        <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" /> Delete post</Button>
      </div>
    </div>
  );
}
