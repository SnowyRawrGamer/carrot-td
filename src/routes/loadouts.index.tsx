import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Carrot, Plus, X, AlertTriangle, Users } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { rarityClass } from "@/lib/utils-slug";
import { fetchUnitWithUpgrades, resolveUnitStats, computeLoadoutTotals, type ResolvedUnit } from "@/lib/loadout-utils";
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
  resolved: ResolvedUnit | null;
}

const emptySlot: Slot = { unitId: null, unitRaw: null, paths: [], levels: [], pathIndex: null, level: 0, resolved: null };

function LoadoutsBuilder() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([{ ...emptySlot }]);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showRealName, setShowRealName] = useState(true);
  const [customName, setCustomName] = useState("");

  const { data: unitsList } = useQuery({
    queryKey: ["units", "picker"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("id, name, slug, photo_url, rarity").order("name");
      if (error) throw error;
      return data;
    },
  });

  async function pickUnit(slotIdx: number, unitId: string) {
    const { unit, paths, levels } = await fetchUnitWithUpgrades(unitId);
    if (!unit) return;
    const resolved = resolveUnitStats(unit, paths, levels, { pathIndex: null, level: 0 });
    setSlots((prev) => prev.map((s, i) => (i === slotIdx ? { unitId, unitRaw: unit, paths, levels, pathIndex: null, level: 0, resolved } : s)));
  }

  function updatePathLevel(slotIdx: number, pathIndex: number | null, level: number) {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== slotIdx || !s.unitRaw) return s;
        const resolved = resolveUnitStats(s.unitRaw, s.paths, s.levels, { pathIndex, level });
        return { ...s, pathIndex, level, resolved };
      })
    );
  }

  function addSlot() {
    if (slots.length >= 5) return;
    setSlots((prev) => [...prev, { ...emptySlot }]);
  }

  function removeSlot(idx: number) {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  const resolvedUnits = slots.map((s) => s.resolved).filter(Boolean) as ResolvedUnit[];
  const totals = computeLoadoutTotals(resolvedUnits);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to submit a loadout.");
      if (resolvedUnits.length === 0) throw new Error("Add at least one unit first.");
      if (!title.trim()) throw new Error("Give your loadout a title.");

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

      const rows = slots
        .filter((s) => s.unitId)
        .map((s, i) => ({
          loadout_id: loadout.id,
          unit_id: s.unitId,
          path_index: s.pathIndex,
          level: s.level,
          slot_index: i,
        }));
      const { error: unitsErr } = await supabase.from("community_loadout_units").insert(rows);
      if (unitsErr) throw unitsErr;
      return loadout;
    },
    onSuccess: () => {
      toast.success("Submitted! An editor will review it before it appears publicly.");
      setSubmitOpen(false);
      setTitle("");
      setDescription("");
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
        <Button asChild variant="outline">
          <Link to="/loadouts/community"><Users className="h-4 w-4 mr-1" /> Community Loadouts</Link>
        </Button>
      </div>

      <div className="space-y-4 mb-6">
        {slots.map((slot, idx) => (
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
                <SelectTrigger className="w-48"><SelectValue placeholder="Choose a unit" /></SelectTrigger>
                <SelectContent>
                  {(unitsList || []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
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
                  <SelectTrigger className="w-32"><SelectValue placeholder="Level" /></SelectTrigger>
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

              {slot.resolved && (
                <div className="flex gap-3 text-xs text-muted-foreground ml-auto">
                  <span>DMG {String(slot.resolved.stats["damage"] ?? "—")}</span>
                  <span>Placement {slot.resolved.missingPlacement ? "1 (assumed)" : slot.resolved.placementValue}</span>
                  <span>Cost {String(slot.resolved.stats["cost"] ?? "—")}</span>
                </div>
              )}

              {slots.length > 1 && (
                <Button size="icon" variant="ghost" onClick={() => removeSlot(idx)}><X className="h-4 w-4" /></Button>
              )}
            </div>
          </Card>
        ))}

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
        Submit to Community Loadouts
      </Button>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Loadout</DialogTitle></DialogHeader>
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
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>Submit for review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
