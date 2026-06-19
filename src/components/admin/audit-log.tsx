import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

const TABLE_LABELS: Record<string, string> = {
  units: "Unit",
  unit_upgrade_levels: "Upgrade Level",
  summons: "Summon",
  summon_entries: "Summon Pool Entry",
  chests: "Chest",
  chest_entries: "Chest Entry",
  updates: "Update Post",
};

function formatVal(v: any) {
  if (v === null || v === undefined) return "(empty)";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function AuditLog() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, table_name, record_label, changed_at, changes, changed_by, profiles:changed_by(display_name, email)")
        .order("changed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><History className="h-5 w-5" /> Admin Logs</h2>
        <p className="text-sm text-muted-foreground">Every change made by an editor or owner, automatically recorded.</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : !logs || logs.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No changes logged yet.</Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const who = log.profiles?.display_name || log.profiles?.email || "Unknown user";
            const itemLabel = `${TABLE_LABELS[log.table_name] || log.table_name}${log.record_label ? ` "${log.record_label}"` : ""}`;
            return (
              <Card key={log.id} className="p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(log.changed_at).toLocaleString()}
                </div>
                <div className="text-sm font-medium mb-1">
                  {who} changed {itemLabel}
                </div>
                <div className="space-y-1">
                  {Object.entries(log.changes || {}).map(([field, diff]: [string, any]) => (
                    <div key={field} className="text-xs bg-muted/50 rounded px-2 py-1">
                      <span className="font-mono">{field}</span>: changed from{" "}
                      <span className="text-destructive">{formatVal(diff.from)}</span> to{" "}
                      <span className="text-primary">{formatVal(diff.to)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
