import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  useLogin,
  useRegister,
  type AuthResponse,
} from "@workspace/api-client-react";
import { ArrowLeft, BookOpen, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message.replace(/^HTTP \d+ [^:]+:\s*/, "") : fallback;
}

function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-8 md:min-h-[calc(100dvh-13rem)]">
      <Link
        href="/"
        className="mb-8 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to the directory
      </Link>

      <section className="relative overflow-hidden rounded-xl border border-border/70 bg-card px-6 py-8 shadow-sm sm:px-9">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
              {title}
            </h1>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>
        <p className="mb-7 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        {children}
      </section>
    </div>
  );
}

function useAuthenticatedNavigation() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return (response: AuthResponse) => {
    // User-specific queries can survive in memory from a prior session.
    // Remove them before making the new contributor visible to the app.
    queryClient.clear();
    queryClient.setQueryData(getGetMeQueryKey(), {
      user: response.user,
      github: null,
    });
    setLocation("/");
  };
}

export function SignInPage() {
  const completeAuthentication = useAuthenticatedNavigation();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: completeAuthentication,
        onError: (error) => setErrorMessage(getErrorMessage(error, "We couldn't sign you in. Please try again.")),
      },
    );
  }

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Pick up the thread"
      description="Sign in to keep your contribution journey close at hand."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="sign-in-email">Email address</Label>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            disabled={loginMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="sign-in-password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loginMutation.isPending}
          />
        </div>
        {errorMessage && (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
        <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending && <Loader2 className="animate-spin" />}
          {loginMutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Telling Forward?{" "}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthFrame>
  );
}

export function SignUpPage() {
  const completeAuthentication = useAuthenticatedNavigation();
  const registerMutation = useRegister();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    registerMutation.mutate(
      { data: { displayName, email, password } },
      {
        onSuccess: completeAuthentication,
        onError: (error) => setErrorMessage(getErrorMessage(error, "We couldn't create your account. Please try again.")),
      },
    );
  }

  return (
    <AuthFrame
      eyebrow="A place in the story"
      title="Begin as a contributor"
      description="Create an account to track the stories you send into the world."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="sign-up-name">Display name</Label>
          <Input
            id="sign-up-name"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="The name readers will see"
            required
            minLength={1}
            disabled={registerMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sign-up-email">Email address</Label>
          <Input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            disabled={registerMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sign-up-password">Password</Label>
          <Input
            id="sign-up-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            disabled={registerMutation.isPending}
          />
        </div>
        {errorMessage && (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
        <Button className="w-full" type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? <Loader2 className="animate-spin" /> : <PenLine />}
          {registerMutation.isPending ? "Creating your account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}