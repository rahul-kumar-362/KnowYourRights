"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

/** App-wide toast host, themed to the active palette. */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={(theme as "light" | "dark" | "system") ?? "dark"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
    />
  );
}
