import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Carrot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UnitForm } from "./unit-form";
import { slugify, rarityClass } from "@/lib/utils-slug";
import { toast } from "sonner";

export function UnitsManager() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: units } = useQuery({
    queryKey: ["admin-units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("id, slug, name, photo_url, rarity").order("name");
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unit deleted");
      qc.invalidateQueries({ queryKey: ["admin-units"] });
      qc.invalidateQueries({ queryKey: ["units"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Units</h2>
          <p className="text-sm text-muted-foreground">{units?.length || 0} units</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add unit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New unit</DialogTitle></DialogHeader>
            <UnitForm onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["admin-units"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      {(!units || units.length === 0) ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Carrot className="h-10 w-10 mx-auto mb-2" />
          No units yet. Click <strong>Add unit</strong> to create your first one.
        </Card>
      ) : (
        <div className="grid gap-2">
          {units.map((u) => (
            <Card key={u.id} className="p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded bg-muted overflow-hidden shrink-0">
                {u.photo_url ? <img src={u.photo_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-muted-foreground"><Carrot className="h-5 w-5" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.name}</div>
                <div className="flex gap-1.5 items-center mt-0.5">
                  <span className="text-xs text-muted-foreground">/{u.slug}</span>
                  {u.rarity && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rarityClass(u.rarity)}`}>{u.rarity}</span>}
                </div>
              </div>
              <Dialog open={editingId === u.id} onOpenChange={(o) => setEditingId(o ? u.id : null)}>
                <DialogTrigger asChild><Button variant="outline" size="sm">Edit</Button></DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Edit {u.name}</DialogTitle></DialogHeader>
                  <UnitForm unitId={u.id} onDone={() => { setEditingId(null); qc.invalidateQueries({ queryKey: ["admin-units"] }); }} />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {u.name}?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the unit and all its upgrades.</AlertDialogDescription>
                  </AlertDialogHeader>
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

// Generic pool manager used for both summons and chests
export function PoolManager({ kind }: { kind: "summons" | "chests" }) {
  const qc = useQueryClient();
  const isSummon = kind === "summons";
  const table = kind;
  const entriesTable = isSummon ? "summon_entries" : "chest_entries";
  const fkCol = isSummon ? "summon_id" : "chest_id";
  const imageField = isSummon ? "banner_url" : "image_url";
  const label = isSummon ? "Summon" : "Chest";

  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: items } = useQuery({
    queryKey: [`admin-${kind}`],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(table).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success(`${label} deleted`); qc.invalidateQueries({ queryKey: [`admin-${kind}`] }); qc.invalidateQueries({ queryKey: [kind] }); },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">{label}s</h2>
          <p className="text-sm text-muted-foreground">{items?.length || 0} {kind}</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add {label.toLowerCase()}</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New {label.toLowerCase()}</DialogTitle></DialogHeader>
            <PoolForm kind={kind} onDone={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {(!items || items.length === 0) ? (
        <Card className="p-10 text-center text-muted-foreground">No {kind} yet.</Card>
      ) : (
        <div className="grid gap-2">
          {items.map((it: any) => { const s = it as any; return (
            <Card key={s.id} className="p-3 flex items-center gap-3">
              <div className="h-12 w-20 rounded bg-muted overflow-hidden shrink-0">
                {s[imageField] && <img src={s[imageField]} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">/{s.slug}</div>
              </div>
              <Dialog open={editing?.id === s.id} onOpenChange={(o) => setEditing(o ? s : null)}>
                <DialogTrigger asChild><Button variant="outline" size="sm">Edit</Button></DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Edit {s.name}</DialogTitle></DialogHeader>
                  <PoolForm kind={kind} existing={s} onDone={() => setEditing(null)} />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete {s.name}?</AlertDialogTitle></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(s.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Card>
          ); })}
        </div>
      )}
    </div>
  );

  function PoolForm({ kind, existing, onDone }: { kind: "summons" | "chests"; existing?: any; onDone: () => void }) {
    const qc = useQueryClient();
    const [name, setName] = useState(existing?.name || "");
    const [slug, setSlug] = useState(existing?.slug || "");
    const [slugTouched, setSlugTouched] = useState(!!existing);
    const [image, setImage] = useState(existing?.[imageField] || "");
    const [description, setDescription] = useState(existing?.description || "");
    const [entries, setEntries] = useState<{ unit_id: string; drop_rate: string }[]>([]);
    const [loaded, setLoaded] = useState(!existing);

    const { data: units } = useQuery({
      queryKey: ["all-units-tiny"],
      queryFn: async () => {
        const { data } = await supabase.from("units").select("id, name, rarity").order("name");
        return data || [];
      },
    });

    useQuery({
      queryKey: ["pool-entries", kind, existing?.id],
      enabled: !!existing?.id,
      queryFn: async () => {
        const { data } = await supabase.from(entriesTable).select("unit_id, drop_rate").eq(fkCol, existing.id);
        setEntries((data || []).map((e: any) => ({ unit_id: e.unit_id, drop_rate: String(e.drop_rate) })));
        setLoaded(true);
        return data;
      },
    });

    function autoSlug(v: string) { if (!slugTouched) setSlug(slugify(v)); setName(v); }

    const save = useMutation({
      mutationFn: async () => {
        if (!name.trim() || !slug.trim()) throw new Error("Name and slug required");
        const payload: any = { name: name.trim(), slug: slug.trim(), description: description.trim() || null };
        payload[imageField] = image.trim() || null;
        let id = existing?.id;
        if (id) {
          const { error } = await supabase.from(table).update(payload).eq("id", id);
          if (error) throw error;
          await supabase.from(entriesTable).delete().eq(fkCol, id);
        } else {
          const { data, error } = await supabase.from(table).insert(payload).select("id").single();
          if (error) throw error;
          id = data.id;
        }
        const valid = entries.filter((e) => e.unit_id);
        if (valid.length) {
          const rows = valid.map((e) => {
            const r: any = { unit_id: e.unit_id, drop_rate: Number(e.drop_rate) || 0 };
            r[fkCol] = id;
            return r;
          });
          const { error } = await supabase.from(entriesTable).insert(rows);
          if (error) throw error;
        }
      },
      onSuccess: () => {
        toast.success("Saved");
        qc.invalidateQueries({ queryKey: [`admin-${kind}`] });
        qc.invalidateQueries({ queryKey: [kind] });
        onDone();
      },
      onError: (e: any) => toast.error(e.message),
    });

    if (existing && !loaded) return <div className="p-4 text-muted-foreground">Loading...</div>;

    const total = entries.reduce((s, e) => s + (Number(e.drop_rate) || 0), 0);

    return (
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => autoSlug(e.target.value)} /></div>
          <div><Label>Slug *</Label><Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} /></div>
          <div className="md:col-span-2">
            <Label>Image URL</Label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
          </div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Pool ({entries.length} units)</h3>
            <span className="text-sm text-muted-foreground">Total: {total.toFixed(2)}%</span>
          </div>
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select className="flex-1 h-10 rounded-md border bg-background px-3 text-sm" value={e.unit_id}
                  onChange={(ev) => setEntries(cur => cur.map((x, j) => j === i ? { ...x, unit_id: ev.target.value } : x))}>
                  <option value="">Select unit...</option>
                  {(units || []).map((u) => <option key={u.id} value={u.id}>{u.name}{u.rarity ? ` (${u.rarity})` : ""}</option>)}
                </select>
                <Input type="number" step="0.01" className="w-28" placeholder="Rate %" value={e.drop_rate}
                  onChange={(ev) => setEntries(cur => cur.map((x, j) => j === i ? { ...x, drop_rate: ev.target.value } : x))} />
                <Button variant="ghost" size="icon" onClick={() => setEntries(cur => cur.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setEntries(cur => [...cur, { unit_id: "", drop_rate: "" }])}>
              <Plus className="h-4 w-4 mr-1" /> Add unit to pool
            </Button>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onDone}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    );
  }
}
