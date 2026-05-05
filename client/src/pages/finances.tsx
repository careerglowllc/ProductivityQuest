import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Trash2, Plus, PieChart, List, AlertCircle, CheckCircle, AlertTriangle,
  ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Wallet, PiggyBank,
  BarChart3, Filter
} from "lucide-react";
import {
  Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import type { FinancialItem } from "@shared/schema";

const CATEGORIES = [
  "General", "Business", "Entertainment", "Food", "Housing", "Transportation",
  "Phone", "Internet", "Insurance", "Credit Card", "Health (Non Insurance)",
  "Toiletries", "Charity", "Income", "Retirement", "Investment"
];

const RECUR_TYPES = [
  "Monthly", "Yearly (Amortized)", "Biweekly (Summed Monthly)", "2x a Year"
];

const INCOME_CATEGORIES = ["Income", "Investment"];
const RETIREMENT_CATEGORIES = ["Retirement"];

function classifyItem(category: string): "income" | "retirement" | "expense" {
  if (INCOME_CATEGORIES.includes(category)) return "income";
  if (RETIREMENT_CATEGORIES.includes(category)) return "retirement";
  return "expense";
}

const CATEGORY_COLORS: Record<string, string> = {
  "Income":                "#22C55E",
  "Investment":            "#4ADE80",
  "Retirement":            "#FBBF24",
  "Housing":               "#EF4444",
  "Food":                  "#F59E0B",
  "Transportation":        "#10B981",
  "Business":              "#3B82F6",
  "Insurance":             "#F97316",
  "Health (Non Insurance)":"#06B6D4",
  "General":               "#8B5CF6",
  "Entertainment":         "#EC4899",
  "Phone":                 "#6366F1",
  "Internet":              "#14B8A6",
  "Credit Card":           "#84CC16",
  "Toiletries":            "#A855F7",
  "Charity":               "#F43F5E",
};

const formatCurrency = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-slate-800 border border-purple-500/40 rounded-lg px-3 py-2 text-sm">
        <p className="text-white font-semibold">{entry.name}</p>
        <p className="text-green-300">{formatCurrency(entry.value)}</p>
        <p className="text-slate-400">{entry.payload.pct?.toFixed(1)}% of total</p>
      </div>
    );
  }
  return null;
};

