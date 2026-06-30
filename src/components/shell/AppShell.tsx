"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, Search } from "lucide-react";
import { SidebarNav } from "@/components/shell/Sidebar";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuthButton } from "@/components/auth/AuthButton";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Deferred: the command palette (cmdk) only loads on first ⌘K, off every app route's initial bundle.
const CommandPalette = dynamic(
  () => import("@/components/shell/CommandPalette").then((m) => m.CommandPalette),
  { ssr: false },
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = React.useState(false);
  const [cmd, setCmd] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmd((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog.Root open={drawer} onOpenChange={setDrawer}>
      <div className="min-h-screen">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>

        {/* Desktop rail */}
        <aside className="print-hide fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-card/40 md:block">
          <SidebarNav />
        </aside>

        <div className="md:pl-60 print:!pl-0">
          {/* Top bar */}
          <header className="print-hide sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
            <Dialog.Trigger asChild>
              <button
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden ${focusRing}`}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
            </Dialog.Trigger>
            <Link href="/" className={`rounded-md md:hidden ${focusRing}`} aria-label="KnowYourRights home">
              <Logo size={24} wordmark="short" />
            </Link>

            <div className="flex-1" />

            <button
              onClick={() => setCmd(true)}
              className={`hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent sm:flex ${focusRing}`}
            >
              <Search className="size-3.5" />
              Search
              <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
            <ThemeToggle />
            <AuthButton />
          </header>

          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
        </div>

        {/* Mobile drawer — Radix Dialog: focus trap, focus restore, inert background, Escape. */}
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in md:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:hidden"
          >
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <SidebarNav onNavigate={() => setDrawer(false)} />
          </Dialog.Content>
        </Dialog.Portal>

        {cmd && <CommandPalette open={cmd} onOpenChange={setCmd} />}
      </div>
    </Dialog.Root>
  );
}
