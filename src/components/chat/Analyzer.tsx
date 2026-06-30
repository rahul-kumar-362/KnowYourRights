"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Mic, Paperclip, Send, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { AnalyzingState } from "@/components/chat/AnalyzingState";

// Deferred: the report (and its framer-motion dependency) only loads once an
// analysis exists, keeping the initial /chat bundle lean.
const ReportView = dynamic(
  () => import("@/components/report/ReportView").then((m) => m.ReportView),
  { ssr: false },
);
import { LANGUAGES, LANGUAGE_STORAGE_KEY } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/ai/schemas";

const EXAMPLES = [
  "My employer hasn't paid my salary for three months.",
  "I got scammed online and lost money.",
  "My landlord locked me out without notice.",
  "My bike was stolen from outside my house.",
  "Someone is blackmailing me with my photos.",
];

const MAX = 8000;

export function Analyzer() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? "en");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechOk(Boolean(SR));
  }, []);

  // Stop any live mic session on unmount (e.g. navigating away mid-dictation),
  // detaching handlers first so they can't setState on an unmounted component.
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        rec.onresult = rec.onend = rec.onerror = null;
        rec.stop();
      }
    };
  }, []);

  async function analyze() {
    if (text.trim().length < 5 || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data as AnalysisResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    setExtracting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not read the file.");
      setText((prev) => (prev ? prev + "\n\n" : "") + `From uploaded document (${file.name}):\n${data.text}`);
      toast.success(`Read ${file.name} — review the text, then analyze.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read the file.");
    } finally {
      setExtracting(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  function toggleMic() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = `${language}-IN`;
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join(" ")
        .trim();
      if (transcript) setText((p) => (p ? p + " " : "") + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  const busy = loading || extracting;

  return (
    <div className="space-y-6">
      {/* Composer */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void uploadFile(file);
        }}
        className={cn(
          "print-hide rounded-xl border bg-card shadow-sm transition-colors",
          dragOver ? "border-primary ring-2 ring-primary/30" : "border-border",
        )}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX))}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void analyze();
            }
          }}
          placeholder="Describe what happened, in any Indian language… or drop in a photo of an FIR / notice."
          aria-label="Describe your situation"
          disabled={loading}
          className="min-h-36 resize-none border-0 bg-transparent text-[15px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={busy}
            aria-label="Output language"
            className="h-9 rounded-md border border-border bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <label
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              busy && "pointer-events-none opacity-50",
            )}
            title="Upload an FIR, notice, or photo of a document"
          >
            {extracting ? <Spinner className="size-4" /> : <Paperclip className="size-4" />}
            <span className="hidden sm:inline">{extracting ? "Reading…" : "Attach"}</span>
            <input
              type="file"
              accept=".pdf,image/*,.txt"
              aria-label="Upload an FIR, notice, or document"
              className="hidden"
              onChange={handleFileInput}
              disabled={busy}
            />
          </label>

          {speechOk && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={loading}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              aria-pressed={listening}
              title="Speak your situation"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
                listening
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Mic className="size-4" />
              <span className="hidden sm:inline">{listening ? "Listening" : "Speak"}</span>
            </button>
          )}

          <div className="flex-1" />
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
            {text.length}/{MAX}
          </span>

          <Button onClick={analyze} disabled={busy || text.trim().length < 5} className="gap-1.5">
            {loading ? <Spinner className="size-4" /> : <Send className="size-4" />}
            {loading ? "Analyzing" : "Analyze"}
          </Button>
        </div>
      </div>

      {/* Examples */}
      {!result && !loading && (
        <div className="print-hide flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              className="inline-flex min-h-9 items-center rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="flex-1">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={analyze}>
              <RotateCcw className="size-3.5" /> Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <AnalyzingState />}

      {/* Result */}
      {result && <ReportView result={result} />}
    </div>
  );
}
