import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KnowYourRights — Understand your rights under Indian law",
  description:
    "Describe an incident in any Indian language. KYR identifies the applicable laws and tells you exactly what to do next. Educational, AI-powered, source-grounded.",
};

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasClerk = Boolean(clerkKey?.startsWith("pk_") && !clerkKey.includes("xxxx"));

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tree = (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
  // Only pull @clerk/nextjs into the bundle when a real key is configured.
  if (!hasClerk) return tree;
  const { ClerkProvider } = await import("@clerk/nextjs");
  return <ClerkProvider>{tree}</ClerkProvider>;
}
