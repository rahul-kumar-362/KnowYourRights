"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * KYR brand mark — a minimal scales-of-justice glyph on a gradient badge.
 * <LogoMark/> = icon only; <Logo/> = mark + wordmark lockup.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  // Unique per instance so multiple Logos on one page don't emit duplicate DOM ids.
  const id = `kyrGrad-${useId().replace(/:/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="KnowYourRights"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <g
        stroke="#FFFFFF"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* central post + base */}
        <path d="M20 13 V29" />
        <path d="M14.5 29 H25.5" />
        {/* balance beam */}
        <path d="M10.5 15 H29.5" />
        {/* left pan */}
        <path d="M10.5 15 L8.5 17.5" />
        <path d="M10.5 15 L12.5 17.5" />
        <path d="M7 17.5 Q10.5 22.5 14 17.5" />
        {/* right pan */}
        <path d="M29.5 15 L27.5 17.5" />
        <path d="M29.5 15 L31.5 17.5" />
        <path d="M26 17.5 Q29.5 22.5 33 17.5" />
      </g>
      {/* pivot */}
      <circle cx="20" cy="11.8" r="1.7" fill="#FFFFFF" />
    </svg>
  );
}

export function Logo({
  size = 30,
  wordmark = "full",
  className,
}: {
  size?: number;
  wordmark?: "full" | "short" | "none";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {wordmark === "full" && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Know<span className="text-primary">Your</span>Rights
        </span>
      )}
      {wordmark === "short" && (
        <span className="text-sm font-semibold tracking-tight">
          KYR
        </span>
      )}
    </span>
  );
}
