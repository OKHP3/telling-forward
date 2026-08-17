import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center space-y-6 text-center">
      <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-serif font-medium text-foreground">
        Page Not Found
      </h1>
      <p className="max-w-md text-muted-foreground font-sans">
        This path doesn't seem to lead anywhere in the storyworld. It may have been moved or never existed.
      </p>
      <Link 
        href="/"
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border/80 bg-card hover:bg-accent/50 hover:border-primary/40 transition-all text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to the Directory
      </Link>
    </div>
  );
}
