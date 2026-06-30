"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/** Clerk account controls — loaded lazily, only rendered when auth is configured. */
export default function SettingsAccount() {
  return (
    <div className="flex items-center gap-3">
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
        <span className="text-sm text-muted-foreground">You&apos;re signed in.</span>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <Button size="sm">Sign in</Button>
        </SignInButton>
      </SignedOut>
    </div>
  );
}
