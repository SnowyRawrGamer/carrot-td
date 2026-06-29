import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/layout/page";

export const Route = createFileRoute("/gamemodes")({
  component: GamemodesPage,
});

function GamemodesPage() {
  return (
    <PageLayout title="Gamemodes">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">Gamemodes</h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Learn about the various gamemodes you can play in Carrot TD. This page is currently under construction.
        </p>
      </div>
    </PageLayout>
  );
}
