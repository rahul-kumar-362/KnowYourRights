import Link from "next/link";
import {
  ArrowRight,
  Scale,
  ShieldCheck,
  FileSearch,
  ScanText,
  Mic,
  Languages,
  ListChecks,
  BadgeCheck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuthButton } from "@/components/auth/AuthButton";
import { Reveal, RevealGroup } from "@/components/motion/Reveal";

const CODES = [
  ["BNS", "Bharatiya Nyaya Sanhita — crimes"],
  ["BNSS", "Criminal procedure"],
  ["BSA", "Evidence law"],
  ["Constitution", "Fundamental rights"],
  ["IT Act", "Cyber offences"],
  ["Code on Wages", "Salary & labour"],
  ["Consumer Protection", "Defective goods, refunds"],
  ["RTI", "Right to information"],
  ["POCSO", "Child protection"],
  ["Domestic Violence", "Protection orders"],
  ["Motor Vehicles", "Accidents, hit-and-run"],
  ["RERA", "Real estate, builders"],
];

const STEPS = [
  {
    icon: Mic,
    title: "Describe what happened",
    body: "Type, speak, or upload an FIR or notice — in English, Hindi, Hinglish, or any Indian language. No legal words needed.",
  },
  {
    icon: FileSearch,
    title: "We retrieve & verify",
    body: "KYR searches 12 official codes, then an independent check confirms every cited section against the source before you see it.",
  },
  {
    icon: ListChecks,
    title: "Know exactly what to do",
    body: "Applicable laws, your rights, a step-by-step action plan, the authorities to contact, and what happens next.",
  },
];

const FEATURES = [
  { icon: BadgeCheck, t: "Source-grounded", d: "Every law is verified against official text. Nothing is fabricated — unsupported citations are dropped." },
  { icon: ScanText, t: "Upload documents", d: "Photograph an FIR, notice, or court order. Local OCR reads it; you review before analysis." },
  { icon: Mic, t: "Voice input", d: "Speak your situation in your language — the composer transcribes it for you." },
  { icon: Languages, t: "11 Indian languages", d: "Describe the incident and read the report in the language you're most comfortable with." },
  { icon: Scale, t: "Full offence detail", d: "Punishment, bailable / cognizable / compoundable, and the trying court — straight from the schedule." },
  { icon: ListChecks, t: "Action plan", d: "Concrete next steps, documents to gather, evidence to preserve, and who to contact." },
];

