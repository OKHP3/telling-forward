import { type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import QueuePage from '@/pages/queue';
import WorldPage from '@/pages/world';
import { SystemHeader } from '@/components/system-header';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { useListStoryworlds } from '@workspace/api-client-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkProxyUrl: string | undefined =
  import.meta.env.VITE_CLERK_PROXY_URL || undefined;

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
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== id) qc.clear();
      prevRef.current = id;
    });
  }, [addListener, qc]);

  return null;
}

function Layout({ children }: { children: ReactNode }) {
  const { data: worlds } = useListStoryworlds();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <SystemHeader
        user={user as Parameters<typeof SystemHeader>[0]['user']}
        onSignIn={() => navigate('/sign-in')}
        onSignOut={logout}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar worlds={worlds || []} />
        <main className="flex-1 overflow-hidden bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Sign-in/up rendered without the SystemHeader + Sidebar chrome */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={QueuePage} />
              <Route path="/worlds/:worldId" component={WorldPage} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

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
    <WouterRouter base={basePath}>
      <ClerkApp />
    </WouterRouter>
  );
}

export default App;
