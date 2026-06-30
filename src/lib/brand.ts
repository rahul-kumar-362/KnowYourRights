/**
 * Shared brand constants for third-party widgets that need a concrete color
 * string (e.g. Clerk's appearance API, which can't consume a CSS custom
 * property that flips with the .dark class). Keep in sync with the indigo
 * brand mark in src/components/brand/Logo.tsx.
 */
export const BRAND_INDIGO = "#6366F1";

/** Clerk <SignIn>/<SignUp> appearance — single source for both auth pages. */
export const CLERK_APPEARANCE = {
  variables: { colorPrimary: BRAND_INDIGO, borderRadius: "0.6rem" },
} as const;
