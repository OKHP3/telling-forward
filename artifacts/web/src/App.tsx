import { type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { ThemeProvider } from '@/hooks/use-theme';
import { AppLayout } from '@/components/layout';
import { Home } from '@/pages/home';
import { WorldDetail } from '@/pages/world-detail';
import { PathReader } from '@/pages/path-reader';
import { ProposalView } from '@/pages/proposal-view';
import { Submissions } from '@/pages/submissions';
import { StewardDashboard } from '@/pages/steward-dashboard';
import { Settings } from '@/pages/settings';
import { ConceptBoard } from '@/pages/concept-board';
import { SceneWriter } from '@/pages/scene-writer';

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPubKey) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY — check the Auth pane in the workspace toolbar.',
  );
}

// Set in CI/production; omit in dev (Clerk calls its CDN directly instead).
const clerkProxyUrl: string | undefined =
  import.meta.env.VITE_CLERK_PROXY_URL || undefined;

// Telling Forward design system — warm parchment + terracotta palette.
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  layout: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsVariant: 'blockButton' as const,
    socialButtonsPlacement: 'top' as const,
  },
  variables: {
    colorPrimary: 'hsl(15, 50%, 45%)',
    colorForeground: 'hsl(24, 10%, 15%)',
    colorMutedForeground: 'hsl(24, 10%, 40%)',
    colorDanger: 'hsl(0, 60%, 50%)',
    colorBackground: 'hsl(40, 33%, 97%)',
    colorInput: 'hsl(40, 33%, 99%)',
    colorInputForeground: 'hsl(24, 10%, 15%)',
    colorNeutral: 'hsl(35, 20%, 85%)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.25rem',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

/**
 * Clears React Query cache whenever the active Clerk user changes.
 * Prevents stale data (e.g. another user's submissions) leaking into
 * the next session. Must be inside both ClerkProvider and QueryClientProvider.
 */
function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== id) {
        qc.clear();
      }
      prevRef.current = id;
    });
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Clerk auth UI — rendered without AppLayout (no nav/footer chrome) */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        {/* All other routes share the AppLayout shell */}
        <Route>
          <AppLayout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/submissions" component={Submissions} />
              <Route path="/settings" component={Settings} />
              <Route path="/worlds/:worldId/board" component={ConceptBoard} />
              <Route path="/worlds/:worldId/scene-writer/:capsuleId" component={SceneWriter} />
              <Route path="/worlds/:worldId/steward" component={StewardDashboard} />
              <Route path="/worlds/:worldId" component={WorldDetail} />
              <Route path="/worlds/:worldId/paths/:pathId" component={PathReader} />
              <Route path="/worlds/:worldId/proposals/:proposalId" component={ProposalView} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

/**
 * Bridges Wouter's routing into ClerkProvider via routerPush/routerReplace.
 * Must be rendered INSIDE WouterRouter so useLocation() has context.
 */
function ClerkApp() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      {/* WouterRouter must wrap ClerkApp so useLocation() works inside ClerkApp */}
      <WouterRouter base={basePath}>
        <ClerkApp />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