export default function Finances() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"overview" | "income-vs-expense" | "expense-breakdown" | "retirement" | "cashflow" | "table">("overview");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const [sortField, setSortField] = useState<"item" | "category" | "monthlyCost" | "recurType" | null>(() => {
    try {
      const saved = localStorage.getItem("finance-sort-field");
      if (saved === "item" || saved === "category" || saved === "monthlyCost" || saved === "recurType") return saved as any;
    } catch {}
    return null;
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(() => {
    try {
      const saved = localStorage.getItem("finance-sort-direction");
      if (saved === "asc" || saved === "desc") return saved as any;
    } catch {}
    return "asc";
  });

  const [newItem, setNewItem] = useState({ item: "", category: "", monthlyCost: "", recurType: "" });

  const { data: financialItems = [] } = useQuery<FinancialItem[]>({
    queryKey: ["/api/finances"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { item: string; category: string; monthlyCost: number; recurType: string }) => {
      const response = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances"] });
      setNewItem({ item: "", category: "", monthlyCost: "", recurType: "" });
      toast({ title: "Item added successfully" });
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/finances/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances"] });
      toast({ title: "Item deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete item", variant: "destructive" }),
  });

  const totalIncome = financialItems
    .filter(i => classifyItem(i.category) === "income")
    .reduce((s, i) => s + i.monthlyCost, 0);

  const totalRetirement = financialItems
    .filter(i => classifyItem(i.category) === "retirement")
    .reduce((s, i) => s + i.monthlyCost, 0);

  const totalExpenses = financialItems
    .filter(i => classifyItem(i.category) === "expense")
    .reduce((s, i) => s + i.monthlyCost, 0);

  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  let statusBorder = "border-yellow-500/50";
  let statusIcon = <AlertTriangle className="h-7 w-7 text-yellow-500" />;
  let statusColor = "text-yellow-400";
  let statusMessage = "💡 You're saving, but there's room for improvement.";
  if (netCashFlow < 0) {
    statusBorder = "border-red-500/50"; statusIcon = <AlertCircle className="h-7 w-7 text-red-500" />;
    statusColor = "text-red-400"; statusMessage = "⚠️ Warning: Your expenses exceed your income!";
  } else if (savingsRate > 60) {
    statusBorder = "border-green-500/50"; statusIcon = <CheckCircle className="h-7 w-7 text-green-400" />;
    statusColor = "text-green-400"; statusMessage = "🎉 Excellent! You're saving over 60% of your income!";
  } else if (savingsRate >= 51) {
    statusBorder = "border-green-400/50"; statusIcon = <CheckCircle className="h-7 w-7 text-green-400" />;
    statusColor = "text-green-400"; statusMessage = "✅ Good job! You're saving a healthy amount.";
  }

  const incomeVsExpensePie = [
    { name: "Income & Investment", value: totalIncome, color: "#22C55E" },
    { name: "Retirement Contributions", value: totalRetirement, color: "#FBBF24" },
    { name: "Expenses", value: totalExpenses, color: "#EF4444" },
  ].filter(d => d.value > 0).map(d => ({
    ...d,
    pct: ((d.value / (totalIncome + totalRetirement + totalExpenses)) * 100),
  }));

  // Cashflow: only W2 salary as income (no RSUs, ESPP, HSA, etc.)
  const W2_ITEM_NAME = "Post-Tax W2 Salary Income";
  const w2Income = financialItems.find(i => i.item === W2_ITEM_NAME)?.monthlyCost ?? 0;
  const cashflowNetRaw = w2Income - totalExpenses;
  const nonW2Income = totalIncome - w2Income; // RSUs, ESPP, etc.

  const cashflowPie = [
    { name: "W2 Salary", value: w2Income, color: "#22C55E" },
    { name: "Expenses", value: totalExpenses, color: "#EF4444" },
    { name: "Retirement (out of W2)", value: totalRetirement, color: "#FBBF24" },
  ].filter(d => d.value > 0).map(d => {
    const total = w2Income + totalExpenses + totalRetirement;
    return { ...d, pct: total > 0 ? (d.value / total) * 100 : 0 };
  });

  // Expense items sorted for cashflow detail
  const topExpenses = financialItems
    .filter(i => classifyItem(i.category) === "expense")
    .sort((a, b) => b.monthlyCost - a.monthlyCost);

  const expenseByCategory = financialItems
    .filter(i => classifyItem(i.category) === "expense")
    .reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + i.monthlyCost; return acc; }, {} as Record<string, number>);

  const totalExpForPct = Object.values(expenseByCategory).reduce((s, v) => s + v, 0);
  const expensePie = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => ({
      name: cat, value: val,
      color: CATEGORY_COLORS[cat] || "#94A3B8",
      pct: totalExpForPct > 0 ? (val / totalExpForPct) * 100 : 0,
    }));

  const incomeByCategory = financialItems
    .filter(i => classifyItem(i.category) === "income")
    .reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + i.monthlyCost; return acc; }, {} as Record<string, number>);

  const retirementItems = financialItems.filter(i => classifyItem(i.category) === "retirement");

  const handleSort = (field: "item" | "category" | "monthlyCost" | "recurType") => {
    const newDir = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field); setSortDirection(newDir);
    try { localStorage.setItem("finance-sort-field", field); localStorage.setItem("finance-sort-direction", newDir); } catch {}
  };
  const getSortIcon = (field: "item" | "category" | "monthlyCost" | "recurType") => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-1" /> : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  const filteredItems = categoryFilter === "All"
    ? financialItems
    : financialItems.filter(i => i.category === categoryFilter);

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0;
    let cmp = 0;
    if (sortField === "monthlyCost") cmp = a.monthlyCost - b.monthlyCost;
    else if (sortField === "item") cmp = a.item.localeCompare(b.item);
    else if (sortField === "category") cmp = a.category.localeCompare(b.category);
    else if (sortField === "recurType") cmp = a.recurType.localeCompare(b.recurType);
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const handleAddItem = () => {
    if (!newItem.item || !newItem.category || !newItem.monthlyCost || !newItem.recurType) {
      toast({ title: "Please fill all fields", variant: "destructive" }); return;
    }
    createMutation.mutate({
      item: newItem.item, category: newItem.category,
      monthlyCost: Math.round(parseFloat(newItem.monthlyCost) * 100),
      recurType: newItem.recurType,
    });
  };

  const classifyBadge = (category: string) => {
    const type = classifyItem(category);
    if (type === "income") return "bg-green-500/20 text-green-300 border-green-500/30";
    if (type === "retirement") return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    return "bg-red-500/15 text-red-300 border-red-500/20";
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? "pt-16" : ""} pb-24`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-1">
            💰 Financial Dashboard
          </h1>
          <p className="text-slate-400 text-sm">Monthly snapshot · {financialItems.length} items tracked</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-slate-800/60 border-green-500/30">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <p className="text-xs text-slate-400">Income + Investment</p>
              </div>
              <p className="text-2xl font-bold text-green-300">{formatCurrency(totalIncome)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">per month</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-yellow-500/30">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <PiggyBank className="h-4 w-4 text-yellow-400" />
                <p className="text-xs text-slate-400">Retirement</p>
              </div>
              <p className="text-2xl font-bold text-yellow-300">{formatCurrency(totalRetirement)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">per month</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-red-500/30">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <p className="text-xs text-slate-400">Expenses</p>
              </div>
              <p className="text-2xl font-bold text-red-300">{formatCurrency(totalExpenses)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">per month</p>
            </CardContent>
          </Card>
          <Card className={`bg-slate-800/60 ${netCashFlow >= 0 ? "border-green-500/30" : "border-red-500/30"}`}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-purple-400" />
                <p className="text-xs text-slate-400">Net Cash Flow</p>
              </div>
              <p className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-green-300" : "text-red-300"}`}>
                {formatCurrency(netCashFlow)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{savingsRate.toFixed(1)}% savings rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Status */}
        <Alert className={`mb-6 bg-slate-800/60 border-2 ${statusBorder}`}>
          <div className="flex items-center gap-3">
            {statusIcon}
            <AlertDescription className={`text-base font-semibold ${statusColor}`}>
              {statusMessage}
            </AlertDescription>
          </div>
        </Alert>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="bg-slate-800/60 border border-purple-500/30 flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600/40 text-xs px-3 py-1.5">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Overview
            </TabsTrigger>
            <TabsTrigger value="income-vs-expense" className="data-[state=active]:bg-green-600/40 text-xs px-3 py-1.5">
              <PieChart className="h-3.5 w-3.5 mr-1.5" />Income vs Expenses
            </TabsTrigger>
            <TabsTrigger value="expense-breakdown" className="data-[state=active]:bg-red-600/40 text-xs px-3 py-1.5">
              <PieChart className="h-3.5 w-3.5 mr-1.5" />Expense Breakdown
            </TabsTrigger>
            <TabsTrigger value="retirement" className="data-[state=active]:bg-yellow-600/40 text-xs px-3 py-1.5">
              <PiggyBank className="h-3.5 w-3.5 mr-1.5" />Retirement
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="data-[state=active]:bg-blue-600/40 text-xs px-3 py-1.5">
              <Wallet className="h-3.5 w-3.5 mr-1.5" />Cash Flow (W2 Only)
            </TabsTrigger>
            <TabsTrigger value="table" className="data-[state=active]:bg-purple-600/40 text-xs px-3 py-1.5">
              <List className="h-3.5 w-3.5 mr-1.5" />All Items
            </TabsTrigger>
          </TabsList>

          {/* ── Overview ─────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-800/60 border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-green-300 text-base">Income Sources</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${(v/100).toFixed(0)}`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #6366f1" }} />
                      <Bar dataKey="value" radius={[0,4,4,0]}>
                        {Object.entries(incomeByCategory).map(([cat]) => (
                          <Cell key={cat} fill={CATEGORY_COLORS[cat] || "#22C55E"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 border-red-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-red-300 text-base">Top Expense Categories</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">monthly spend</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={expensePie.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${(v/100).toFixed(0)}`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={120} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #6366f1" }} />
                      <Bar dataKey="value" radius={[0,4,4,0]}>
                        {expensePie.slice(0, 8).map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-800/60 border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-300 text-base">Monthly Allocation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Income & Investment", value: totalIncome, color: "bg-green-500" },
                  { label: "Expenses", value: totalExpenses, color: "bg-red-500" },
                  { label: "Retirement Contributions", value: totalRetirement, color: "bg-yellow-400" },
                ].map(({ label, value, color }) => {
                  const total = totalIncome + totalExpenses + totalRetirement;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>{label}</span>
                        <span>{formatCurrency(value)} ({total > 0 ? ((value/total)*100).toFixed(1) : "0"}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700">
                        <div className={`h-2 rounded-full ${color}`} style={{ width: `${total > 0 ? (value/total)*100 : 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Income vs Expense Pie ─────────────────── */}
          <TabsContent value="income-vs-expense" className="space-y-4">
            <Card className="bg-slate-800/60 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-green-300">Income + Investment vs Expenses</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  🟢 Income &amp; Investment · 🟡 Retirement · 🔴 Expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <RechartsPieChart>
                    <Pie data={incomeVsExpensePie} cx="50%" cy="50%" outerRadius={130} innerRadius={60}
                      dataKey="value" labelLine={false} label={false}>
                      {incomeVsExpensePie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value) => <span className="text-slate-200 text-sm">{value}</span>} />
                  </RechartsPieChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700/50">
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                    <p className="text-xs text-green-400 font-semibold mb-2 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Income + Investment
                    </p>
                    {financialItems.filter(i => classifyItem(i.category) === "income")
                      .sort((a, b) => b.monthlyCost - a.monthlyCost)
                      .map(i => (
                        <div key={i.id} className="flex justify-between text-xs py-0.5 border-b border-green-500/10 last:border-0">
                          <span className="text-slate-300 truncate mr-2">{i.item}</span>
                          <span className="text-green-300 shrink-0">{formatCurrency(i.monthlyCost)}</span>
                        </div>
                      ))}
                    <div className="flex justify-between text-xs pt-1.5 font-bold">
                      <span className="text-green-300">Total</span>
                      <span className="text-green-300">{formatCurrency(totalIncome)}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <p className="text-xs text-yellow-400 font-semibold mb-2 flex items-center gap-1.5">
                      <PiggyBank className="h-3.5 w-3.5" /> Retirement
                    </p>
                    {retirementItems.sort((a, b) => b.monthlyCost - a.monthlyCost).map(i => (
                      <div key={i.id} className="flex justify-between text-xs py-0.5 border-b border-yellow-500/10 last:border-0">
                        <span className="text-slate-300 truncate mr-2">{i.item}</span>
                        <span className="text-yellow-300 shrink-0">{formatCurrency(i.monthlyCost)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs pt-1.5 font-bold">
                      <span className="text-yellow-300">Total</span>
                      <span className="text-yellow-300">{formatCurrency(totalRetirement)}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-xs text-red-400 font-semibold mb-2 flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5" /> Top Expenses
                    </p>
                    {financialItems.filter(i => classifyItem(i.category) === "expense")
                      .sort((a, b) => b.monthlyCost - a.monthlyCost)
                      .slice(0, 10)
                      .map(i => (
                        <div key={i.id} className="flex justify-between text-xs py-0.5 border-b border-red-500/10 last:border-0">
                          <span className="text-slate-300 truncate mr-2">{i.item}</span>
                          <span className="text-red-300 shrink-0">{formatCurrency(i.monthlyCost)}</span>
                        </div>
                      ))}
                    <div className="flex justify-between text-xs pt-1.5 font-bold">
                      <span className="text-red-300">Total</span>
                      <span className="text-red-300">{formatCurrency(totalExpenses)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Expense Breakdown Pie ─────────────────── */}
          <TabsContent value="expense-breakdown" className="space-y-4">
            <Card className="bg-slate-800/60 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-300">Expense Breakdown by Category</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Income, Investment, and Retirement excluded
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <RechartsPieChart>
                    <Pie data={expensePie} cx="50%" cy="50%" outerRadius={120} innerRadius={50}
                      dataKey="value" labelLine={false} label={false}>
                      {expensePie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value) => <span className="text-slate-200 text-xs">{value}</span>} />
                  </RechartsPieChart>
                </ResponsiveContainer>

                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-1.5">
                  {expensePie.map(cat => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-300">{cat.name}</span>
                          <span className="text-slate-300 font-medium">{formatCurrency(cat.value)} ({cat.pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700">
                          <div className="h-1.5 rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Retirement Tab ────────────────────────── */}
          <TabsContent value="retirement" className="space-y-4">
            <Card className="bg-slate-800/60 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-300 flex items-center gap-2">
                  <PiggyBank className="h-5 w-5" /> Retirement Overview
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  401k contributions, employer match, and other retirement-tagged items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-5 flex-1 text-center">
                    <p className="text-xs text-yellow-400 mb-1">Total Monthly Retirement Savings</p>
                    <p className="text-4xl font-bold text-yellow-300">{formatCurrency(totalRetirement)}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatCurrency(totalRetirement * 12)}/yr · {totalIncome > 0 ? ((totalRetirement / totalIncome) * 100).toFixed(1) : "0"}% of income
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-700/40 border border-slate-600/30 p-5 flex-1 text-center">
                    <p className="text-xs text-slate-400 mb-1">Projected 10-Year Accumulation</p>
                    <p className="text-4xl font-bold text-slate-200">
                      {formatCurrency(Math.round(totalRetirement * 12 * 10 * 1.5))}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">rough estimate at ~7% avg annual growth</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Item</TableHead>
                      <TableHead className="text-slate-300">Monthly</TableHead>
                      <TableHead className="text-slate-300">Annual</TableHead>
                      <TableHead className="text-slate-300">Recur Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retirementItems.sort((a, b) => b.monthlyCost - a.monthlyCost).map((item) => (
                      <TableRow key={item.id} className="border-slate-700">
                        <TableCell className="text-white text-sm">{item.item}</TableCell>
                        <TableCell className="text-yellow-300 font-semibold">{formatCurrency(item.monthlyCost)}</TableCell>
                        <TableCell className="text-yellow-200/70">{formatCurrency(item.monthlyCost * 12)}</TableCell>
                        <TableCell className="text-slate-400 text-xs">{item.recurType}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-yellow-500/30 bg-yellow-500/5">
                      <TableCell className="text-yellow-300 font-bold">Total</TableCell>
                      <TableCell className="text-yellow-300 font-bold">{formatCurrency(totalRetirement)}</TableCell>
                      <TableCell className="text-yellow-200 font-semibold">{formatCurrency(totalRetirement * 12)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── All Items Table ───────────────────────── */}
          <TabsContent value="table" className="space-y-4">
            <Card className="bg-slate-800/60 border-purple-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-purple-300 text-base">Add New Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-slate-300 text-xs">Item</Label>
                    <Input value={newItem.item} onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                      placeholder="Item name" className="bg-slate-900/50 border-slate-600 text-white h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Category</Label>
                    <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Monthly Cost ($)</Label>
                    <Input type="number" step="0.01" value={newItem.monthlyCost}
                      onChange={(e) => setNewItem({ ...newItem, monthlyCost: e.target.value })}
                      placeholder="0.00" className="bg-slate-900/50 border-slate-600 text-white h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Recur Type</Label>
                    <Select value={newItem.recurType} onValueChange={(v) => setNewItem({ ...newItem, recurType: v })}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {RECUR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddItem} className="w-full bg-green-600 hover:bg-green-700 h-8 text-sm">
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-purple-500/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-purple-300 text-base">All Financial Items</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">{sortedItems.length} items shown</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white h-8 text-xs w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="All">All Categories</SelectItem>
                        <SelectItem value="Income">💚 Income</SelectItem>
                        <SelectItem value="Investment">💚 Investment</SelectItem>
                        <SelectItem value="Retirement">💛 Retirement</SelectItem>
                        {CATEGORIES.filter(c => !["Income", "Investment", "Retirement"].includes(c))
                          .map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300 cursor-pointer hover:text-white text-xs" onClick={() => handleSort("item")}>
                          <div className="flex items-center">Item{getSortIcon("item")}</div>
                        </TableHead>
                        <TableHead className="text-slate-300 cursor-pointer hover:text-white text-xs" onClick={() => handleSort("category")}>
                          <div className="flex items-center">Category{getSortIcon("category")}</div>
                        </TableHead>
                        <TableHead className="text-slate-300 cursor-pointer hover:text-white text-xs" onClick={() => handleSort("monthlyCost")}>
                          <div className="flex items-center">Monthly{getSortIcon("monthlyCost")}</div>
                        </TableHead>
                        <TableHead className="text-slate-300 cursor-pointer hover:text-white text-xs" onClick={() => handleSort("recurType")}>
                          <div className="flex items-center">Recur{getSortIcon("recurType")}</div>
                        </TableHead>
                        <TableHead className="text-slate-300 text-xs">Type</TableHead>
                        <TableHead className="text-slate-300 text-xs">Del</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedItems.map((item) => {
                        const type = classifyItem(item.category);
                        return (
                          <TableRow key={item.id} className="border-slate-700/50 hover:bg-slate-700/20">
                            <TableCell className="text-white text-xs py-2 max-w-[200px] truncate">{item.item}</TableCell>
                            <TableCell className="py-2">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${classifyBadge(item.category)}`}>
                                {item.category}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-xs py-2 font-semibold ${
                              type === "income" ? "text-green-300" :
                              type === "retirement" ? "text-yellow-300" : "text-red-300"
                            }`}>
                              {type !== "expense" ? "+" : "-"}{formatCurrency(item.monthlyCost)}
                            </TableCell>
                            <TableCell className="text-slate-400 text-[10px] py-2">{item.recurType}</TableCell>
                            <TableCell className="py-2">
                              <span className={`text-[10px] font-semibold ${
                                type === "income" ? "text-green-400" :
                                type === "retirement" ? "text-yellow-400" : "text-red-400"
                              }`}>
                                {type === "income" ? "INCOME" : type === "retirement" ? "RETIRE" : "EXPENSE"}
                              </span>
                            </TableCell>
                            <TableCell className="py-2">
                              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)}
                                className="h-6 w-6 p-0 text-red-400/50 hover:text-red-300 hover:bg-red-500/20">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Cash Flow (W2 Only) ───────────────────── */}
          <TabsContent value="cashflow" className="space-y-4">
            <Card className="bg-slate-800/60 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-300 flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> W2 Salary Cash Flow
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Only your <span className="text-blue-300 font-semibold">Post-Tax W2 Salary</span> counts as income here —
                  RSUs, ESPP, and HSA contributions are excluded. This shows your true monthly budget reality.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Key numbers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-center">
                    <p className="text-xs text-blue-400 mb-1">W2 Salary (take-home)</p>
                    <p className="text-3xl font-bold text-blue-300">{formatCurrency(w2Income)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">per month</p>
                  </div>
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
                    <p className="text-xs text-red-400 mb-1">Total Expenses</p>
                    <p className="text-3xl font-bold text-red-300">{formatCurrency(totalExpenses)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">per month</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center border ${cashflowNetRaw >= 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                    <p className={`text-xs mb-1 ${cashflowNetRaw >= 0 ? "text-green-400" : "text-red-400"}`}>W2 Net (excl. retirement)</p>
                    <p className={`text-3xl font-bold ${cashflowNetRaw >= 0 ? "text-green-300" : "text-red-300"}`}>{formatCurrency(cashflowNetRaw)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {w2Income > 0 ? ((cashflowNetRaw / w2Income) * 100).toFixed(1) : "0"}% of W2
                    </p>
                  </div>
                </div>

                {nonW2Income > 0 && (
                  <div className="rounded-lg bg-slate-700/30 border border-slate-600/30 px-4 py-3 mb-5 flex items-start gap-2.5">
                    <span className="text-yellow-400 text-sm mt-0.5">💡</span>
                    <p className="text-xs text-slate-300">
                      <span className="text-yellow-300 font-semibold">{formatCurrency(nonW2Income)}/mo</span> of additional income from
                      RSUs, ESPP, HSA, and other non-W2 sources is excluded from this view.
                      Including those, your total income is <span className="text-green-300 font-semibold">{formatCurrency(totalIncome)}/mo</span>.
                    </p>
                  </div>
                )}

                {/* Pie chart */}
                <ResponsiveContainer width="100%" height={320}>
                  <RechartsPieChart>
                    <Pie data={cashflowPie} cx="50%" cy="50%" outerRadius={120} innerRadius={55}
                      dataKey="value" labelLine={false} label={false}>
                      {cashflowPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value) => <span className="text-slate-200 text-sm">{value}</span>} />
                  </RechartsPieChart>
                </ResponsiveContainer>

                {/* Expense detail */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" /> Where your W2 salary goes (top expenses)
                  </p>
                  <div className="space-y-1">
                    {topExpenses.slice(0, 12).map(item => {
                      const pct = w2Income > 0 ? (item.monthlyCost / w2Income) * 100 : 0;
                      return (
                        <div key={item.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-slate-300 truncate mr-2">{item.item}</span>
                              <span className="text-red-300 shrink-0 font-medium">{formatCurrency(item.monthlyCost)} ({pct.toFixed(1)}% of W2)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-700">
                              <div className="h-1.5 rounded-full bg-red-500/60" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
