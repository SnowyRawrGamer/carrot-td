import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { slugify } from "@/lib/utils-slug";
import { toast } from "sonner";

export function UpdatesManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["admin-updates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("updates").select("*").order("released_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("updates").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Update deleted"); qc.invalidateQueries({ queryKey: ["admin-updates"] }); qc.invalidateQueries({ queryKey: ["updates"] }); },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Updates</h2>
          <p className="text-sm text-muted-foreground">{items?.length || 0} updates</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add update</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New update</DialogTitle></DialogHeader>
            <UpdateForm onDone={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {(!items || items.length === 0) ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Sparkles className="h-10 w-10 mx-auto mb-2" />
          No updates yet.
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map((u: any) => (
            <Card key={u.id} className="p-3 flex items-center gap-3">
              <div className="h-12 w-20 rounded bg-muted overflow-hidden shrink-0">
                {u.image_url && <img src={u.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground">/{u.slug} {u.released_at ? `· ${u.released_at}` : ""}</div>
              </div>
              <Dialog open={editing?.id === u.id} onOpenChange={(o) => setEditing(o ? u : null)}>
                <DialogTrigger asChild><Button variant="outline" size="sm">Edit</Button></DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Edit {u.name}</DialogTitle></DialogHeader>
                  <UpdateForm existing={u} onDone={() => setEditing(null)} />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete {u.name}?</AlertDialogTitle></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(u.id)}>Delete</AlertDialogAction>
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

function UpdateForm({ existing, onDone }: { existing?: any; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(existing?.name || "");
  const [slug, setSlug] = useState(existing?.slug || "");
  const [slugTouched, setSlugTouched] = useState(!!existing);
  const [imageUrl, setImageUrl] = useState(existing?.image_url || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [releasedAt, setReleasedAt] = useState(existing?.released_at || "");
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [chestIds, setChestIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(!existing);

  const { data: units } = useQuery({
    queryKey: ["all-units-tiny"],
    queryFn: async () => (await supabase.from("units").select("id, name, rarity").order("name")).data || [],
  });
  const { data: chests } = useQuery({
    queryKey: ["all-chests-tiny"],
    queryFn: async () => (await supabase.from("chests").select("id, name").order("name")).data || [],
  });

  useQuery({
    queryKey: ["update-links", existing?.id],
    enabled: !!existing?.id,
    queryFn: async () => {
      const [u, c] = await Promise.all([
        supabase.from("update_units").select("unit_id").eq("update_id", existing.id),
        supabase.from("update_chests").select("chest_id").eq("update_id", existing.id),
      ]);
      setUnitIds((u.data || []).map((r: any) => r.unit_id));
      setChestIds((c.data || []).map((r: any) => r.chest_id));
      setLoaded(true);
      return true;
    },
  });

  function autoSlug(v: string) { if (!slugTouched) setSlug(slugify(v)); setName(v); }
  function toggle(arr: string[], id: string, set: (v: string[]) => void) {
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !slug.trim()) throw new Error("Name and slug required");
      const payload: any = {
        name: name.trim(),
        slug: slug.trim(),
        image_url: imageUrl.trim() || null,
        description: description.trim() || null,
        released_at: releasedAt || null,
      };
      let id = existing?.id;
      if (id) {
        const { error } = await supabase.from("updates").update(payload).eq("id", id);
        if (error) throw error;
        await supabase.from("update_units").delete().eq("update_id", id);
        await supabase.from("update_chests").delete().eq("update_id", id);
      } else {
        const { data, error } = await supabase.from("updates").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (unitIds.length) {
        const { error } = await supabase.from("update_units").insert(unitIds.map((unit_id) => ({ update_id: id, unit_id })));
        if (error) throw error;
      }
      if (chestIds.length) {
        const { error } = await supabase.from("update_chests").insert(chestIds.map((chest_id) => ({ update_id: id, chest_id })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-updates"] });
      qc.invalidateQueries({ queryKey: ["updates"] });
      qc.invalidateQueries({ queryKey: ["unit"] });
      qc.invalidateQueries({ queryKey: ["chest"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (existing && !loaded) return <div className="p-4 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Name *</Label><Input value={name} onChange={(e) => autoSlug(e.target.value)} /></div>
        <div><Label>Slug *</Label><Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} /></div>
        <div><Label>Release date</Label><Input type="date" value={releasedAt} onChange={(e) => setReleasedAt(e.target.value)} /></div>
        <div><Label>Image URL</Label><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." /></div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Units added ({unitIds.length})</h3>
        <div className="max-h-56 overflow-y-auto rounded border p-2 grid sm:grid-cols-2 gap-1">
          {(units || []).map((u: any) => (
            <label key={u.id} className="flex items-center gap-2 text-sm py-1 px-2 hover:bg-accent rounded cursor-pointer">
              <input type="checkbox" checked={unitIds.includes(u.id)} onChange={() => toggle(unitIds, u.id, setUnitIds)} />
              <span className="truncate">{u.name}{u.rarity ? ` (${u.rarity})` : ""}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Chests added ({chestIds.length})</h3>
        <div className="max-h-56 overflow-y-auto rounded border p-2 grid sm:grid-cols-2 gap-1">
          {(chests || []).map((c: any) => (
            <label key={c.id} className="flex items-center gap-2 text-sm py-1 px-2 hover:bg-accent rounded cursor-pointer">
              <input type="checkbox" checked={chestIds.includes(c.id)} onChange={() => toggle(chestIds, c.id, setChestIds)} />
              <span className="truncate">{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  );
}
