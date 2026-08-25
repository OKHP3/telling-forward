import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, FileAudio, Loader2, Mic2 } from "lucide-react";
import { apiUrl } from "@/lib/api-url";

export function Transcribe() {
  const [transcript, setTranscript] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function transcribe(file: File) {
    setFileName(file.name);
    setStatus(null);
    setTranscript("");
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read audio file"));
        reader.readAsDataURL(file);
      });
      const response = await fetch(apiUrl("/api/transcribe"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: dataUrl.split(",")[1] ?? "", mimeType: file.type || "audio/m4a" }),
      });
      const body = await response.json().catch(() => ({})) as { text?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Transcription failed.");
      setTranscript(body.text ?? "");
      setStatus("Transcript ready to edit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Transcription failed. You can type your draft below.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/write" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to workspace</Link>
      <header className="space-y-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Mic2 className="h-4 w-4" /> Author tool</div><h1 className="font-serif text-4xl font-medium">Transcription</h1><p className="max-w-xl text-sm leading-6 text-muted-foreground">Select an audio file and receive an editable text transcript. This tool is private to your signed-in account and does not submit or publish anything.</p></header>
      <section className="rounded-xl border border-border/70 bg-card p-6">
        <label htmlFor="audio-file" className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary/40 bg-primary/[0.04] px-6 py-12 text-center hover:bg-primary/[0.08]">
          {busy ? <Loader2 className="mb-3 h-7 w-7 animate-spin text-primary" /> : <FileAudio className="mb-3 h-7 w-7 text-primary" />}
          <span className="font-medium text-foreground">{busy ? "Transcribing…" : "Choose an audio file"}</span>
          <span className="mt-1 text-xs text-muted-foreground">Supported input: audio files up to approximately 2 minutes</span>
          <input id="audio-file" type="file" accept="audio/*" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void transcribe(file); }} />
        </label>
        {fileName && <p className="mt-3 text-xs text-muted-foreground">Selected: {fileName}</p>}
        {status && <p className="mt-4 flex items-start gap-2 rounded-md border border-border/60 bg-background p-3 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{status}</p>}
      </section>
      <section className="space-y-2"><label htmlFor="transcript" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Editable output</label><textarea id="transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Your transcript will appear here. You can also start typing a draft." className="min-h-64 w-full rounded-xl border border-input bg-background p-4 text-sm leading-7 text-foreground outline-none focus:ring-2 focus:ring-ring" /></section>
    </div>
  );
}