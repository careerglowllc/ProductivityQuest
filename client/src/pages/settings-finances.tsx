import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Trash2, Plus, AlertCircle, CheckCircle, AlertTriangle, ChevronLeft, DollarSign } from "lucide-react";
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { FinancialItem } from "@shared/schema";
import { Link } from "wouter";

const CATEGORIES = [
  "General",
  "Business", 
  "Entertainment",
  "Food",
  "Housing",
  "Transportation",
  "Phone",
  "Internet",
  "Insurance",
  "Credit Card",
  "Health (Non Insurance)",
  "Toiletries",
  "Charity",
  "Income",
  "Retirement",
  "Investment"
];

const RECUR_TYPES = [
  "Monthly",
  "Yearly (Amortized)",
  "Biweekly (Summed Monthly)",
  "2x a Year"
];

// Only "Income" category is considered money coming in (green)
// All other categories are expenses (reddish)
const INCOME_CATEGORIES = ["Income"];

const EXPENSE_COLORS: Record<string, string> = {
  "General": "#8B5CF6",
  "Business": "#3B82F6",
  "Entertainment": "#EC4899",
  "Food": "#F59E0B",
  "Housing": "#EF4444",
  "Transportation": "#10B981",
  "Phone": "#6366F1",
  "Internet": "#14B8A6",
  "Insurance": "#F97316",
  "Credit Card": "#DC2626",
  "Health (Non Insurance)": "#84CC16",
  "Toiletries": "#A855F7",
  "Charity": "#06B6D4",
};

const INCOME_COLOR = "#22C55E";

