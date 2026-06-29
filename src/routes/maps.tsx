import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/layout/page";

export const Route = createFileRoute("/maps")({
  component: MapsPage,
});

function MapsPage() {
  return (
    <PageLayout title="Maps">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">Maps</h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Explore the different maps available in Carrot TD. This page is currently under construction.
        </p>
      </div>
    </PageLayout>
  );
}
