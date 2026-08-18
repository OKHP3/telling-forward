import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import QueuePage from '@/pages/queue';
import WorldPage from '@/pages/world';
import { SystemHeader } from '@/components/system-header';
import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/contexts/auth-context';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/contexts/auth-context';
import { useListStoryworlds } from '@workspace/api-client-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Layout({ children }: { children: ReactNode }) {
  const { data: worlds } = useListStoryworlds();
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <SystemHeader
        user={user}
        onSignIn={() => setAuthOpen(true)}
        onSignOut={logout}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar worlds={worlds || []} />
        <main className="flex-1 overflow-hidden bg-background">
          {children}
        </main>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Layout>
        <Switch>
          <Route path="/" component={QueuePage} />
          <Route path="/worlds/:worldId" component={WorldPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
