import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { TabBar } from "@/components/tab-bar";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/home";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Shop from "@/pages/shop";
import Skills from "@/pages/skills";
import CampaignsPage from "@/pages/campaigns";
import SettingsPage from "@/pages/settings";
import NotionIntegration from "@/pages/notion-integration";
import GoogleCalendarIntegration from "@/pages/google-calendar-integration";
import CalendarPage from "@/pages/calendar";
import CalendarSettingsPage from "@/pages/settings-calendar";
import TimezoneSettingsPage from "@/pages/settings-timezone";
import SettingsGuidesPage from "@/pages/settings-guides";
import SkillClassificationGuidePage from "@/pages/settings-guides-skill-classification";
import MeasureWhatMattersGuidePage from "@/pages/settings-guides-measure-what-matters";
import SettingsFinancesPage from "@/pages/settings-finances";
import GettingStarted from "@/pages/getting-started";
import NPCsPage from "@/pages/npcs";
import RecyclingBin from "@/pages/recycling-bin";
import Profile from "@/pages/profile";
import Finances from "@/pages/finances";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
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
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            {/* Redirect all other routes to login for unauthenticated users */}
            <Route path="/:rest*">
              {() => {
                window.location.href = '/login';
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
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/tasks" component={Tasks} />
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/shop" component={Shop} />
            <Route path="/skills" component={Skills} />
            <Route path="/campaigns" component={CampaignsPage} />
            <Route path="/npcs" component={NPCsPage} />
            <Route path="/finances" component={Finances} />
            <Route path="/profile" component={Profile} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/settings/finances" component={SettingsFinancesPage} />
            <Route path="/settings/notion" component={NotionIntegration} />
            <Route path="/settings/calendar" component={CalendarSettingsPage} />
            <Route path="/settings/timezone" component={TimezoneSettingsPage} />
            <Route path="/settings/google-calendar" component={GoogleCalendarIntegration} />
            <Route path="/google-calendar-integration" component={GoogleCalendarIntegration} />
            <Route path="/settings/guides" component={SettingsGuidesPage} />
            <Route path="/settings/guides/skill-classification" component={SkillClassificationGuidePage} />
            <Route path="/settings/guides/measure-what-matters" component={MeasureWhatMattersGuidePage} />
            <Route path="/recycling-bin" component={RecyclingBin} />
            <Route path="/getting-started" component={GettingStarted} />
            {/* 404 for authenticated users only */}
            <Route component={NotFound} />
          </>
        )}
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
