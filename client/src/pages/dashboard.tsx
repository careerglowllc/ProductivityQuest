import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Coins, Trophy, CheckCircle, TrendingUp, User, Settings, LogOut, Calendar, Sparkles, ShoppingCart, Trash2, Clock, ArrowRight, Maximize2, Wrench, Palette, Brain, Briefcase, Sword, Book, Activity, Network, Users as UsersIcon, Crown, Target, ChevronDown, ChevronUp, Plus, DollarSign, GripVertical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";
import type { UserProgress, UserSkill, FinancialItem } from "@/../../shared/schema";
import { getSkillIcon } from "@/lib/skillIcons";
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useTheme } from "@/contexts/theme-context";
import { classifyItem } from "@/pages/finances";
import { DashCard, DashCardHead, StatCard } from "@/components/dash-ui";
import { useNickname } from "@/hooks/use-nickname";

// Default skill icon mapping for backward compatibility
const skillIcons: Record<string, any> = {
  Craftsman: Wrench,
  Artist: Palette,
  Mindset: Brain,
  Merchant: Briefcase,
  Physical: Sword,
  Scholar: Book,
  Health: Activity,
  Connector: Network,
  Charisma: UsersIcon,
};

// ── Shared dashboard surfaces ─────────────────────────────────────────────
// DashCard/DashCardHead/StatCard now live in @/components/dash-ui so the Shop
// page (and future migrated pages) can reuse the same Life OS surfaces.


