import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { SignInPage, SignUpPage } from '@/pages/auth';
import { ForgotPassword } from '@/pages/forgot-password';
import { ResetPassword } from '@/pages/reset-password';

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function Router() {
  return (
    <Switch>
      <Route>
        <AppLayout>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/sign-in" component={SignInPage} />
              <Route path="/sign-up" component={SignUpPage} />
              <Route path="/forgot-password" component={ForgotPassword} />
              <Route path="/reset-password" component={ResetPassword} />
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
          </RoutedErrorBoundary>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
