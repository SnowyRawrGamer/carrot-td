import { Link } from "@tanstack/react-router";
import { Carrot, LogOut, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useMyRoles, isEditor } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/units", label: "Units" },
  { to: "/summons", label: "Summons" },
  { to: "/chests", label: "Chests" },
  { to: "/daily-vault", label: "Daily Vault" },
  { to: "/loadouts", label: "Loadouts" },
  { to: "/feedback", label: "Feedback" },
];

export function SiteHeader() {
  const { user } = useAuth();
  const { data: roles } = useMyRoles(user?.id);
  const editor = isEditor(roles);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Carrot className="h-4 w-4" />
          </span>
          <span>Carrot TD <span className="text-muted-foreground font-normal">Values</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
              activeProps={{ className: "px-3 py-2 rounded-md text-sm font-medium text-foreground bg-accent" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {editor && (
            <Button asChild variant="outline" size="sm">
              <Link to="/admin"><Shield className="h-4 w-4 mr-1" /> Admin</Link>
            </Button>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth"><UserIcon className="h-4 w-4 mr-1" /> Sign in</Link>
            </Button>
          )}
        </div>
      </div>
      <nav className="md:hidden border-t flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {navItems.map((n) => (
          <Link key={n.to} to={n.to}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent whitespace-nowrap"
            activeProps={{ className: "px-3 py-1.5 rounded-md text-sm font-medium text-foreground bg-accent whitespace-nowrap" }}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
