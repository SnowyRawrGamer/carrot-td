import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { slugify } from "@/lib/utils-slug";
import { toast } from "sonner";

export function SimpleManager({ kind }: { kind: "maps" | "gamemodes" }) {
  const qc = useQueryClient();
  const label = kind === "maps" ? "Map" : "Gamemode";
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: items } = useQuery({
    queryKey: [`admin-${kind}`],
    queryFn: async () => {
      // Note: We use the table name directly. If it doesn't exist yet in Supabase,
      // this will return an error which we'll handle gracefully in the UI.
      const { data, error } = await supabase.from(kind as any).select("*").order("name");
      if (error) {
        console.error(`Error fetching ${kind}:`, error);
        return [];
      }
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(kind as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${label} deleted`);
      qc.invalidateQueries({ queryKey: [`admin-${kind}`] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">{label}s</h2>
          <p className="text-sm text-muted-foreground">{items?.length || 0} {kind}</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add {label.toLowerCase()}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New {label.toLowerCase()}</DialogTitle></DialogHeader>
            <SimpleForm kind={kind} onDone={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {(!items || items.length === 0) ? (
        <Card className="p-10 text-center text-muted-foreground">
          No {kind} found. Click <strong>Add {label.toLowerCase()}</strong> to create one.
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map((it: any) => (
            <Card key={it.id} className="p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded bg-muted overflow-hidden shrink-0">
                {it.image_url ? (
                  <img src={it.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground">/{it.slug}</div>
              </div>
              <Dialog open={editing?.id === it.id} onOpenChange={(o) => setEditing(o ? it : null)}>
                <DialogTrigger asChild><Button variant="outline" size="sm">Edit</Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Edit {it.name}</DialogTitle></DialogHeader>
                  <SimpleForm kind={kind} existing={it} onDone={() => setEditing(null)} />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {it.name}?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(it.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SimpleForm({ kind, existing, onDone }: { kind: "maps" | "gamemodes"; existing?: any; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(existing?.name || "");
  const [slug, setSlug] = useState(existing?.slug || "");
  const [slugTouched, setSlugTouched] = useState(!!existing);
  const [imageUrl, setImageUrl] = useState(existing?.image_url || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(existing?.gallery_urls || []);

  const autoSlug = (v: string) => {
    if (!slugTouched) setSlug(slugify(v));
    setName(v);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !slug.trim()) throw new Error("Name and slug are required");
      const payload: any = {
        name: name.trim(),
        slug: slug.trim(),
        image_url: imageUrl.trim() || null,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
        gallery_urls: galleryUrls.filter(u => u.trim() !== ""),
      };

      if (existing?.id) {
        const { error } = await supabase.from(kind as any).update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(kind as any).insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved successfully");
      qc.invalidateQueries({ queryKey: [`admin-${kind}`] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Title / Name *</Label>
          <Input value={name} onChange={(e) => autoSlug(e.target.value)} placeholder="E.g. Grasslands" />
        </div>
        <div className="space-y-2">
          <Label>Slug *</Label>
          <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="grasslands" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Main Image URL</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this..." />
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label>Gallery / Additional Image URLs</Label>
        <div className="space-y-2">
          {galleryUrls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <Input value={url} onChange={(e) => setGalleryUrls(cur => cur.map((u, j) => i === j ? e.target.value : u))} placeholder="https://..." />
              <Button variant="ghost" size="icon" onClick={() => setGalleryUrls(cur => cur.filter((_, j) => i !== j))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setGalleryUrls(cur => [...cur, ""])}>
            <Plus className="h-4 w-4 mr-1" /> Add Image
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
