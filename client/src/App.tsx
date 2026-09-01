import { Switch, Route, Redirect, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { installStorageSync, hydrateUserData, resetUserDataSync } from "@/lib/synced-storage";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/hooks/useAuth";
import { TabBar } from "@/components/tab-bar";
import { ThemeProvider } from "@/contexts/theme-context";
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
import GettingStarted from "@/pages/getting-started";
import NPCsPage from "@/pages/npcs";
import JournalPage from "@/pages/journal";
import JournalDailyGewsPage from "@/pages/journal-daily-gews";
import JournalEmpoweringThoughtsPage from "@/pages/journal-empowering-thoughts";
import RecyclingBin from "@/pages/recycling-bin";
import Finances from "@/pages/finances";
import AccomplishmentsPage from "@/pages/accomplishments";
import ExplorePage from "@/pages/explore";
import CountriesVisitedPage from "@/pages/countries-visited";
import USStatesVisitedPage from "@/pages/us-states-visited";
import FitnessPage from "@/pages/fitness";
import FitnessLiftingPage from "@/pages/fitness-lifting";
import FitnessCaloriesPage from "@/pages/fitness-calories";
import FitnessWeightPage from "@/pages/fitness-weight";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import CPAPPage from "@/pages/cpap";
import AppearanceSettingsPage from "@/pages/settings-appearance";
import MorePage from "@/pages/more";
import RecipesPage from "@/pages/recipes";
import FoodInCitiesPage from "@/pages/food-in-cities";
import ReferenceBeliefsPage from "@/pages/reference-beliefs";
installStorageSync();

// Shows the last crash captured by the global error/unhandledrejection listeners in
// main.tsx (errors thrown outside React's render phase — useEffect bodies, event
// handlers, promise chains — which <ErrorBoundary> cannot catch). Lets you actually
// see what broke instead of just a blank/black screen with no clue.
function LastCrashBanner() {
  const [crash, setCrash] = useState<{ source: string; message: string; stack?: string | null; at: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pq-last-crash");
      if (raw) setCrash(JSON.parse(raw));
    } catch {}
  }, []);

  if (!crash) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-950/95 border-b border-red-500/50 text-red-100 text-xs p-3 max-h-40 overflow-auto">
      <div className="flex items-start justify-between gap-3 max-w-3xl mx-auto">
        <div className="flex-1">
          <p className="font-bold">⚠️ Last crash ({crash.source}) — {new Date(crash.at).toLocaleString()}</p>
          <p className="mt-1 break-words">{crash.message}</p>
          {crash.stack && <pre className="mt-1 text-[10px] text-red-300/80 whitespace-pre-wrap">{crash.stack}</pre>}
        </div>
        <button
          className="text-red-300 hover:text-white shrink-0"
          onClick={() => { try { sessionStorage.removeItem("pq-last-crash"); } catch {} setCrash(null); }}
        >
          ✕ Dismiss
        </button>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Once authenticated, pull this user's server-stored data into localStorage BEFORE the
  // synced pages (Finances / CPAP / NPCs) mount, so they always render the latest
  // cross-device state. Always resolves — on failure we fall back to cached localStorage.
  const [userDataReady, setUserDataReady] = useState(false);
  useEffect(() => {
    if (isAuthenticated) {
      let cancelled = false;
      hydrateUserData().finally(() => {
        if (!cancelled) setUserDataReady(true);
      });
      return () => {
        cancelled = true;
      };
    }
    // Logged out: reset so the next user starts clean.
    resetUserDataSync();
    setUserDataReady(false);
  }, [isAuthenticated]);

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

  // Hold the authenticated app until this user's server data has hydrated into localStorage,
  // so Finances / CPAP / NPCs render the latest cross-device values rather than stale cache.
  if (isAuthenticated && !userDataReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Syncing your data...</p>
        </div>
      </div>
    );
  }

  const showTabBar = isAuthenticated && 
    !location.startsWith('/login') && 
    !location.startsWith('/register');

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
              {() => <Redirect to="/login" />}
            </Route>
          </>
        ) : (
          <>
            <Route path="/">
              {() => <Redirect to="/dashboard" />}
            </Route>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/more" component={MorePage} />
            <Route path="/tasks" component={Tasks} />
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/shop" component={Shop} />
            <Route path="/skills" component={Skills} />
            <Route path="/accomplishments" component={AccomplishmentsPage} />
            <Route path="/explore" component={ExplorePage} />
            <Route path="/countries-visited" component={CountriesVisitedPage} />
            <Route path="/us-states-visited" component={USStatesVisitedPage} />
            <Route path="/food-in-cities" component={FoodInCitiesPage} />
            <Route path="/fitness" component={FitnessPage} />
            <Route path="/fitness/lifting" component={FitnessLiftingPage} />
            <Route path="/fitness/calories" component={FitnessCaloriesPage} />
            <Route path="/fitness/weight" component={FitnessWeightPage} />
            <Route path="/campaigns" component={CampaignsPage} />
            <Route path="/npcs" component={NPCsPage} />
            <Route path="/journal" component={JournalPage} />
            <Route path="/journal/daily-gews" component={JournalDailyGewsPage} />
            <Route path="/journal/empowering-thoughts" component={JournalEmpoweringThoughtsPage} />
            <Route path="/reference-beliefs" component={ReferenceBeliefsPage} />
            <Route path="/recipes" component={RecipesPage} />
            <Route path="/finances" component={() => (
              <ErrorBoundary label="Finances">
                <Finances />
              </ErrorBoundary>
            )} />
            <Route path="/cpap" component={CPAPPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/settings/notion" component={NotionIntegration} />
            <Route path="/settings/calendar" component={CalendarSettingsPage} />
            <Route path="/settings/timezone" component={TimezoneSettingsPage} />
            <Route path="/settings/google-calendar" component={GoogleCalendarIntegration} />
            <Route path="/google-calendar-integration" component={GoogleCalendarIntegration} />
            <Route path="/settings/guides" component={SettingsGuidesPage} />
            <Route path="/settings/guides/skill-classification" component={SkillClassificationGuidePage} />
            <Route path="/settings/guides/measure-what-matters" component={MeasureWhatMattersGuidePage} />
            <Route path="/settings/appearance" component={AppearanceSettingsPage} />
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
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <LastCrashBanner />
          <ErrorBoundary label="App">
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
