import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { ReaderLayout } from "@/components/layout";

export default function NotFound() {
  return (
    <ReaderLayout>
      <div
        className="w-full max-w-[var(--reader-line-length)] mt-20 text-center animate-reveal"
        data-testid="status-reader-route-not-found"
      >
        <h1 className="text-2xl font-light mb-4" style={{ fontFamily: "var(--reader-font-body)" }}>
          A Lost Record
        </h1>
        <p className="text-muted-foreground text-lg" style={{ fontFamily: "var(--reader-font-body)" }}>
          This page is not part of the Reader archive. Return to discovery to find an available storyworld.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            data-testid="link-recover-unknown-route"
            className="inline-flex items-center text-sm font-semibold tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Discovery
          </Link>
        </div>
      </div>
    </ReaderLayout>
  );
}
