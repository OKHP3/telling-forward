import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api-url";

type Status = "idle" | "loading" | "success" | "error";

function getTokenFromSearch(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

export function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = getTokenFromSearch();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // No token in URL — link is malformed or missing
  if (!token) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center space-y-6 text-center px-4">
        <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-serif font-medium text-foreground">
          Invalid reset link
        </h1>
        <p className="max-w-md text-muted-foreground font-sans leading-relaxed">
          This password reset link is missing or malformed. Please request a new
          one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border/80 bg-card hover:bg-accent/50 hover:border-primary/40 transition-all text-sm font-medium"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center space-y-6 text-center px-4">
        <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-serif font-medium text-foreground">
          Password updated
        </h1>
        <p className="max-w-md text-muted-foreground font-sans leading-relaxed">
          Your password has been changed. You can now sign in with your new
          password.
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (res.ok) {
        setStatus("success");
      } else if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(
          (data as { error?: string }).error ??
            "Too many attempts — please try again later.",
        );
        setStatus("error");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(
          (data as { error?: string }).error ??
            "Something went wrong. Please request a new reset link.",
        );
        setStatus("error");
      }
    } catch {
      setErrorMessage("Unable to reach the server. Please check your connection.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-medium text-foreground">
            Choose a new password
          </h1>
          <p className="text-muted-foreground font-sans text-sm leading-relaxed">
            Your reset link is valid for 1 hour. Enter a new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">
              New password
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={status === "loading"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              disabled={status === "loading"}
            />
          </div>

          {status === "error" && errorMessage && (
            <p className="text-sm text-destructive font-sans">{errorMessage}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={status === "loading" || !newPassword || !confirmPassword}
          >
            {status === "loading" ? "Updating…" : "Update password"}
          </Button>
        </form>

        {status === "error" && (
          <p className="text-center text-sm text-muted-foreground">
            Link expired?{" "}
            <Link
              href="/forgot-password"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Request a new one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
