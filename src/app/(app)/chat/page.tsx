import { Analyzer } from "@/components/chat/Analyzer";

export default function ChatPage() {
  return (
    <div className="px-5 py-10 md:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Describe your situation</h1>
        <p className="mb-8 mt-2 text-sm text-muted-foreground">
          KYR identifies the laws that apply and tells you exactly what to do next — grounded in
          verified legal sources.
        </p>
        <Analyzer />
      </div>
    </div>
  );
}
