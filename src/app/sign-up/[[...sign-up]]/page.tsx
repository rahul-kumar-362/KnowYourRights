import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/auth/clerk";
import { CLERK_APPEARANCE } from "@/lib/brand";
import { Logo } from "@/components/brand/Logo";

export default function SignUpPage() {
  return (
    <main className="kyr-aurora flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <Link href="/" aria-label="KnowYourRights home">
        <Logo size={34} />
      </Link>
      {clerkEnabled ? (
        <SignUp appearance={CLERK_APPEARANCE} />
      ) : (
        <div className="max-w-sm rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
          Authentication isn&apos;t enabled in this deployment. Set the Clerk keys in{" "}
          <code className="font-mono">.env</code> to turn on sign-up.{" "}
          <Link href="/chat" className="text-primary">Continue to the app →</Link>
        </div>
      )}
    </main>
  );
}
