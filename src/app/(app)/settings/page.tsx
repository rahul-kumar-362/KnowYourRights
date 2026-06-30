"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LANGUAGES, LANGUAGE_STORAGE_KEY } from "@/lib/languages";
import { clerkEnabled } from "@/lib/auth/clerk";
import { cn } from "@/lib/utils";

// Clerk-backed account controls load lazily, only when auth is enabled.
const SettingsAccount = dynamic(() => import("./SettingsAccount"), { ssr: false });

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [lang, setLang] = React.useState("en");

  React.useEffect(() => {
    setMounted(true);
    setLang(localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? "en");
  }, []);

  function chooseLang(code: string) {
    setLang(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  }

  return (
    <div className="px-5 py-10 md:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how KYR looks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => {
                const Icon = t.icon;
                const active = mounted && theme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default language</CardTitle>
            <CardDescription>Reports open in this language. You can still switch per analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => chooseLang(l.code)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    mounted && lang === l.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              {clerkEnabled
                ? "Manage your account and saved history."
                : "Sign-in is not enabled in this deployment."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clerkEnabled ? (
              <SettingsAccount />
            ) : (
              <p className="text-sm text-muted-foreground">
                Your analyses are saved locally. To sync history across devices, an administrator can
                enable authentication.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              KYR is an educational AI legal-incident analyzer covering 12 official Indian codes.
              Every cited section is verified against its source before being shown.
            </p>
            <p>
              This information is for educational purposes and is not a substitute for advice from a
              qualified legal professional.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
