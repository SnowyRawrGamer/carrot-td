import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Carrot, Plus, X, AlertTriangle, Users, Trash2, Pencil, ChevronDown, ChevronUp as ChevronUpIcon } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchUnitWithUpgrades, resolveUnitStats, levelBreakdown, computeLoadoutTotals, type ResolvedUnit } from "@/lib/loadout-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/loadouts/")({
  head: () => ({ meta: [{ title: "Loadouts — Carrot TD Values" }] }),
  component: LoadoutsBuilder,
});

interface Slot {
  unitId: string | null;
  unitRaw: any | null;
  paths: any[];
  levels: any[];
  pathIndex: number | null;
  level: number;
  placementCount: number;
  resolved: ResolvedUnit | null;
  showLevels: boolean;
}

const emptySlot: Slot = { unitId: null, unitRaw: null, paths: [], levels: [], pathIndex: null, level: 0, placementCount: 1, resolved: null, showLevels: false };
const DRAFT_KEY = "loadout_draft_v1";

function LoadoutsBuilder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [slots, setSlots] = useState<Slot[]>([{ ...emptySlot }]);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showRealName, setShowRealName] = useState(true);
  const [customName, setCustomName] = useState("");
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reapproveWarnOpen, setReapproveWarnOpen] = useState(false);

  const { data: unitsList } = useQuery({
    queryKey: ["units", "picker"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("id, name, slug, photo_url, rarity").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Restore draft from localStorage (survives sign-in redirect)
  useEffect(() => {
    if (editingId) return; // don't clobber an edit-in-progress
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.title) setTitle(draft.title);
        if (draft.description) setDescription(draft.description);
        if (typeof draft.showRealName === "boolean") setShowRealName(draft.showRealName);
        if (draft.customName) setCustomName(draft.customName);
        if (Array.isArray(draft.slots) && draft.slots.length) {
          Promise.all(
            draft.slots.map(async (s: any) => {
              if (!s.unitId) return { ...emptySlot };
              const { unit, paths, levels } = await fetchUnitWithUpgrades(s.unitId);
              if (!unit) return { ...emptySlot };
              const resolved = resolveUnitStats(unit, paths, levels, { pathIndex: s.pathIndex, level: s.level });
              return { unitId: s.unitId, unitRaw: unit, paths, levels, pathIndex: s.pathIndex, level: s.level, placementCount: s.placementCount || 1, resolved, showLevels: false };
            })
          ).then((restored) => setSlots(restored));
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft on every change (only while not actively editing an existing submission)
  useEffect(() => {
    if (editingId) return;
    const draft = {
      title, description, showRealName, customName,
      slots: slots.map((s) => ({ unitId: s.unitId, pathIndex: s.pathIndex, level: s.level, placementCount: s.placementCount })),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [title, description, showRealName, customName, slots, editingId]);

  async function pickUnit(slotIdx: number, unitId: string) {
    const { unit, paths, levels } = await fetchUnitWithUpgrades(unitId);
    if (!unit) return;
    const resolved = resolveUnitStats(unit, paths, levels, { pathIndex: null, level: 0 });
    setSlots((prev) => prev.map((s, i) => (i === slotIdx ? { unitId, unitRaw: unit, paths, levels, pathIndex: null, level: 0, placementCount: 1, resolved, showLevels: false } : s)));
  }

  function updatePathLevel(slotIdx: number, pathIndex: number | null, level: number) {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== slotIdx || !s.unitRaw) return s;
        const resolved = resolveUnitStats(s.unitRaw, s.paths, s.levels, { pathIndex, level });
        const cappedCount = Math.min(s.placementCount, resolved.placementValue);
        return { ...s, pathIndex, level, resolved, placementCount: Math.max(1, cappedCount) };
      })
    );
  }

  function updatePlacementCount(slotIdx: number, count: number) {
    setSlots((prev) => prev.map((s, i) => (i === slotIdx ? { ...s, placementCount: count } : s)));
  }

  function toggleLevels(slotIdx: number) {
    setSlots((prev) => prev.map((s, i) => (i === slotIdx ? { ...s, showLevels: !s.showLevels } : s)));
  }

  function addSlot() {
    if (slots.length >= 5) return;
    setSlots((prev) => [...prev, { ...emptySlot }]);
  }

  function removeSlot(idx: number) {
    setSlots((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ ...emptySlot }]));
  }

  function clearLoadout() {
    setSlots([{ ...emptySlot }]);
    setTitle("");
    setDescription("");
    setShowRealName(true);
    setCustomName("");
    setEditingId(null);
    localStorage.removeItem(DRAFT_KEY);
    setClearConfirmOpen(false);
    toast.success("Loadout cleared");
  }

  const resolvedSlots = slots.filter((s) => s.resolved) as (Slot & { resolved: ResolvedUnit })[];
  const totals = computeLoadoutTotals(resolvedSlots.map((s) => ({ resolved: s.resolved, placementCount: s.placementCount })));

  // ---- Submitted loadouts (mine) ----
  const { data: mine } = useQuery({
    queryKey: ["my-loadouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_loadouts")
        .select("id, title, description, status, created_at, show_real_name, custom_display_name")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const approvedMine = (mine || []).filter((l) => l.status === "approved");
  const pendingMine = (mine || []).filter((l) => l.status === "pending");

  async function loadForEdit(loadoutId: string) {
    const { data: loadout } = await supabase.from("community_loadouts").select("*").eq("id", loadoutId).single();
    const { data: links } = await supabase.from("community_loadout_units").select("*").eq("loadout_id", loadoutId).order("slot_index");
    if (!loadout || !links) return;
    const newSlots = await Promise.all(
      links.map(async (l) => {
        const { unit, paths, levels } = await fetchUnitWithUpgrades(l.unit_id);
        const resolved = resolveUnitStats(unit, paths, levels, { pathIndex: l.path_index, level: l.level });
        return { unitId: l.unit_id, unitRaw: unit, paths, levels, pathIndex: l.path_index, level: l.level, placementCount: l.placement_count || 1, resolved, showLevels: false };
      })
    );
    setSlots(newSlots.length ? newSlots : [{ ...emptySlot }]);
    setTitle(loadout.title);
    setDescription(loadout.description || "");
    setShowRealName(loadout.show_real_name);
    setCustomName(loadout.custom_display_name || "");
    setEditingId(loadoutId);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("Editing loadout — make your changes and hit Save Changes below.");
  }

  const deleteMine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_loadouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["my-loadouts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  async function saveUnits(loadoutId: string) {
    await supabase.from("community_loadout_units").delete().eq("loadout_id", loadoutId);
    const rows = slots.filter((s) => s.unitId).map((s, i) => ({
      loadout_id: loadoutId, unit_id: s.unitId, path_index: s.pathIndex, level: s.level, placement_count: s.placementCount, slot_index: i,
    }));
    if (rows.length) await supabase.from("community_loadout_units").insert(rows as any);
  }

  const submit = useMutation({
    mutationFn: async (forceReapprove?: boolean) => {
      if (!user) throw new Error("Sign in to submit a loadout.");
      if (resolvedSlots.length === 0) throw new Error("Add at least one unit first.");
      if (!title.trim()) throw new Error("Give your loadout a title.");

      if (editingId) {
        const original = mine?.find((m) => m.id === editingId);
        const contentChanged = original && (original.title !== title.trim() || (original.description || "") !== (description.trim() || ""));
        const needsReapproval = original?.status === "approved" && contentChanged;
        if (needsReapproval && !forceReapprove) {
          return { needsConfirm: true };
        }
        const { error } = await supabase
          .from("community_loadouts")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            show_real_name: showRealName,
            custom_display_name: showRealName ? null : customName.trim() || "Anonymous",
            ...(needsReapproval ? { status: "pending" } : {}),
          })
          .eq("id", editingId);
        if (error) throw error;
        await saveUnits(editingId);
        return { done: true };
      }

      const { data: loadout, error } = await supabase
        .from("community_loadouts")
        .insert({
          creator_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          show_real_name: showRealName,
          custom_display_name: showRealName ? null : customName.trim() || "Anonymous",
        })
        .select()
        .single();
      if (error) throw error;
      await saveUnits(loadout.id);
      return { done: true };
    },
    onSuccess: (result: any) => {
      if (result?.needsConfirm) {
        setReapproveWarnOpen(true);
        return;
      }
      toast.success(editingId ? "Saved!" : "Submitted! An editor will review it before it appears publicly.");
      setSubmitOpen(false);
      setReapproveWarnOpen(false);
      qc.invalidateQueries({ queryKey: ["my-loadouts"] });
      if (!editingId) {
        localStorage.removeItem(DRAFT_KEY);
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Loadouts</h1>
          <p className="text-muted-foreground text-sm mt-1">Build a 1-5 unit loadout and see its combined stats.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setClearConfirmOpen(true)}>Clear Loadout</Button>
          <Button asChild variant="outline">
            <Link to="/loadouts/community"><Users className="h-4 w-4 mr-1" /> Community Loadouts</Link>
          </Button>
        </div>
      </div>

      {editingId && (
        <Card className="p-3 mb-4 bg-primary/5 border-primary/30 text-sm flex items-center justify-between">
          <span>Editing an existing submission.</span>
          <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); clearLoadout(); }}>Cancel edit</Button>
        </Card>
      )}

      <div className="space-y-4 mb-6">
        {slots.map((slot, idx) => {
          const maxPlacement = slot.resolved?.placementValue ?? 1;
          const levelRows = slot.unitRaw && slot.pathIndex !== null ? levelBreakdown(slot.unitRaw, slot.paths, slot.levels, slot.pathIndex) : [];
          const allKeys = Array.from(new Set(levelRows.flatMap((r) => Object.keys(r.stats))));
          return (
            <Card key={idx} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-14 w-14 rounded-md bg-muted overflow-hidden shrink-0">
                  {slot.resolved?.photo_url ? (
                    <img src={slot.resolved.photo_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-muted-foreground"><Carrot className="h-6 w-6" /></div>
                  )}
                </div>

                <Select value={slot.unitId || ""} onValueChange={(v) => pickUnit(idx, v)}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Choose a unit" /></SelectTrigger>
                  <SelectContent>
                    {(unitsList || []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded bg-muted overflow-hidden inline-block shrink-0">
                            {u.photo_url && <img src={u.photo_url} alt="" className="h-full w-full object-contain" />}
                          </span>
                          {u.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {slot.unitRaw && slot.paths.length > 0 && (
                  <Select
                    value={slot.pathIndex === null ? "base" : String(slot.pathIndex)}
                    onValueChange={(v) => updatePathLevel(idx, v === "base" ? null : Number(v), v === "base" ? 0 : 1)}
                  >
                    <SelectTrigger className="w-40"><SelectValue placeholder="Path" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base (no path)</SelectItem>
                      {slot.paths.map((p) => (
                        <SelectItem key={p.id} value={String(p.path_index)}>Path {p.path_index}{p.label ? ` — ${p.label}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {slot.unitRaw && slot.pathIndex !== null && (
                  <Select value={String(slot.level)} onValueChange={(v) => updatePathLevel(idx, slot.pathIndex, Number(v))}>
                    <SelectTrigger className="w-28"><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: Math.max(1, slot.levels.filter((l) => l.path_id === slot.paths.find((p) => p.path_index === slot.pathIndex)?.id).length) },
                        (_, i) => i + 1
                      ).map((lvl) => (
                        <SelectItem key={lvl} value={String(lvl)}>Level {lvl}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {slot.unitRaw && (
                  <Select value={String(slot.placementCount)} onValueChange={(v) => updatePlacementCount(idx, Number(v))}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Placed" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxPlacement }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} placed</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {slot.unitRaw && slot.paths.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => toggleLevels(idx)}>
                    {slot.showLevels ? <ChevronUpIcon className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />} Levels
                  </Button>
                )}

                {slot.resolved && (
                  <div className="flex gap-3 text-xs text-muted-foreground ml-auto">
                    <span>DMG {String(slot.resolved.stats["damage"] ?? "—")}</span>
                    <span>Cost {String(slot.resolved.stats["cost"] ?? "—")}</span>
                  </div>
                )}

                {slots.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeSlot(idx)}><X className="h-4 w-4" /></Button>
                )}
              </div>

              {slot.showLevels && levelRows.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-1 pr-3">Level</th>
                        {allKeys.map((k) => <th key={k} className="py-1 pr-3 capitalize">{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {levelRows.map((r) => (
                        <tr key={r.level} className={`border-b last:border-0 ${r.level === slot.level ? "bg-primary/5 font-medium" : ""}`}>
                          <td className="py-1 pr-3">{r.level}</td>
                          {allKeys.map((k) => <td key={k} className="py-1 pr-3">{r.stats[k] != null ? String(r.stats[k]) : "—"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}

        {slots.length < 5 && (
          <Button variant="outline" onClick={addSlot}><Plus className="h-4 w-4 mr-1" /> Add unit ({slots.length}/5)</Button>
        )}
      </div>

      {totals.missingPlacementUnits.length > 0 && (
        <Card className="p-4 mb-6 border-destructive/40 bg-destructive/5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">
            Error: {totals.missingPlacementUnits.join(", ")} {totals.missingPlacementUnits.length > 1 ? "are" : "is"} missing placement stats. Assumed placement of 1 for damage calculation.
          </p>
        </Card>
      )}

      <Card className="p-5 mb-6">
        <h2 className="font-semibold mb-2">Loadout totals</h2>
        <div className="flex gap-6 text-sm">
          <div><span className="text-muted-foreground">Total damage (×placement):</span> <span className="font-semibold">{totals.totalDamage}</span></div>
          <div><span className="text-muted-foreground">Total cost:</span> <span className="font-semibold">{totals.totalCost}</span></div>
        </div>
      </Card>

      <Button onClick={() => (user ? setSubmitOpen(true) : toast.error("Sign in to submit a loadout to the community."))}>
        {editingId ? "Save Changes" : "Submit to Community Loadouts"}
      </Button>

      {user && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-3">Submitted Loadouts</h2>
          <Tabs defaultValue="review">
            <TabsList>
              <TabsTrigger value="review">Under Review ({pendingMine.length}/5)</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approvedMine.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="review" className="mt-3 space-y-2">
              {pendingMine.length === 0 ? <p className="text-sm text-muted-foreground">Nothing under review.</p> : pendingMine.map((l) => (
                <Card key={l.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0 font-medium truncate">{l.title}</div>
                  <Button size="sm" variant="outline" onClick={() => loadForEdit(l.id)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteMine.mutate(l.id)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="approved" className="mt-3 space-y-2">
              {approvedMine.length === 0 ? <p className="text-sm text-muted-foreground">No approved loadouts yet.</p> : approvedMine.map((l) => (
                <Card key={l.id} className="p-3 flex items-center gap-3">
                  <Link to="/loadouts/community/$id" params={{ id: l.id }} className="flex-1 min-w-0 font-medium truncate hover:underline">{l.title}</Link>
                  <Button size="sm" variant="outline" onClick={() => loadForEdit(l.id)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Save Loadout" : "Submit Loadout"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My favorite loadout" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why this loadout works..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showRealName} onCheckedChange={setShowRealName} />
              <Label>Show my real account name</Label>
            </div>
            {!showRealName && (
              <div>
                <Label>Custom display name</Label>
                <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. CarrotKing99" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => submit.mutate(false)} disabled={submit.isPending}>{editingId ? "Save" : "Submit for review"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={reapproveWarnOpen} onOpenChange={setReapproveWarnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This will need re-approval</AlertDialogTitle>
            <AlertDialogDescription>
              You changed the title or description of an approved loadout. It will be removed from the Community Loadouts page and sent back for editor review. Its votes will be kept. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => submit.mutate(true)}>Yes, resubmit for review</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this loadout?</AlertDialogTitle>
            <AlertDialogDescription>This wipes everything you've built here. It won't affect anything already submitted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearLoadout}>Clear it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