const FAQS = [
  ["Is this legal advice?", "No. KYR is an educational tool that explains which laws may apply and what people typically do next. It is not a substitute for a qualified lawyer, and every report says so."],
  ["How does it avoid making up laws?", "Answers are grounded in retrieved official text, and a separate verification step confirms each cited section exists and is relevant before it's shown. Citations it can't ground are dropped."],
  ["Which laws does it cover?", "12 official codes today — BNS, BNSS, BSA, the Constitution, IT Act, Code on Wages, Consumer Protection, RTI, POCSO, Domestic Violence, Motor Vehicles, and RERA — sourced verbatim from government publications."],
  ["Is my information private?", "Your incident is processed to generate the report. It is not advice and not shared; treat sensitive details with the same care you would anywhere online."],
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link href="/" aria-label="KnowYourRights home">
            <Logo className="hidden sm:inline-flex" />
            <Logo wordmark="short" className="sm:hidden" />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#how" className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">How it works</a>
            <a href="#coverage" className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">Coverage</a>
            <a href="#faq" className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthButton />
            <Button asChild size="sm">
              <Link href="/chat">Open app</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
      {/* Hero */}
      <section className="kyr-aurora">
        <div className="container flex flex-col items-center py-24 text-center md:py-32">
          <Reveal>
            <Badge variant="outline" className="mb-6 gap-1.5 py-1 text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-success" />
              12 official codes · every citation verified
            </Badge>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="max-w-4xl text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Describe what happened.{" "}
              <span className="text-gradient">Know the law.</span> Know what to do.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
              KYR is an AI legal-incident analyzer for Indian citizens. Tell it your situation in
              plain words — it finds the laws that apply and gives you a clear, grounded action plan.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" variant="gradient">
                <Link href="/chat">
                  Analyze my situation <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">See how it works</a>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="mt-5 text-xs text-muted-foreground">
              Free · Educational only · Not a substitute for a qualified lawyer
            </p>
          </Reveal>
        </div>
      </section>

      {/* Problem → solution */}
      <section className="border-t border-border">
        <div className="container grid gap-12 py-20 md:grid-cols-2 md:items-center">
          <Reveal>
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Most people don&apos;t act on a wrong because they don&apos;t know their rights.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Legal text is dense, scattered across codes, and intimidating. When something happens —
              an unpaid salary, a scam, a lockout, harassment — the first question is simply:
              <em className="text-foreground"> what can I do?</em>
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">You say</p>
              <p className="mt-1 font-medium">&ldquo;My employer hasn&apos;t paid my salary for three months.&rdquo;</p>
              <div className="my-4 h-px bg-border" />
              <p className="text-sm text-muted-foreground">KYR grounds it in</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>Code on Wages §43</Badge>
                <Badge>§17 timely payment</Badge>
                <Badge variant="success">§54 penalty</Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                …plus the steps to take and who to contact (Labour Commissioner, legal notice, claim).
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border bg-muted/30">
        <div className="container py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              From incident to action in one step
            </h2>
            <p className="mt-3 text-muted-foreground">
              A four-stage AI pipeline does the work — and refuses to show you anything it can&apos;t back up.
            </p>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.title}>
                  <div className="h-full rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                    </div>
                    <h3 className="mt-4 font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border">
        <div className="container py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Built to be trusted
            </h2>
            <p className="mt-3 text-muted-foreground">
              The features that matter for a legal tool — accuracy first, accessibility throughout.
            </p>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.t}>
                  <div className="h-full rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                    <Icon className="size-5 text-primary" />
                    <h3 className="mt-4 font-semibold">{f.t}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
                  </div>
                </Reveal>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* Coverage */}
      <section id="coverage" className="border-t border-border bg-muted/30">
        <div className="container py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Twelve codes, sourced from official text
            </h2>
            <p className="mt-3 text-muted-foreground">
              1,500+ sections scraped verbatim from government publications — with offence
              classifications validated against the BNSS First Schedule and §359.
            </p>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CODES.map(([code, desc]) => (
              <Reveal key={code}>
                <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
                  <Scale className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{code}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-border">
        <div className="container grid gap-8 py-20 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Grounded, not guessed", d: "Citations come only from retrieved official sources — never the model's memory." },
            { icon: BadgeCheck, t: "Independently verified", d: "A separate adversarial check confirms each section is real and relevant before it's shown." },
            { icon: Lock, t: "Honest about limits", d: "When confidence is low, KYR says so — and every report ends with a clear legal disclaimer." },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <Reveal key={t.t}>
                <Icon className="size-6 text-primary" />
                <h3 className="mt-3 font-semibold">{t.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.d}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-muted/30">
        <div className="container max-w-3xl py-20">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Questions
            </h2>
          </Reveal>
          <div className="mt-10 space-y-3">
            {FAQS.map(([q, a]) => (
              <Reveal key={q}>
                <details className="group rounded-lg border border-border bg-card p-5 [&_summary]:cursor-pointer">
                  <summary className="flex items-center justify-between rounded-sm font-medium marker:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                    {q}
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="container py-24">
          <Reveal className="kyr-aurora mx-auto max-w-3xl rounded-2xl border border-border bg-card p-10 text-center shadow-lg sm:p-14">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Know your rights. Right now.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Describe your situation and get a clear, grounded answer in under a minute. Free.
            </p>
            <Button asChild size="lg" variant="gradient" className="mt-8">
              <Link href="/chat">
                Analyze my situation <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 text-sm text-muted-foreground sm:flex-row">
          <Logo size={24} />
          <p className="text-center text-xs">
            Educational use only — not a substitute for advice from a qualified legal professional.
          </p>
          <div className="flex gap-5">
            <a href="#how" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">How it works</a>
            <a href="#faq" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
