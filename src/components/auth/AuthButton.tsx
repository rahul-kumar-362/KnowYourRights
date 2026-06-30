"use client";

import dynamic from "next/dynamic";
import { clerkEnabled } from "@/lib/auth/clerk";

// Keep @clerk/nextjs out of every page's initial bundle: the Clerk-backed
// control is a separate chunk, fetched only when auth is actually configured.
const AuthButtonInner = dynamic(() => import("@/components/auth/AuthButtonInner"), {
  ssr: false,
});

/** Header auth control. Renders nothing until a real Clerk key is configured. */
export function AuthButton() {
  if (!clerkEnabled) return null;
  return <AuthButtonInner />;
}
