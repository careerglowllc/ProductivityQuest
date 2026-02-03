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
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Trash2, Plus, PieChart, List, AlertCircle, CheckCircle, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { FinancialItem } from "@shared/schema";

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

const EXPENSE_COLORS = {
  "General": "#8B5CF6",
  "Business": "#3B82F6",
  "Entertainment": "#EC4899",
  "Food": "#F59E0B",
  "Housing": "#EF4444",
  "Transportation": "#10B981",
  "Phone": "#6366F1",
  "Internet": "#14B8A6",
  "Insurance": "#F97316",
  "Credit Card": "#84CC16",
  "Health (Non Insurance)": "#06B6D4",
  "Toiletries": "#8B5CF6",
  "Charity": "#F43F5E"
};

const INCOME_COLOR = "#22C55E";

export default function Finances() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");
  const [sortField, setSortField] = useState<"item" | "category" | "monthlyCost" | "recurType" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
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
      setNewItem({ item: "", category: "", monthlyCost: "", recurType: "" });
      toast({ title: "Item added successfully" });
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
    statusIcon = <AlertCircle className="h-8 w-8 text-red-500" />;
    statusMessage = "⚠️ Warning: Your expenses exceed your income!";
  } else if (netIncome === 0) {
    statusColor = "text-orange-500";
    statusIcon = <AlertTriangle className="h-8 w-8 text-orange-500" />;
    statusMessage = "⚠️ Caution: You're breaking even with no savings.";
  } else if (savingsRate >= 51 && savingsRate <= 60) {
    statusColor = "text-green-400";
    statusIcon = <CheckCircle className="h-8 w-8 text-green-400" />;
    statusMessage = "✅ Good job! You're saving a healthy amount.";
  } else if (savingsRate > 60) {
    statusColor = "text-green-500";
    statusIcon = <CheckCircle className="h-8 w-8 text-green-500" />;
    statusMessage = "🎉 Excellent! You're saving over 60% of your income!";
  } else {
    statusColor = "text-yellow-500";
    statusIcon = <AlertTriangle className="h-8 w-8 text-yellow-500" />;
    statusMessage = "💡 You're saving, but there's room for improvement.";
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
  ];

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

  // Sorting function
  const handleSort = (field: "item" | "category" | "monthlyCost" | "recurType") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sort icon for a column
  const getSortIcon = (field: "item" | "category" | "monthlyCost" | "recurType") => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Sort financial items
  const sortedFinancialItems = [...financialItems].sort((a, b) => {
    if (!sortField) return 0;
    
    let comparison = 0;
    if (sortField === "monthlyCost") {
      comparison = a.monthlyCost - b.monthlyCost;
    } else if (sortField === "item") {
      comparison = a.item.localeCompare(b.item);
    } else if (sortField === "category") {
      comparison = a.category.localeCompare(b.category);
    } else if (sortField === "recurType") {
      comparison = a.recurType.localeCompare(b.recurType);
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} pb-24`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">
            💰 Financial Dashboard
          </h1>
          <p className="text-slate-400">Track your income and expenses</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800/60 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-300">{formatCurrency(totalIncome)}</p>
              <p className="text-sm text-slate-400">per month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-300">{formatCurrency(totalExpenses)}</p>
              <p className="text-sm text-slate-400">per month</p>
            </CardContent>
          </Card>

          <Card className={`bg-slate-800/60 border-${netIncome >= 0 ? 'green' : 'red'}-500/30`}>
            <CardHeader>
              <CardTitle className={netIncome >= 0 ? 'text-green-400' : 'text-red-400'}>Net Income</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${netIncome >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {formatCurrency(netIncome)}
              </p>
              <p className="text-sm text-slate-400">{savingsRate.toFixed(1)}% savings rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Message */}
        <Alert className={`mb-8 bg-slate-800/60 border-2 ${
          netIncome < 0 ? 'border-red-500/50' :
          netIncome === 0 ? 'border-orange-500/50' :
          savingsRate > 60 ? 'border-green-500/50' :
          savingsRate >= 51 ? 'border-green-400/50' :
          'border-yellow-500/50'
        }`}>
          <div className="flex items-center gap-3">
            {statusIcon}
            <AlertDescription className={`text-lg font-semibold ${statusColor}`}>
              {statusMessage}
            </AlertDescription>
          </div>
        </Alert>

        {/* Tabs for Chart and Table */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "chart" | "table")} className="space-y-4">
          <TabsList className="bg-slate-800/60 border border-purple-500/30">
            <TabsTrigger value="chart" className="data-[state=active]:bg-purple-600/40">
              <PieChart className="h-4 w-4 mr-2" />
              Chart View
            </TabsTrigger>
            <TabsTrigger value="table" className="data-[state=active]:bg-purple-600/40">
              <List className="h-4 w-4 mr-2" />
              Table View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <Card className="bg-slate-800/60 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-300">Monthly Income vs Expenses Breakdown</CardTitle>
                <CardDescription className="text-slate-400">
                  Visual representation of your monthly finances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #6366f1' }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            {/* Add New Item Form */}
            <Card className="bg-slate-800/60 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-300">Add New Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-slate-300">Item</Label>
                    <Input
                      value={newItem.item}
                      onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                      placeholder="Item name"
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Category</Label>
                    <Select value={newItem.category} onValueChange={(val) => setNewItem({ ...newItem, category: val })}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Monthly Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newItem.monthlyCost}
                      onChange={(e) => setNewItem({ ...newItem, monthlyCost: e.target.value })}
                      placeholder="0.00"
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Recur Type</Label>
                    <Select value={newItem.recurType} onValueChange={(val) => setNewItem({ ...newItem, recurType: val })}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {RECUR_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddItem} className="w-full bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Items Table */}
            <Card className="bg-slate-800/60 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-300">Financial Items</CardTitle>
                <CardDescription className="text-slate-400">
                  {financialItems.length} items tracked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort("item")}
                        >
                          <div className="flex items-center">
                            Item
                            {getSortIcon("item")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort("category")}
                        >
                          <div className="flex items-center">
                            Category
                            {getSortIcon("category")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort("monthlyCost")}
                        >
                          <div className="flex items-center">
                            Monthly Cost
                            {getSortIcon("monthlyCost")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-slate-300 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort("recurType")}
                        >
                          <div className="flex items-center">
                            Recur Type
                            {getSortIcon("recurType")}
                          </div>
                        </TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFinancialItems.map((item) => (
                        <TableRow key={item.id} className="border-slate-700">
                          <TableCell className="text-white">{item.item}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              INCOME_CATEGORIES.includes(item.category)
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}>
                              {item.category}
                            </span>
                          </TableCell>
                          <TableCell className={
                            INCOME_CATEGORIES.includes(item.category)
                              ? 'text-green-300 font-semibold'
                              : 'text-red-300 font-semibold'
                          }>
                            {formatCurrency(item.monthlyCost)}
                          </TableCell>
                          <TableCell className="text-slate-300">{item.recurType}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
