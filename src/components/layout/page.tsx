import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "./site-header";

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 py-12 text-center text-xs text-muted-foreground">
        <p>Carrot TD Values is a community value list, run by SnowyRawrGamer.</p>
        <Link to="/editors" className="inline-block mt-2 underline hover:text-foreground">
          Meet the Editors
        </Link>
      </footer>
    </div>
  );
}
