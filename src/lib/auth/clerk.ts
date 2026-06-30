// True only when a REAL Clerk publishable key is configured (not the
// .env.example placeholder). NEXT_PUBLIC_ vars are inlined client-side too,
// so this is safe to read from client components.
const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export const clerkEnabled = Boolean(key?.startsWith("pk_") && !key.includes("xxxx"));
