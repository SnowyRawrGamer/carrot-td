import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 py-12 text-center text-xs text-muted-foreground">
        Carrot TD Values — community value list. Not affiliated with the game developers.
      </footer>
    </div>
  );
}
