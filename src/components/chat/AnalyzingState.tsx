"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STAGES = [
  "Reading your situation",
  "Retrieving applicable statutes",
  "Drafting your guidance",
  "Verifying every citation",
];

/** Pipeline progress stepper + skeleton of the report while /api/analyze runs. */
export function AnalyzingState() {
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="sr-only" aria-live="polite">
            {STAGES[stage]}…
          </p>
          <ol className="space-y-3">
            {STAGES.map((label, i) => {
              const done = i < stage;
              const active = i === stage;
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                      done && "border-success bg-success/15 text-success",
                      active && "border-primary bg-primary/10 text-primary",
                      !done && !active && "border-border text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="size-3.5" />
                    ) : active ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current opacity-50" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm transition-colors",
                      done && "text-muted-foreground",
                      active && "font-medium text-foreground",
                      !done && !active && "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {[0, 1].map((n) => (
        <Card key={n}>
          <CardHeader>
            <Skeleton className="h-3.5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[92%]" />
            <Skeleton className="h-3 w-[78%]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
