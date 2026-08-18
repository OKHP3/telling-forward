import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "idle" | "loading" | "sent" | "error";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok || res.status === 429) {
        // Always show the generic sent message — including rate-limit, to
        // avoid revealing whether the email is registered. Only hard errors
        // (network failure, 5xx) surface an error state.
        setStatus(res.status === 429 ? "error" : "sent");
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          setErrorMessage(
            (data as { error?: string }).error ??
              "Too many requests — please try again later.",
          );
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(
          (data as { error?: string }).error ??
            "Something went wrong. Please try again.",
        );
        setStatus("error");
      }
    } catch {
      setErrorMessage("Unable to reach the server. Please check your connection.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center space-y-6 text-center px-4">
        <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
          <Mail className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-serif font-medium text-foreground">
          Check your inbox
        </h1>
        <p className="max-w-md text-muted-foreground font-sans leading-relaxed">
          If <span className="font-medium text-foreground">{email}</span> is
          registered, you'll receive a password reset link shortly. The link
          expires in&nbsp;1&nbsp;hour.
        </p>
        <p className="max-w-sm text-sm text-muted-foreground font-sans">
          Didn't receive anything? Check your spam folder, or{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
            onClick={() => setStatus("idle")}
          >
            try a different address
          </button>
          .
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border/80 bg-card hover:bg-accent/50 hover:border-primary/40 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to the Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <h1 className="text-3xl font-serif font-medium text-foreground">
            Forgot your password?
          </h1>
          <p className="text-muted-foreground font-sans text-sm leading-relaxed">
            Enter the email address on your account and we'll send you a link to
            reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={status === "loading"}
            />
          </div>

          {status === "error" && errorMessage && (
            <p className="text-sm text-destructive font-sans">{errorMessage}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={status === "loading" || !email}
          >
            {status === "loading" ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
