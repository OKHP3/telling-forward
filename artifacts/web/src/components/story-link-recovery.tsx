import { AlertCircle, ArrowLeft, RefreshCw, SearchX } from "lucide-react";
import { Link } from "wouter";

type StoryLinkRecoveryProps = {
  kind: "not-found" | "error";
  subject: "path" | "storyworld";
  onRetry?: () => void;
};

export function StoryLinkRecovery({
  kind,
  subject,
  onRetry,
}: StoryLinkRecoveryProps) {
  const isNotFound = kind === "not-found";
  const subjectLabel = subject === "path" ? "story path" : "storyworld";

  return (
    <section
      className="mx-auto flex max-w-xl flex-col items-center rounded-xl border border-border/60 bg-card px-6 py-14 text-center shadow-sm"
      role="status"
      data-testid={isNotFound ? "status-story-link-not-found" : "status-story-link-error"}
    >
      <div
        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${
          isNotFound
            ? "bg-secondary text-muted-foreground"
            : "bg-destructive/10 text-destructive"
        }`}
      >
        {isNotFound ? (
          <SearchX className="h-6 w-6" aria-hidden="true" />
        ) : (
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </div>

      <h1 className="font-serif text-2xl font-medium text-foreground">
        {isNotFound
          ? `This ${subjectLabel} couldn't be found`
          : "Something went wrong"}
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        {isNotFound
          ? "It may have moved, been removed, or the link may be incomplete."
          : "We couldn't reach the story service. Check your connection and try again."}
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          data-testid="link-back-discovery"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to discovery
        </Link>
        {!isNotFound && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            data-testid="button-retry-story-link"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>
    </section>
  );
}

export function isNotFoundApiError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}