"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/** The actual Clerk-backed auth control. Loaded lazily only when Clerk is enabled. */
export default function AuthButtonInner() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button size="sm" variant="outline">
            Sign in
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