export default function SettingsFinances() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    item: "",
    category: "",
    monthlyCost: "",
    recurType: ""
  });

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
      toast({ title: "Item added successfully" });
      setNewItem({ item: "", category: "", monthlyCost: "", recurType: "" });
      setShowAddForm(false);
    },
    onError: () => {
      toast({ title: "Failed to add item", variant: "destructive" });
    },
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
    onError: () => {
      toast({ title: "Failed to delete item", variant: "destructive" });
    },
  });

  // Calculate totals
  const totalIncome = financialItems
    .filter(item => INCOME_CATEGORIES.includes(item.category))
    .reduce((sum, item) => sum + item.monthlyCost, 0);

  const totalExpenses = financialItems
    .filter(item => !INCOME_CATEGORIES.includes(item.category))
    .reduce((sum, item) => sum + item.monthlyCost, 0);

  const netIncome = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100) : 0;

  // Determine status
  let statusColor = "";
  let statusIcon = null;
  let statusMessage = "";

  if (netIncome < 0) {
    statusColor = "text-red-500";
    statusIcon = <AlertCircle className="h-6 w-6 text-red-500" />;
    statusMessage = "⚠️ Warning: Expenses exceed income";
  } else if (netIncome === 0) {
    statusColor = "text-orange-500";
    statusIcon = <AlertTriangle className="h-6 w-6 text-orange-500" />;
    statusMessage = "⚠️ Breaking even, no savings";
  } else if (savingsRate >= 51 && savingsRate <= 60) {
    statusColor = "text-green-400";
    statusIcon = <CheckCircle className="h-6 w-6 text-green-400" />;
    statusMessage = "✅ Good savings rate";
  } else if (savingsRate > 60) {
    statusColor = "text-green-500";
    statusIcon = <CheckCircle className="h-6 w-6 text-green-500" />;
    statusMessage = "🎉 Excellent! Saving 60%+";
  } else {
    statusColor = "text-yellow-500";
    statusIcon = <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    statusMessage = "💡 Room for improvement";
  }

  // Prepare pie chart data
  const expensesByCategory = financialItems
    .filter(item => !INCOME_CATEGORIES.includes(item.category))
    .reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = 0;
      }
      acc[item.category] += item.monthlyCost;
      return acc;
    }, {} as Record<string, number>);

  const pieData = [
    { name: "Income", value: totalIncome, color: INCOME_COLOR },
    ...Object.entries(expensesByCategory).map(([category, value]) => ({
      name: category,
      value,
      color: EXPENSE_COLORS[category as keyof typeof EXPENSE_COLORS] || "#94A3B8"
    }))
  ].filter(item => item.value > 0);

  const handleAddItem = () => {
    if (!newItem.item || !newItem.category || !newItem.monthlyCost || !newItem.recurType) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    const costInCents = Math.round(parseFloat(newItem.monthlyCost) * 100);
    createMutation.mutate({
      item: newItem.item,
      category: newItem.category,
      monthlyCost: costInCents,
      recurType: newItem.recurType
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header with back button */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-green-200 hover:text-green-100 hover:bg-green-600/20">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-400" />
              Finances
            </h1>
            <p className="text-slate-400 text-sm">Track monthly income & expenses</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="bg-slate-800/60 border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-400">Monthly Income</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-300">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-slate-400">per month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-red-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-400">Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-red-300">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-slate-400">per month</p>
            </CardContent>
          </Card>
        </div>

        <Card className={`bg-slate-800/60 border-${netIncome >= 0 ? 'green' : 'red'}-500/30 mb-6`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>Monthly Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {formatCurrency(netIncome)}
            </p>
            <p className="text-xs text-slate-400">{savingsRate.toFixed(1)}% savings rate</p>
          </CardContent>
        </Card>

        {/* Status Message */}
        <Alert className={`mb-6 bg-slate-800/60 border-2 ${
          netIncome < 0 ? 'border-red-500/50' :
          netIncome === 0 ? 'border-orange-500/50' :
          savingsRate > 60 ? 'border-green-500/50' :
          savingsRate >= 51 ? 'border-green-400/50' :
          'border-yellow-500/50'
        }`}>
          <div className="flex items-center gap-3">
            {statusIcon}
            <AlertDescription className={`${statusColor} font-medium`}>
              {statusMessage}
            </AlertDescription>
          </div>
        </Alert>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <Card className="bg-slate-800/60 border-green-500/30 mb-6">
            <CardHeader>
              <CardTitle className="text-green-400">Monthly Income vs Expenses</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Hover on chart for details</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(30, 41, 59, 0.95)',
                      border: '1px solid rgb(34, 197, 94, 0.3)',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      fontSize: '10px',
                      paddingTop: '10px'
                    }}
                    iconType="circle"
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Add Item Button */}
        {!showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full mb-6 bg-green-600 hover:bg-green-500 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Financial Item
          </Button>
        )}

        {/* Add Item Form */}
        {showAddForm && (
          <Card className="bg-slate-800/60 border-green-500/30 mb-6">
            <CardHeader>
              <CardTitle className="text-green-400">Add New Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Item Name</Label>
                <Input
                  value={newItem.item}
                  onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                  placeholder="e.g., Netflix Subscription"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              
              <div>
                <Label className="text-slate-300">Category</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-white hover:bg-slate-700">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Monthly Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.monthlyCost}
                  onChange={(e) => setNewItem({ ...newItem, monthlyCost: e.target.value })}
                  placeholder="0.00"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Recurrence Type</Label>
                <Select value={newItem.recurType} onValueChange={(value) => setNewItem({ ...newItem, recurType: value })}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {RECUR_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="text-white hover:bg-slate-700">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddItem}
                  disabled={createMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-500"
                >
                  Add Item
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItem({ item: "", category: "", monthlyCost: "", recurType: "" });
                  }}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Table */}
        <Card className="bg-slate-800/60 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400">All Items</CardTitle>
            <CardDescription className="text-slate-400">{financialItems.length} total items</CardDescription>
          </CardHeader>
          <CardContent>
            {financialItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No financial items yet. Add one to get started!
              </div>
            ) : (
              <div className="space-y-2">
                {financialItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{item.item}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-slate-600/50 text-slate-300 rounded">
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-400">{item.recurType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className={`font-bold text-sm ${
                        INCOME_CATEGORIES.includes(item.category) ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(item.monthlyCost)}
                      </span>
                      <Button
                        onClick={() => deleteMutation.mutate(item.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-600/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
