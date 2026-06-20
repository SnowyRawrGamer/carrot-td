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
    if (rows.length) await supabase.from("community_loadout_units").insert(rows);
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
