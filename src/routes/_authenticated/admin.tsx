import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, useMyRoles, isEditor, isOwner } from "@/lib/auth";
import { UnitsManager, PoolManager } from "@/components/admin/managers";
import { UpdatesManager } from "@/components/admin/updates-manager";
import { EditorsManager } from "@/components/admin/editors-manager";
import { AuditLog } from "@/components/admin/audit-log";
import { LoadoutsManager } from "@/components/admin/loadouts-manager";
import { NotesManager } from "@/components/admin/notes-manager";
import { SimpleManager } from "@/components/admin/simple-manager";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Carrot TD Values" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const { data: roles, isLoading } = useMyRoles(user?.id);
  const editor = isEditor(roles);
  const owner = isOwner(roles);

  if (isLoading) return <Page><div className="text-muted-foreground">Loading...</div></Page>;
  if (!editor) {
    return (
      <Page>
        <Card className="p-10 max-w-md mx-auto text-center">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-semibold text-lg">Editor access required</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your account isn't an approved editor yet. Ask an owner to approve you.
          </p>
          <p className="text-xs text-muted-foreground mt-3">Signed in as {user?.email}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">Back to site</Link>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm">Manage units, summons, chests, maps, and gamemodes{owner ? " and editors" : ""}.</p>
      </div>
      <Tabs defaultValue="units">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="summons">Summons</TabsTrigger>
          <TabsTrigger value="chests">Chests</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="maps">Maps</TabsTrigger>
          <TabsTrigger value="gamemodes">Gamemodes</TabsTrigger>
          <TabsTrigger value="loadouts">Loadouts</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          {owner && <TabsTrigger value="editors">Editors</TabsTrigger>}
          {owner && <TabsTrigger value="logs">Logs</TabsTrigger>}
        </TabsList>
        <TabsContent value="units" className="mt-6"><UnitsManager /></TabsContent>
        <TabsContent value="summons" className="mt-6"><PoolManager kind="summons" /></TabsContent>
        <TabsContent value="chests" className="mt-6"><PoolManager kind="chests" /></TabsContent>
        <TabsContent value="updates" className="mt-6"><UpdatesManager /></TabsContent>
        <TabsContent value="maps" className="mt-6"><SimpleManager kind="maps" /></TabsContent>
        <TabsContent value="gamemodes" className="mt-6"><SimpleManager kind="gamemodes" /></TabsContent>
        <TabsContent value="loadouts" className="mt-6"><LoadoutsManager /></TabsContent>
        <TabsContent value="notes" className="mt-6"><NotesManager /></TabsContent>
        {owner && <TabsContent value="editors" className="mt-6"><EditorsManager /></TabsContent>}
        {owner && <TabsContent value="logs" className="mt-6"><AuditLog /></TabsContent>}
      </Tabs>
    </Page>
  );
}