// Mini Today Calendar Widget Component
function TodayCalendarWidget() {
  type CalendarEvent = {
    id: string;
    title: string;
    start: string;
    end: string;
    description?: string;
    source?: string;
    calendarColor?: string;
    calendarName?: string;
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const { data: calendarData } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [`/api/google-calendar/events?year=${year}&month=${month}`],
  });

  // Ensure calendarEvents is always an array
  const safeCalendarEvents = Array.isArray(calendarData?.events) ? calendarData.events : [];

  
  // Time slots for today (full 24 hours to match main calendar)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return {
      hour,
      label: `${displayHour}:00 ${ampm}`
    };
  });

  // Get events for a specific hour
  const getEventsForHour = (hour: number) => {
    // Ensure calendarEvents is an array before filtering
    if (!Array.isArray(safeCalendarEvents)) {
      return [];
    }
    return safeCalendarEvents.filter(event => {
      const eventStart = new Date(event.start);
      const eventHour = eventStart.getHours();
      const isToday = eventStart.toDateString() === today.toDateString();
      return isToday && eventHour === hour;
    });
  };

  // Get event styling
  const getEventStyle = (event: CalendarEvent) => {
    if (event.calendarColor) {
      return {
        backgroundColor: event.calendarColor,
        borderColor: event.calendarColor,
        color: '#ffffff'
      };
    }
    return { className: 'bg-purple-600/40 border-purple-500' };
  };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Ref for scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current && currentHour >= 6 && currentHour <= 23) {
      // Scroll with a small delay to ensure render is complete
      setTimeout(() => {
        const currentHourElement = document.getElementById(`hour-${currentHour}`);
        if (currentHourElement && scrollContainerRef.current) {
          const containerTop = scrollContainerRef.current.offsetTop;
          const elementTop = currentHourElement.offsetTop;
          const scrollPosition = elementTop - containerTop;
          
          scrollContainerRef.current.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [currentHour]);
  
  return (
    <DashCard className="flex h-full flex-col overflow-hidden">
      <DashCardHead
        title="Today's schedule"
        subtitle={today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        href="/calendar"
        linkLabel="Full calendar"
      />
      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <div ref={scrollContainerRef} className="h-full overflow-auto">
          {safeCalendarEvents.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-[var(--dash-muted)]">No events scheduled today.</p>
          )}
          <div className="space-y-px">
            {timeSlots.map(({ hour, label }) => {
              const hourEvents = getEventsForHour(hour);
              const showTimeIndicator = hour === currentHour;
              const timeIndicatorPosition = (currentMinute / 60) * 100;
              
              return (
                <div 
                  key={hour} 
                  id={`hour-${hour}`}
                  className="grid min-h-[40px] grid-cols-[52px_1fr] gap-2 sm:grid-cols-[60px_1fr]"
                >
                  <div className="dash-mono pr-2 pt-1.5 text-right text-[var(--dash-muted-2)]">
                    {label}
                  </div>
                  <div className="relative rounded bg-[var(--dash-surface-2)] p-1">
                    {/* Current Time Indicator */}
                    {showTimeIndicator && (
                      <div 
                        className="absolute left-0 right-0 z-20 flex items-center"
                        style={{ top: `${timeIndicatorPosition}%` }}
                      >
                        <div className="-ml-1 h-1.5 w-1.5 rounded-full bg-[var(--dash-coral)]"></div>
                        <div className="h-0.5 flex-1 bg-[var(--dash-coral)]"></div>
                      </div>
                    )}
                    
                    {hourEvents.map((event, idx) => {
                      const eventStyle = getEventStyle(event);
                      return (
                        <div
                          key={idx}
                          className={`mb-1 rounded border p-1.5 text-xs ${eventStyle.className || ''}`}
                          style={eventStyle.backgroundColor ? { 
                            backgroundColor: eventStyle.backgroundColor,
                            borderColor: eventStyle.borderColor,
                            color: eventStyle.color
                          } : undefined}
                        >
                          <div className="break-words text-[11px] font-medium">{event.title}</div>
                          {event.calendarName && (
                            <div className="truncate text-[9px] opacity-70">{event.calendarName}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashCard>
  );
}

// Finance Widget Component
function FinanceWidget() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(400);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContentHeight(entry.contentRect.height);
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  const { data: financialItems = [] } = useQuery<FinancialItem[]>({
    queryKey: ["/api/finances"],
  });

  const totalIncome = financialItems.filter(i => classifyItem(i.category, i.tags) === "income").reduce((s, i) => s + i.monthlyCost, 0);
  const totalRetirement = financialItems.filter(i => classifyItem(i.category, i.tags) === "retirement").reduce((s, i) => s + i.monthlyCost, 0);
  const totalExpenses = financialItems.filter(i => classifyItem(i.category, i.tags) === "expense").reduce((s, i) => s + i.monthlyCost, 0);
  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  const pieData = [
    { name: "Income", value: totalIncome, color: "var(--dash-mint)" },
    { name: "Investments", value: totalRetirement, color: "var(--dash-amber)" },
    { name: "Expenses", value: totalExpenses, color: "var(--dash-coral)" },
  ].filter(d => d.value > 0);

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <DashCard className="flex h-full flex-col overflow-hidden">
      <DashCardHead
        title="Financial overview"
        subtitle="Monthly income & expenses"
        href="/finances"
        linkLabel="View details"
      />
      <div className="min-h-0 flex-1 overflow-hidden p-3" ref={contentRef}>
        {pieData.length === 0 ? (
          <div className="py-12 text-center text-[var(--dash-muted)]">
            <DollarSign aria-hidden className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">No finance records yet.</p>
            <Link href="/finances">
              <a className="dash-focus mt-1 inline-block text-xs font-semibold text-[var(--dash-blue)] hover:underline">
                Add your first item
              </a>
            </Link>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <p className="sr-only">
              Income {fmt(totalIncome)} per month, investments {fmt(totalRetirement)} per month,
              expenses {fmt(totalExpenses)} per month. Net cash flow {fmt(netCashFlow)} per month,
              a {savingsRate.toFixed(1)} percent savings rate.
            </p>
            <div className="relative min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="70%"
                    labelLine={false}
                    label={false}
                    stroke="var(--dash-surface)"
                    strokeWidth={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => fmt(value)}
                    contentStyle={{
                      backgroundColor: "var(--dash-surface)",
                      border: "1px solid var(--dash-line)",
                      borderRadius: "10px",
                      color: "var(--dash-ink)",
                    }}
                    labelStyle={{ color: "var(--dash-ink)", fontWeight: "bold" }}
                  />
                  {contentHeight > 280 && (
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} iconType="circle"
                      formatter={(value) => <span style={{ color: "var(--dash-muted)" }}>{value}</span>}
                    />
                  )}
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            {contentHeight > 200 && (
              <div className={`${contentHeight > 280 ? "mt-3 space-y-2" : "mt-1 space-y-1"} flex-shrink-0`}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="dash-mono text-[var(--dash-muted)]">Income</p>
                    <p className={`font-bold text-[var(--dash-mint)] ${contentHeight > 280 ? "text-base" : "text-xs"}`}>{fmt(totalIncome)}</p>
                  </div>
                  <div>
                    <p className="dash-mono text-[var(--dash-muted)]">Investments</p>
                    <p className={`font-bold text-[var(--dash-amber)] ${contentHeight > 280 ? "text-base" : "text-xs"}`}>{fmt(totalRetirement)}</p>
                  </div>
                  <div>
                    <p className="dash-mono text-[var(--dash-muted)]">Expenses</p>
                    <p className={`font-bold text-[var(--dash-coral)] ${contentHeight > 280 ? "text-base" : "text-xs"}`}>{fmt(totalExpenses)}</p>
                  </div>
                </div>
                <div className={`flex items-center justify-between rounded-lg border border-[var(--dash-line)] bg-[var(--dash-surface-2)] ${contentHeight > 280 ? "p-2.5" : "p-1.5"}`}>
                  <span className="text-sm font-medium text-[var(--dash-muted)]">Net cash flow</span>
                  <span className={`font-bold ${contentHeight > 280 ? "text-base" : "text-sm"}`} style={{ color: netCashFlow >= 0 ? "var(--dash-mint)" : "var(--dash-coral)" }}>
                    {fmt(netCashFlow)}/mo
                  </span>
                </div>
                <div className={`flex items-center justify-between rounded-lg border border-[var(--dash-line)] bg-[var(--dash-surface-2)] ${contentHeight > 280 ? "p-2.5" : "p-1.5"}`}>
                  <span className="text-sm font-medium text-[var(--dash-muted)]">Savings rate</span>
                  <span className={`font-bold text-[var(--dash-amber)] ${contentHeight > 280 ? "text-base" : "text-sm"}`}>{savingsRate.toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashCard>
  );
}

// Financial Independence — % progress toward the FIRE goal, fixed to
// Thailand/comfortable/4% standard-SWR (matches the Finances FIRE tab defaults).
// Self-contained: fetches its own financial items, live market prices, and "nw-*"
// localStorage net-worth settings, so it doesn't depend on the Finances page being mounted.
function useFireGoal() {
  const readNum = (key: string, fallback: number) => {
    try { return parseFloat(localStorage.getItem(key) || String(fallback)); } catch { return fallback; }
  };
  const readCachedPrice = (key: string) => {
    try { return parseFloat(localStorage.getItem(key) ?? "0") || 0; } catch { return 0; }
  };

  const { data: financialItems = [] } = useQuery<FinancialItem[]>({ queryKey: ["/api/finances"] });
  const { data: btcData } = useQuery<{ price: number }>({ queryKey: ["/api/market/bitcoin"], staleTime: 60_000, retry: 2 });
  const { data: vtsaxData } = useQuery<{ price: number }>({ queryKey: ["/api/market/vtsax"], staleTime: 60_000, retry: 2 });
  const { data: vooData } = useQuery<{ price: number }>({ queryKey: ["/api/market/voo"], staleTime: 60_000, retry: 2 });
  const { data: vxusData } = useQuery<{ price: number }>({ queryKey: ["/api/market/vxus"], staleTime: 60_000, retry: 2 });
  const { data: ibitData } = useQuery<{ price: number }>({ queryKey: ["/api/market/ibit"], staleTime: 60_000, retry: 2 });
  const { data: viiixData } = useQuery<{ price: number }>({ queryKey: ["/api/market/sso"], staleTime: 60_000, retry: 2 });
  const homeAddress = (() => {
    try { return localStorage.getItem("nw-home-address") || "2605 Plumbago Court, Rocklin, CA 95677"; } catch { return "2605 Plumbago Court, Rocklin, CA 95677"; }
  })();
  const { data: propertyData } = useQuery<{ price: number }>({
    queryKey: ["/api/market/property", homeAddress],
    queryFn: async () => {
      const res = await fetch(`/api/market/property?address=${encodeURIComponent(homeAddress)}`);
      if (!res.ok) throw new Error("Property fetch failed");
      return res.json();
    },
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
    enabled: !!homeAddress,
  });

  const classifyItem = (category: string, tags?: string[] | null): "income" | "retirement" | "expense" => {
    const tagList = Array.isArray(tags) ? tags : [];
    const incomeCats = ["Income", "Investment"];
    const retirementCats = ["Retirement"];
    if (incomeCats.includes(category) || tagList.some(t => incomeCats.includes(t))) return "income";
    if (retirementCats.includes(category) || tagList.some(t => retirementCats.includes(t))) return "retirement";
    return "expense";
  };

  const totalRetirement = financialItems.filter(i => classifyItem(i.category, i.tags) === "retirement").reduce((s, i) => s + i.monthlyCost, 0);
  const totalExpenses = financialItems.filter(i => classifyItem(i.category, i.tags) === "expense").reduce((s, i) => s + i.monthlyCost, 0);
  const w2Income = financialItems.find(i => i.item === "Post-Tax W2 Salary Income")?.monthlyCost ?? 0;
  const cashflowNetRaw = w2Income - totalExpenses;

  // Net worth pieces (mirrors the Finances page's Overview calc)
  const btcPrice = btcData?.price ?? readCachedPrice("cache_btc_price");
  const vtsaxPrice = vtsaxData?.price ?? readCachedPrice("cache_vtsax_price");
  const vooPrice = vooData?.price ?? readCachedPrice("cache_voo_price");
  const vxusPrice = vxusData?.price ?? readCachedPrice("cache_vxus_price");
  const ibitPrice = ibitData?.price ?? readCachedPrice("cache_ibit_price");
  const viiixPrice = viiixData?.price ?? readCachedPrice("cache_viiix_price");

  const btcHoldings = readNum("nw-btc", 1);
  const coinbaseBtcHoldings = readNum("nw-coinbase-btc", 0.42362502);
  const totalBtcValue = btcHoldings * btcPrice + coinbaseBtcHoldings * btcPrice;
  const vtsaxValue = readNum("nw-vtsax", 146.857) * vtsaxPrice;
  const vooValue = readNum("nw-voo", 240.676) * vooPrice;
  const vxusValue = readNum("nw-vxus", 60.057) * vxusPrice;
  const vanguardTotal = vtsaxValue + vooValue + vxusValue;
  const vanguardSettlement = readNum("nw-vanguard-settlement", 0);
  const rothIraValue = (readNum("nw-roth-ibit", 697) * ibitPrice) + (readNum("nw-roth-vtsax", 145.188) * vtsaxPrice);
  const k401Value = readNum("nw-401k-sso", 1734.032) * viiixPrice;

  const homeEstValue = readNum("nw-home-value", 640000);
  const homeLoanBalance = readNum("nw-home-loan", 607798.98);
  const homeEscrowBalance = readNum("nw-home-escrow", 2544.22);
  const homePurchasePrice = readNum("nw-home-purchase", 636000);
  const homeSellerFee = readNum("nw-home-fee", 6);
  const homeOtherCosts = readNum("nw-home-other-costs", 0);
  const homeCapImprovements = readNum("nw-home-cap-imp", 0);
  const homeDepreciation = readNum("nw-home-depreciation", 0);
  const homePrimaryExclusion = readNum("nw-home-exclusion", 0);
  const homeFedCapGainsRate = readNum("nw-home-fed-cg", 15);
  const homeCaCapGainsRate = readNum("nw-home-ca-cg", 9.3);
  const homeSalePrice = (propertyData?.price && propertyData.price > 0) ? propertyData.price : homeEstValue;
  const homeAgentCommission = homeSalePrice * (homeSellerFee / 100);
  const homeTransferTax = homeSalePrice * 0.0022;
  const homeTotalSellingCosts = homeAgentCommission + homeTransferTax + homeOtherCosts;
  const homeNetCashAfterSale = homeSalePrice - homeLoanBalance + homeEscrowBalance - homeTotalSellingCosts;
  const homeAdjustedBasis = homePurchasePrice + homeCapImprovements - homeDepreciation;
  const homeTaxableGain = Math.max(0, homeSalePrice - homeTotalSellingCosts - homeAdjustedBasis - homePrimaryExclusion);
  const homeCapGainsTax = homeTaxableGain * ((homeFedCapGainsRate + homeCaCapGainsRate) / 100);
  const homeAfterTaxNetCash = homeNetCashAfterSale - homeCapGainsTax;

  const checkingBalance = readNum("nw-checking", 40000);
  const careerglowBalance = 8440;
  const hsaBalance = 1.62;
  const velunaDomainValue = readNum("nw-veluna-domain", 1600);
  const velunaDomainPurchasePrice = readNum("nw-veluna-domain-purchase", 4001.17);
  const domainCapGain = Math.max(0, velunaDomainValue - velunaDomainPurchasePrice);
  const domainAfterTax = velunaDomainValue - domainCapGain * 0.15;
  const eTradeRsuValue = readNum("nw-etrade-rsu", 0);
  const fordExplorerValue = readNum("nw-ford-explorer", 17000);

  const btcAfterTax = totalBtcValue * 0.85;
  const vanguardAfterTax = vanguardTotal * 0.85 + vanguardSettlement;

  // FIRE calc (Thailand · Comfortable · 4% standard SWR — the Finances FIRE tab's own defaults)
  const fgRoth = rothIraValue * 0.75;
  const fg401k = k401Value * 0.68;
  const fgHsa = hsaBalance * 0.58;
  const fgLiquid =
    btcAfterTax + vanguardAfterTax + fgRoth + fg401k +
    (homeAfterTaxNetCash > 0 ? homeAfterTaxNetCash : 0) +
    checkingBalance + careerglowBalance + fgHsa +
    domainAfterTax + eTradeRsuValue + fordExplorerValue;

  const fireSwr = 0.04;
  const fireColInflation = 0.05;
  const fireBuffer = 0.05 + 0.10 + 0.05; // currency + healthcare + lifestyle buffers
  // Thailand · comfortable tier monthly cost-of-living baseline
  const tierData = { rent: 750, food: 500, transport: 120, health: 150, entertainment: 250, utilities: 100, visa: 230 };
  const fgMonthlyToday = Math.round(Object.values(tierData).reduce((s, v) => s + v, 0) * (1 + fireBuffer));
  const fgAnnualToday = fgMonthlyToday * 12;
  const fgBaseGoal = fgAnnualToday / fireSwr;

  const fgInvestable = btcAfterTax + vanguardAfterTax + fgRoth + fg401k + eTradeRsuValue;
  const fgHomeBase = Math.max(0, homeAfterTaxNetCash);
  const fgCashFixed = checkingBalance + careerglowBalance + fgHsa + domainAfterTax + fordExplorerValue;
  const fgAnnualSavings = Math.max(0, cashflowNetRaw) * 12 + Math.min(totalRetirement * 12, 23_500) * 0.68;
  const fgFV = (n: number) =>
    fgInvestable * Math.pow(1.08, n) +
    (fgAnnualSavings > 0 ? fgAnnualSavings * (Math.pow(1.08, n) - 1) / 0.08 : 0) +
    fgHomeBase * Math.pow(1.04, n) + fgCashFixed;

  let fgYrs1 = 15;
  for (let n = 1; n <= 80; n++) { if (fgFV(n) >= fgBaseGoal) { fgYrs1 = n; break; } }
  const fgInflatedAnnual = fgAnnualToday * Math.pow(1 + fireColInflation, fgYrs1);
  const FIRE_GOAL = Math.round(fgInflatedAnnual / fireSwr);

  const fgPct = Math.min((fgLiquid / FIRE_GOAL) * 100, 100);

  return { pct: fgPct, goal: FIRE_GOAL, liquid: fgLiquid };
}

// Today's momentum — % of today's quests (same "Due Today" bucket used by the
// Quests page's filter: due today or overdue, not yet completed) that are done so far today.
// Self-contained: fetches its own tasks so it doesn't depend on the Quests page being mounted.
function useTodayMomentum() {
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({ queryKey: ["/api/tasks"] });
  // Completing a quest recycles it (one-time) or reschedules its dueDate forward (recurring),
  // so it drops out of /api/tasks' "due today" bucket — fetch the recycle bin too so those
  // completions still get credited toward today's total below.
  const { data: recycledTasks = [], isLoading: recycledLoading } = useQuery<any[]>({ queryKey: ["/api/recycled-tasks"] });
  // Both queries need to have actually resolved before the % means anything — otherwise we
  // briefly compute against a partial/empty data set (e.g. flashing 100% before the rest of
  // today's quests have loaded in).
  const isLoading = tasksLoading || recycledLoading;
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeRecycled = Array.isArray(recycledTasks) ? recycledTasks : [];

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const isCompletedToday = (t: any) => {
    if (!t.completedAt) return false;
    const ts = new Date(t.completedAt).getTime();
    return ts >= todayStart.getTime() && ts < tomorrow.getTime();
  };

  // Mirrors the Quests page's "Due Today" filter (client/src/pages/home.tsx): still-open
  // quests due today or overdue.
  const openToday = safeTasks.filter((t: any) => t.dueDate && new Date(t.dueDate).getTime() < tomorrow.getTime());

  // Quests completed today that no longer show up in `openToday` because completing them
  // moved them out of the bucket (recurring: dueDate pushed forward; one-time: recycled).
  const completedTodayRecurring = safeTasks.filter((t: any) => isCompletedToday(t) && !openToday.includes(t));
  const completedTodayOneTime = safeRecycled.filter((t: any) => t.recycledReason === "completed" && isCompletedToday(t));

  const totalToday = openToday.length + completedTodayRecurring.length + completedTodayOneTime.length;
  const completedToday =
    openToday.filter((t: any) => t.completed).length + completedTodayRecurring.length + completedTodayOneTime.length;
  const pct = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

  return { completedToday, totalToday, pct, isLoading };
}


// Spider Chart Component
function SpiderChart({ skills }: { skills: UserSkill[] }) {
  // Ensure skills is an array
  if (!Array.isArray(skills) || skills.length === 0) {
    return null;
  }

  const [hoveredSkillIndex, setHoveredSkillIndex] = React.useState<number | null>(null);
  // Calculate max chart value: highest skill level + 10, capped at 99
  const highestSkillLevel = Math.max(...skills.map(s => s.level), 0);
  const chartMax = Math.min(highestSkillLevel + 10, 99);
  
  const size = 400;
  const center = size / 2;
  const radius = size / 2 - 90;
  const numSkills = skills.length;

  // Helper function to get skill icon
  const getSkillIconComponent = (skill: UserSkill) => {
    if (skill.skillIcon) {
      return getSkillIcon(skill.skillIcon);
    }
    return skillIcons[skill.skillName] || Target;
  };

  // Calculate polygon points for skill levels
  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / numSkills - Math.PI / 2;
    const distance = (value / chartMax) * radius;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  // Create subtle grid levels
  const gridLevels = [chartMax * 0.25, chartMax * 0.5, chartMax * 0.75, chartMax];
  
  // Create polygon points for skill levels
  const skillPoints = skills.map((skill, i) => getPoint(i, skill.level));
  const polygonPointsString = skillPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Generate random background stars
  const bgStars = React.useMemo(() => {
    const stars: { x: number; y: number; r: number; opacity: number; delay: number }[] = [];
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    };
    const rand = rng(42);
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: rand() * size,
        y: rand() * size,
        r: rand() * 1.2 + 0.3,
        opacity: rand() * 0.5 + 0.15,
        delay: rand() * 4,
      });
    }
    return stars;
  }, []);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Glow filter for constellation lines */}
          <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Stronger glow for nodes */}
          <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Center star glow */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(250, 204, 21, 0.3)" />
            <stop offset="50%" stopColor="rgba(250, 204, 21, 0.08)" />
            <stop offset="100%" stopColor="rgba(250, 204, 21, 0)" />
          </radialGradient>
        </defs>

        {/* Scattered background stars */}
        {bgStars.map((star, i) => (
          <circle
            key={`bg-${i}`}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="white"
            opacity={star.opacity}
          >
            <animate
              attributeName="opacity"
              values={`${star.opacity};${star.opacity * 0.3};${star.opacity}`}
              dur={`${3 + star.delay}s`}
              repeatCount="indefinite"
              begin={`${star.delay}s`}
            />
          </circle>
        ))}

        {/* Subtle center glow */}
        <circle cx={center} cy={center} r={radius * 0.6} fill="url(#centerGlow)" />

        {/* Very subtle radial grid circles - dotted, faint */}
        {gridLevels.map((level, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={(level / chartMax) * radius}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="0.5"
            strokeDasharray="2 6"
            opacity={0.12}
          />
        ))}

        {/* Very subtle axis lines - thin, faint */}
        {skills.map((skill, i) => {
          const endPoint = getPoint(i, chartMax);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="#94a3b8"
              strokeWidth="0.5"
              strokeDasharray="1 8"
              opacity={0.1}
            />
          );
        })}

        {/* Constellation lines - thin, glowing connections between adjacent skill points */}
        {skillPoints.length > 1 && (
          <polygon
            points={polygonPointsString}
            fill="none"
            stroke="rgba(250, 204, 21, 0.5)"
            strokeWidth="1"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#starGlow)"
            className="transition-all duration-500"
          />
        )}

        {/* Thin lines from center to each node - constellation spoke lines */}
        {skillPoints.map((point, i) => (
          <line
            key={`spoke-${i}`}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="rgba(250, 204, 21, 0.2)"
            strokeWidth="0.5"
            className="transition-all duration-500"
          />
        ))}

        {/* Very subtle filled area */}
        {skillPoints.length > 0 && (
          <polygon
            points={polygonPointsString}
            fill="rgba(250, 204, 21, 0.06)"
            className="transition-all duration-500"
          />
        )}

        {/* Star nodes at each skill point */}
        {skillPoints.map((point, i) => (
          <g key={`node-${i}`}>
            {/* Outer glow halo */}
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="rgba(250, 204, 21, 0.15)"
              filter="url(#nodeGlow)"
            />
            {/* Core star point */}
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill="rgb(250, 204, 21)"
              className="transition-all duration-300"
              style={{ filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.9))' }}
            />
            {/* Bright center */}
            <circle
              cx={point.x}
              cy={point.y}
              r="1.2"
              fill="white"
              opacity="0.9"
            />
          </g>
        ))}

        {/* Skill icon labels - positioned at edges */}
        {skills.map((skill, i) => {
          const labelPoint = getPoint(i, chartMax + 3);
          const angle = (Math.PI * 2 * i) / numSkills - Math.PI / 2;
          
          let textAnchor = 'middle';
          if (Math.abs(Math.cos(angle)) > 0.5) {
            textAnchor = Math.cos(angle) > 0 ? 'start' : 'end';
          }

          const SkillIcon = getSkillIconComponent(skill);

          // Icon circle with gold ring
          const iconSize = 36;

          return (
            <g key={i}>
              {/* Icon container - circular with border */}
              <foreignObject
                x={labelPoint.x - iconSize / 2}
                y={labelPoint.y - iconSize / 2 - 8}
                width={iconSize}
                height={iconSize}
              >
                <div className="flex items-center justify-center w-full h-full">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/90 to-yellow-600/90 border flex items-center justify-center shadow-lg shadow-yellow-500/20 transition-all duration-150 ${hoveredSkillIndex === i ? "border-white scale-110 shadow-white/30" : "border-yellow-400/80"}`}>
                    <SkillIcon className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
                  </div>
                </div>
              </foreignObject>

              {/* Level badge - small, above/beside the icon */}
              <foreignObject
                x={labelPoint.x + iconSize / 2 - 18}
                y={labelPoint.y - iconSize / 2 - 14}
                width={22}
                height={16}
              >
                <div className="flex items-center justify-center">
                  <span className="text-[8px] font-bold text-yellow-300/90 bg-slate-900/70 rounded-full px-1 border border-yellow-500/30">
                    {skill.level}
                  </span>
                </div>
              </foreignObject>

              {/* Transparent hit target for hover */}
              <rect
                x={labelPoint.x - iconSize / 2 - 4}
                y={labelPoint.y - iconSize / 2 - 16}
                width={iconSize + 8}
                height={iconSize + 8}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredSkillIndex(i)}
                onMouseLeave={() => setHoveredSkillIndex(null)}
              />
            </g>
          );
        })}

        {/* Center star */}
        <circle cx={center} cy={center} r="3" fill="rgb(250, 204, 21)" filter="url(#nodeGlow)" />
        <circle cx={center} cy={center} r="1.5" fill="white" opacity="0.8" />

        {/* Hover tooltip */}
        {hoveredSkillIndex !== null && (() => {
          const skill = skills[hoveredSkillIndex];
          const labelPoint = getPoint(hoveredSkillIndex, chartMax + 3);
          const tooltipW = 110;
          const tooltipH = 36;
          // Clamp tooltip so it stays inside the SVG
          const tx = Math.min(Math.max(labelPoint.x - tooltipW / 2, 4), size - tooltipW - 4);
          const ty = labelPoint.y - tooltipH - 14 < 4
            ? labelPoint.y + 24
            : labelPoint.y - tooltipH - 14;
          return (
            <foreignObject x={tx} y={ty} width={tooltipW} height={tooltipH} style={{ pointerEvents: "none" }}>
              <div className="flex flex-col items-center justify-center h-full bg-slate-900/95 border border-yellow-500/60 rounded-lg px-2 py-1 shadow-lg shadow-black/60">
                <span className="text-[11px] font-bold text-yellow-200 leading-tight">{skill.skillName}</span>
                <span className="text-[10px] text-yellow-400/80 leading-tight">Level {skill.level}</span>
              </div>
            </foreignObject>
          );
        })()}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { isDark } = useTheme();
  const [expandedCampaigns, setExpandedCampaigns] = useState<{ [key: string]: boolean }>({});
  
  // Fetch questlines from API (same source as questlines/campaigns page)
  const { data: questlinesData = [] } = useQuery<any[]>({
    queryKey: ["/api/questlines"],
  });
  
  // Show only active (non-completed) questlines on dashboard
  const selectedCampaigns = questlinesData.filter((q: any) => !q.completed);
  
  const toggleCampaign = (campaignId: string | number) => {
    setExpandedCampaigns(prev => ({
      ...prev,
      [String(campaignId)]: !prev[String(campaignId)]
    }));
  };

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Ensure tasks is always an array
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const { data: progress = { goldTotal: 0, tasksCompleted: 0 } } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { data: stats = { completedToday: 0, totalToday: 0, goldEarnedToday: 0 } } = useQuery<{
    completedToday: number;
    totalToday: number;
    goldEarnedToday: number;
  }>({
    queryKey: ["/api/stats"],
  });

  // Fetch user skills dynamically from API
  const { data: skills = [], isLoading: skillsLoading } = useQuery<UserSkill[]>({
    queryKey: ["/api/skills"],
  });

  // Ensure skills is always an array
  const safeSkills = Array.isArray(skills) ? skills : [];

  const momentum = useTodayMomentum();
  const fire = useFireGoal();

  // Skill progress: average of each skill's xp toward its next level.
  const skillProgressPct = safeSkills.length
    ? (safeSkills.reduce((s, sk) => s + Math.min(1, (sk.xp || 0) / Math.max(1, sk.maxXp || 100)), 0) / safeSkills.length) * 100
    : 0;
  const avgSkillLevel = safeSkills.length
    ? safeSkills.reduce((s, sk) => s + (sk.level || 1), 0) / safeSkills.length
    : 0;

  const now = new Date();
  const hour = now.getHours();
  const greetingWord = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // "Welcome back" nickname — shared with the sidebar so they always agree.
  // Set from Settings > Nickname, not editable inline here.
  const { nickname } = useNickname();

  // Priority ranking: Pareto > High > Med-High > Medium > Med-Low > Low
  const getPriorityValue = (importance: string | null) => {
    const priorityMap: { [key: string]: number } = {
      'Pareto': 6,
      'High': 5,
      'Med-High': 4,
      'Medium': 3,
      'Med-Low': 2,
      'Low': 1,
    };
    return priorityMap[importance || ''] || 0;
  };

  // Get top 4 uncompleted tasks with advanced priority logic
  const getTopTasks = () => {
    // Ensure tasks is an array before filtering
    if (!Array.isArray(safeTasks)) {
      return [];
    }
    const incompleteTasks = (safeTasks as any[]).filter((task: any) => !task.completed);
    // Use local midnight for "today" so comparisons are relative to the user's calendar day
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTime = today.getTime();
    
    // Helper to get days until due date.
    // dueDates are stored as midnight UTC ISO strings (e.g. "2026-05-29T00:00:00.000Z").
    // We extract the UTC calendar date (Y/M/D) and build a local midnight Date so the
    // displayed date matches what the user entered — avoids a -1 day shift in UTC-N zones.
    const getDaysUntilDue = (task: any) => {
      if (!task.dueDate) return Infinity;
      const d = new Date(task.dueDate);
      // Treat stored date as a calendar date in UTC, then compare to local today
      const dueLocal = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const diffTime = dueLocal.getTime() - todayTime;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };
    
    // Priority tiers based on requirements
    const categorizedTasks = {
      tier1: [] as any[], // Due today or earlier + High priority
      tier2: [] as any[], // Next 3 days + High priority
      tier3: [] as any[], // Next 3 days + Med-High priority
      tier4: [] as any[], // Next 7 days + High priority
      tier5: [] as any[], // Next 7 days + Med-High priority
      tier6: [] as any[], // Everything else
    };
    
    incompleteTasks.forEach(task => {
      const daysUntilDue = getDaysUntilDue(task);
      const importance = task.importance || '';
      
      // Tier 1: Due today or earlier + High priority
      if (daysUntilDue <= 0 && importance === 'High') {
        categorizedTasks.tier1.push(task);
      }
      // Tier 2: Next 3 days (1-3 days) + High priority
      else if (daysUntilDue >= 1 && daysUntilDue <= 3 && importance === 'High') {
        categorizedTasks.tier2.push(task);
      }
      // Tier 3: Next 3 days (1-3 days) + Med-High priority
      else if (daysUntilDue >= 1 && daysUntilDue <= 3 && importance === 'Med-High') {
        categorizedTasks.tier3.push(task);
      }
      // Tier 4: Next week (4-7 days) + High priority
      else if (daysUntilDue >= 4 && daysUntilDue <= 7 && importance === 'High') {
        categorizedTasks.tier4.push(task);
      }
      // Tier 5: Next week (4-7 days) + Med-High priority
      else if (daysUntilDue >= 4 && daysUntilDue <= 7 && importance === 'Med-High') {
        categorizedTasks.tier5.push(task);
      }
      // Tier 6: Everything else
      else {
        categorizedTasks.tier6.push(task);
      }
    });
    
    // Within each tier, sort by due date (closest first), then by importance
    const sortTier = (tasks: any[]) => {
      return tasks.sort((a, b) => {
        const aDays = getDaysUntilDue(a);
        const bDays = getDaysUntilDue(b);
        
        // First by due date
        if (aDays !== bDays) return aDays - bDays;
        
        // Then by importance
        return getPriorityValue(b.importance) - getPriorityValue(a.importance);
      });
    };
    
    // Sort each tier
    Object.keys(categorizedTasks).forEach(tier => {
      categorizedTasks[tier as keyof typeof categorizedTasks] = 
        sortTier(categorizedTasks[tier as keyof typeof categorizedTasks]);
    });
    
    // Combine tiers in order and take first 4
    return [
      ...categorizedTasks.tier1,
      ...categorizedTasks.tier2,
      ...categorizedTasks.tier3,
      ...categorizedTasks.tier4,
      ...categorizedTasks.tier5,
      ...categorizedTasks.tier6,
    ].slice(0, 4);
  };

  const topTasks = getTopTasks();

  // ── Dashboard widget drag-to-reorder ────────────────────────────────────
  type DashWidgetKey = "skills" | "schedule" | "tasks" | "finance";
  const DEFAULT_DASH_ORDER: DashWidgetKey[] = ["skills", "schedule", "tasks", "finance"];
  const [dashWidgetOrder, setDashWidgetOrder] = useState<DashWidgetKey[]>(() => {
    try {
      const saved = localStorage.getItem("dash-widget-order");
      if (saved) {
        const parsed = JSON.parse(saved) as DashWidgetKey[];
        const valid = DEFAULT_DASH_ORDER.filter(k => parsed.includes(k));
        const missing = DEFAULT_DASH_ORDER.filter(k => !parsed.includes(k));
        return [...valid.map(k => parsed[parsed.indexOf(k)]), ...missing];
      }
    } catch {}
    return DEFAULT_DASH_ORDER;
  });
  const [dashDragOverIdx, setDashDragOverIdx] = useState<number | null>(null);
  const dashDragSrcIdx = useRef<number | null>(null);

  // Server-persisted dashboard widget preferences
  const dashWidgetPrefsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: dashWidgetPrefs } = useQuery<{ dashOrder?: string[] }>({
    queryKey: ["/api/widget-preferences"],
    staleTime: Infinity,
    retry: false,
  });

  // Apply server prefs once loaded (server wins over localStorage for order)
  useEffect(() => {
    if (!dashWidgetPrefs?.dashOrder?.length) return;
    const order = dashWidgetPrefs.dashOrder as DashWidgetKey[];
    const valid = DEFAULT_DASH_ORDER.filter(k => order.includes(k));
    const missing = DEFAULT_DASH_ORDER.filter(k => !order.includes(k));
    const merged = [...valid.map(k => order[order.indexOf(k)]), ...missing];
    setDashWidgetOrder(merged);
    try { localStorage.setItem("dash-widget-order", JSON.stringify(merged)); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashWidgetPrefs]);

  const saveDashWidgetPrefs = useCallback((order: DashWidgetKey[]) => {
    if (dashWidgetPrefsDebounce.current) clearTimeout(dashWidgetPrefsDebounce.current);
    dashWidgetPrefsDebounce.current = setTimeout(() => {
      fetch("/api/widget-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dashOrder: order }),
      }).catch(() => {/* silent */});
    }, 800);
  }, []);

  const handleDashDragStart = (e: React.DragEvent, idx: number) => {
    dashDragSrcIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDashDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDashDragOverIdx(idx);
  };
  const handleDashDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dashDragSrcIdx.current === null || dashDragSrcIdx.current === idx) {
      setDashDragOverIdx(null); return;
    }
    const next = [...dashWidgetOrder];
    const [removed] = next.splice(dashDragSrcIdx.current, 1);
    next.splice(idx, 0, removed);
    setDashWidgetOrder(next);
    try { localStorage.setItem("dash-widget-order", JSON.stringify(next)); } catch {}
    saveDashWidgetPrefs(next);
    dashDragSrcIdx.current = null;
    setDashDragOverIdx(null);
  };
  const handleDashDragEnd = () => { dashDragSrcIdx.current = null; setDashDragOverIdx(null); };

  const getImportanceBadgeColor = (importance: string | null) => {
    switch (importance) {
      case 'Pareto': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Med-High': return 'bg-yellow-500 text-white';
      case 'Medium': return 'bg-blue-500 text-white';
      case 'Med-Low': return 'bg-green-500 text-white';
      case 'Low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  // Render a dashboard widget by key — used for drag-to-reorder
  const renderDashWidget = (key: DashWidgetKey, idx: number) => {
    const isDraggingOver = dashDragOverIdx === idx && dashDragSrcIdx.current !== idx;
    const dragHandleBar = (
      <div
        className="absolute right-2 top-2 z-10 flex cursor-grab select-none items-center text-[var(--dash-muted-2)] transition-colors hover:text-[var(--dash-violet)] active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical aria-hidden className="h-4 w-4" />
        <GripVertical aria-hidden className="-ml-2.5 h-4 w-4" />
      </div>
    );

    const wrapCard = (children: React.ReactNode, extraClass = "") => (
      <div
        className={`relative h-full p-2 ${extraClass}`}
        draggable
        onDragStart={e => handleDashDragStart(e, idx)}
        onDragOver={e => handleDashDragOver(e, idx)}
        onDrop={e => handleDashDrop(e, idx)}
        onDragEnd={handleDashDragEnd}
      >
        {isDraggingOver && (
          <div className="pointer-events-none absolute inset-2 z-20 rounded-[10px] ring-2 ring-[var(--dash-violet)] transition-all" />
        )}
        {children}
      </div>
    );

    if (key === "skills") return wrapCard(
      <DashCard className="relative flex h-full flex-col overflow-hidden">
        {dragHandleBar}
        <DashCardHead title="Skills overview" href="/skills" linkLabel="View details" />
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
          <Dialog>
            <DialogTrigger asChild>
              <button className="dash-focus group relative flex h-full w-full items-center justify-center rounded-lg" aria-label="Enlarge skills overview">
                <div className="h-full max-h-[400px] w-full max-w-[400px]">
                  {skillsLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--dash-muted)]">Loading skills…</div>
                  ) : safeSkills.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-[var(--dash-muted)]">
                      <Sparkles aria-hidden className="h-8 w-8 opacity-40" />
                      <span>No skills yet.</span>
                    </div>
                  ) : (
                    <SpiderChart skills={safeSkills} />
                  )}
                </div>
                {safeSkills.length > 0 && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-2 rounded-lg border border-[var(--dash-line)] bg-[var(--dash-surface)] px-4 py-2 text-sm text-[var(--dash-ink)] shadow-[var(--dash-shadow)]">
                      <Maximize2 aria-hidden className="h-4 w-4" /> Click to enlarge
                    </span>
                  </span>
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl border-[var(--dash-line)] bg-[var(--dash-surface)] text-[var(--dash-ink)]">
              <DialogHeader>
                <DialogTitle className="text-[var(--dash-ink)]">Skills overview</DialogTitle>
              </DialogHeader>
              {skillsLoading ? (
                <div className="flex h-[500px] items-center justify-center text-[var(--dash-muted)]">Loading skills…</div>
              ) : (
                <SpiderChart skills={safeSkills} />
              )}
              <p className="mt-4 text-center text-sm text-[var(--dash-muted)]">
                Complete quests to level up your skills and expand your constellation
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </DashCard>
    );

    if (key === "schedule") return wrapCard(
      <div className="relative h-full">
        {dragHandleBar}
        <TodayCalendarWidget />
      </div>
    );

    if (key === "tasks") return wrapCard(
      <DashCard className="relative flex h-full flex-col overflow-hidden">
        {dragHandleBar}
        <DashCardHead title="Top priority tasks" href="/tasks" linkLabel="View all" />
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {topTasks.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle aria-hidden className="mx-auto mb-3 h-10 w-10 text-[var(--dash-mint)] opacity-50" />
              <p className="text-sm text-[var(--dash-muted)]">Nothing pending — you're clear.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {topTasks.map((task: any, index: number) => (
                <li key={task.id}>
                  <Link href={`/tasks?taskId=${task.id}`}>
                    <a className="dash-focus flex items-start gap-3 rounded-[10px] border border-[var(--dash-line)] p-3 transition-colors hover:border-[var(--dash-violet)]">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--dash-violet-soft)] text-xs font-bold text-[var(--dash-violet)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 break-words text-sm font-semibold text-[var(--dash-ink)]">{task.title}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {task.importance && <Badge className={`${getImportanceBadgeColor(task.importance)} text-xs`}>{task.importance}</Badge>}
                          {task.duration && <span className="flex items-center text-xs text-[var(--dash-muted)]"><Clock aria-hidden className="mr-1 h-3 w-3" />{task.duration} min</span>}
                          {task.dueDate && <span className="flex items-center text-xs text-[var(--dash-muted)]"><Calendar aria-hidden className="mr-1 h-3 w-3" />{(() => { const d = new Date(task.dueDate); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toLocaleDateString(); })()}</span>}
                        </div>
                      </div>
                      {task.goldValue ? (
                        <span className="shrink-0 whitespace-nowrap text-xs font-bold text-[var(--dash-amber)]">+{task.goldValue}</span>
                      ) : null}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DashCard>
    );

    // finance
    return wrapCard(
      <div className="relative h-full">
        {dragHandleBar}
        <FinanceWidget />
      </div>
    );
  };

  // Render the Active Questlines panel (shared by the mobile and desktop layouts)
  const renderQuestlines = (className = "") => (
    <section
      aria-label="Active questlines"
      className={`rounded-[10px] border p-[18px] ${className}`}
      style={{ borderColor: "var(--dash-violet)", background: "var(--dash-violet-soft)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--dash-ink)]">
          <Target aria-hidden className="h-4 w-4 text-[var(--dash-violet)]" />
          Active questlines
        </h2>
        <Link href="/campaigns">
          <a className="dash-focus shrink-0 rounded text-[11px] font-semibold text-[var(--dash-blue)] hover:underline">
            Manage ↗
          </a>
        </Link>
      </div>

      {selectedCampaigns.length === 0 ? (
        <div className="py-6 text-center">
          <Target aria-hidden className="mx-auto mb-2 h-9 w-9 text-[var(--dash-violet)] opacity-40" />
          <p className="mb-3 text-sm text-[var(--dash-muted)]">
            No questlines yet — create one to track a long-term objective.
          </p>
          <Link href="/campaigns">
            <a className="dash-focus inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-violet)] px-3 py-2 text-xs font-semibold text-white">
              <Plus aria-hidden className="h-3.5 w-3.5" /> Create questline
            </a>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedCampaigns.map((campaign) => {
            const totalTasks = (campaign.tasks || []).length;
            const completedTasks = (campaign.tasks || []).filter((t: any) => t.completed || t.recycled).length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const isOpen = !!expandedCampaigns[campaign.id];

            return (
              <div
                key={campaign.id}
                className="rounded-[10px] border border-[var(--dash-line)] bg-[var(--dash-surface)] transition-colors hover:border-[var(--dash-violet)]"
              >
                <button
                  type="button"
                  onClick={() => toggleCampaign(campaign.id)}
                  aria-expanded={isOpen}
                  className="dash-focus flex w-full min-h-[44px] items-center gap-3 px-3.5 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="min-w-0 break-words text-[13px] font-semibold text-[var(--dash-ink)]">
                        {campaign.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-[var(--dash-violet)]">{progress}%</span>
                    </span>
                    <span className="dash-meter block h-1" style={{ height: 4 }}>
                      <i style={{ width: `${progress}%` }} />
                    </span>
                    {!isOpen && campaign.description && (
                      <span className="mt-1.5 line-clamp-2 block text-[11px] text-[var(--dash-muted)]">
                        {campaign.description}
                      </span>
                    )}
                  </span>
                  {isOpen
                    ? <ChevronUp aria-hidden className="h-4 w-4 shrink-0 text-[var(--dash-muted)]" />
                    : <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-[var(--dash-muted)]" />}
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--dash-line)] px-3.5 py-3">
                    {campaign.description && (
                      <p className="mb-3 text-[11px] text-[var(--dash-muted)]">{campaign.description}</p>
                    )}
                    <ul className="space-y-1">
                      {(campaign.tasks || []).map((task: any) => {
                        const done = task.completed || task.recycled;
                        const indent = task.indentLevel || 0;
                        return (
                          <li
                            key={task.id}
                            className="flex items-center gap-2 rounded bg-[var(--dash-surface-2)] px-2 py-1.5"
                            style={{ marginLeft: `${indent * 10}px` }}
                          >
                            {done
                              ? <CheckCircle aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--dash-mint)]" />
                              : <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[var(--dash-violet)]" />}
                            <span className={`text-[11px] ${done ? "text-[var(--dash-muted)] line-through" : "font-medium text-[var(--dash-ink)]"}`}>
                              {task.title}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const quickLinks = [
    { label: "Quests", path: "/tasks", icon: CheckCircle },
    { label: "Skills", path: "/skills", icon: Sparkles },
    { label: "Shop", path: "/shop", icon: ShoppingCart },
    { label: "Recycle", path: "/recycling-bin", icon: Trash2 },
    { label: "NPCs", path: "/npcs", icon: UsersIcon },
    { label: "Calendar", path: "/calendar", icon: Calendar },
    { label: "Finances", path: "/finances", icon: DollarSign },
    { label: "All", path: "/more", icon: Target },
  ];

  return (
    <div className="min-h-screen bg-[var(--dash-bg)] md:pt-16">
      <main className="dash-content">
        {/* Greeting */}
        <header className="mb-[25px] flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-baseline gap-x-1.5 text-2xl font-bold leading-tight tracking-[-0.04em] text-[var(--dash-ink)] md:text-[28px]">
              <span>Welcome back, {nickname}.</span>
            </h1>
            <p className="mt-1 text-sm text-[var(--dash-muted)]">{greetingWord} — your next best move is ready.</p>
          </div>
          <p className="dash-mono shrink-0 pt-1 text-[var(--dash-muted)]">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </header>

        {/* Progress metrics */}
        <div className="dash-stats">
          <StatCard
            featured
            tone="mint"
            label="Today's momentum"
            value={momentum.totalToday > 0 ? String(Math.round(momentum.pct)) : "—"}
            unit={momentum.totalToday > 0 ? "/ 100" : undefined}
            caption={momentum.totalToday > 0
              ? `${momentum.completedToday} of ${momentum.totalToday} quests done today`
              : "Nothing due today"}
            pct={momentum.pct}
            loading={momentum.isLoading}
          />
          <StatCard
            tone="violet"
            label="Skill progress"
            value={safeSkills.length ? String(safeSkills.length) : "—"}
            unit={safeSkills.length ? "skills" : undefined}
            caption={safeSkills.length ? `Avg level ${avgSkillLevel.toFixed(1)} · ${Math.round(skillProgressPct)}% to next` : "No skills yet"}
            pct={skillProgressPct}
          />
          <StatCard
            tone="amber"
            label="Financial independence"
            value={fire.pct.toFixed(1)}
            unit="%"
            caption={`of $${Math.round(fire.goal).toLocaleString("en-US")} goal`}
            pct={fire.pct}
          />
        </div>

        {/* Active questlines */}
        {renderQuestlines("mb-[18px]")}

        {/* Quick links — mobile only; desktop already has these in the sidebar rail */}
        <nav aria-label="Quick links" className="mb-[18px] grid grid-cols-4 gap-2 md:hidden">
          {quickLinks.map(({ label, path, icon: Icon }) => (
            <Link key={path} href={path}>
              <a className="dash-focus flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[10px] border border-[var(--dash-line)] bg-[var(--dash-surface)] p-2 transition-colors hover:border-[var(--dash-violet)]">
                <Icon aria-hidden className="h-5 w-5 text-[var(--dash-violet)]" />
                <span className="text-[11px] font-medium text-[var(--dash-ink)]">{label}</span>
              </a>
            </Link>
          ))}
        </nav>

        {/* Dashboard modules — two columns on desktop, one full-width column on mobile */}
        {isMobile ? (
          <div className="dash-modules">
            {dashWidgetOrder.map((key, i) => (
              <div key={key} className="min-h-[340px]">{renderDashWidget(key, i)}</div>
            ))}
          </div>
        ) : (
          /* Desktop: resizable module grid */
          <div className="min-h-[620px]" style={{ height: 'calc(100vh - 340px)' }}>
            <ResizablePanelGroup
              direction="vertical"
              autoSaveId="dashboard-grid-vertical"
              className="h-full rounded-lg"
            >
                  {/* Top Row */}
                  <ResizablePanel defaultSize={50} minSize={25}>
                    <ResizablePanelGroup
                      direction="horizontal"
                      autoSaveId="dashboard-grid-top"
                    >
                      {/* Top Left */}
                      <ResizablePanel defaultSize={50} minSize={20}>
                        {renderDashWidget(dashWidgetOrder[0], 0)}
                      </ResizablePanel>

                      <ResizableHandle className="bg-[var(--dash-line)] transition-colors hover:bg-[var(--dash-violet)] data-[resize-handle-active]:bg-[var(--dash-violet)]" />

                      {/* Top Right */}
                      <ResizablePanel defaultSize={50} minSize={20}>
                        {renderDashWidget(dashWidgetOrder[1], 1)}
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>

                  <ResizableHandle className="bg-[var(--dash-line)] transition-colors hover:bg-[var(--dash-violet)] data-[resize-handle-active]:bg-[var(--dash-violet)]" />

                  {/* Bottom Row */}
                  <ResizablePanel defaultSize={50} minSize={25}>
                    <ResizablePanelGroup
                      direction="horizontal"
                      autoSaveId="dashboard-grid-bottom"
                    >
                      {/* Bottom Left */}
                      <ResizablePanel defaultSize={50} minSize={20}>
                        {renderDashWidget(dashWidgetOrder[2], 2)}
                      </ResizablePanel>

                      <ResizableHandle className="bg-[var(--dash-line)] transition-colors hover:bg-[var(--dash-violet)] data-[resize-handle-active]:bg-[var(--dash-violet)]" />

                      {/* Bottom Right */}
                      <ResizablePanel defaultSize={50} minSize={20}>
                        {renderDashWidget(dashWidgetOrder[3], 3)}
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </main>
    </div>
  );
}
