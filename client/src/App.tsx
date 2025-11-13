import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { TabBar } from "@/components/tab-bar";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Shop from "@/pages/shop";
import Rewards from "@/pages/rewards";
import SettingsPage from "@/pages/settings";
import NotionIntegration from "@/pages/notion-integration";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Handle API routes by redirecting to the backend
  if (window.location.pathname.startsWith('/api/')) {
    window.location.href = window.location.href;
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const showTabBar = isAuthenticated && 
    !window.location.pathname.startsWith('/login') && 
    !window.location.pathname.startsWith('/register');

  return (
    <>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/dashboard">
              {() => {
                window.location.href = '/';
                return null;
              }}
            </Route>
          </>
        ) : (
          <>
            <Route path="/">
              {() => {
                window.location.href = '/dashboard';
                return null;
              }}
            </Route>
            <Route path="/dashboard" component={Home} />
            <Route path="/shop" component={Shop} />
            <Route path="/rewards" component={Rewards} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/settings/notion" component={NotionIntegration} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
      {showTabBar && <TabBar />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
