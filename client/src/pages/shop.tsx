import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Coins, ShoppingCart, Star, Plus, Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Common emojis for shop items
const EMOJI_OPTIONS = [
  "🎁", "⭐", "💎", "🏆", "👑", "🎯", "🔥", "⚡", "🌟", "💰",
  "🎨", "📚", "🎮", "🎪", "🎭", "🎬", "🎵", "🎸", "🎹", "🎺",
  "⚔️", "🛡️", "🏹", "🗡️", "🪄", "🔮", "📿", "💍", "👗", "🎩",
  "🍕", "🍔", "🍟", "🍿", "🧃", "☕", "🍰", "🍪", "🎂", "🍫",
  "🚗", "🚀", "🛸", "✈️", "⛵", "🏰", "🏠", "🏖️", "🏔️", "🌈",
];

export default function Shop() {
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemIcon, setNewItemIcon] = useState("🎁");
  
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const { data: progress = { goldTotal: 0 } } = useQuery({
    queryKey: ["/api/progress"],
  });

  const { data: shopItems = [], refetch: refetchItems } = useQuery({
    queryKey: ["/api/shop/items"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest("POST", "/api/shop/purchase", { itemId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful!",
        description: "Item purchased successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setSelectedItemId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Insufficient gold",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest("DELETE", `/api/shop/items/${itemId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Deleted",
        description: "Shop item removed successfully",
      });
      refetchItems();
      setSelectedItemId(null);
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (itemData: { name: string; description: string; cost: number; icon: string }) => {
      const response = await apiRequest("POST", "/api/shop/items", itemData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Added!",
        description: "New shop item created successfully",
      });
      refetchItems();
      setShowAddModal(false);
      setNewItemName("");
      setNewItemDescription("");
      setNewItemCost("");
      setNewItemIcon("🎁");
    },
    onError: () => {
      toast({
        title: "Add Failed",
        description: "Failed to create shop item",
        variant: "destructive",
      });
    },
  });

  const handleBuyItem = () => {
    if (selectedItemId) {
      purchaseMutation.mutate(selectedItemId);
    }
  };

  const handleDeleteItem = () => {
    if (selectedItemId) {
      deleteMutation.mutate(selectedItemId);
    }
  };

  const handleAddItem = () => {
    const cost = parseInt(newItemCost);
    if (!newItemName || !newItemDescription || !cost || cost <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please fill all fields with valid values",
        variant: "destructive",
      });
      return;
    }

    addItemMutation.mutate({
      name: newItemName,
      description: newItemDescription,
      cost,
      icon: newItemIcon,
    });
  };

  const selectedItem = shopItems.find((item: any) => item.id === selectedItemId);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} pb-24 relative overflow-hidden`}>
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-32 right-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl relative">
        {/* Header */}
        <div className="mb-8 text-center border-b border-yellow-600/30 pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ShoppingCart className="h-8 w-8 text-yellow-400" />
            <h1 className="text-4xl font-serif font-bold text-yellow-100">Item Shop</h1>
            <ShoppingCart className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-yellow-200/70 text-lg italic">Spend your hard-earned gold!</p>
          <Button
            onClick={() => setShowAddModal(true)}
            className="mt-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white border border-yellow-400/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Item
          </Button>
        </div>

        {/* Gold Balance */}
        <Card className="mb-8 bg-slate-800/60 backdrop-blur-md border-2 border-yellow-500/50">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-600/20 p-3 rounded-full border border-yellow-500/40">
                <Coins className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-yellow-200/80 font-medium">Your Balance</p>
                <p className="text-3xl font-bold text-yellow-100">{progress.goldTotal} Gold</p>
              </div>
            </div>
            <ShoppingCart className="h-12 w-12 text-yellow-400/20" />
          </CardContent>
        </Card>

        {/* Shop Items */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shopItems.map((item: any) => (
            <Card 
              key={item.id} 
              className={`bg-slate-800/40 backdrop-blur-md border-2 transition-all cursor-pointer ${
                selectedItemId === item.id 
                  ? 'border-yellow-500/60 shadow-lg shadow-yellow-600/20' 
                  : 'border-yellow-600/20 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-600/10'
              }`}
              onClick={() => setSelectedItemId(item.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-4xl">{item.icon}</span>
                    {item.isGlobal && (
                      <Badge variant="outline" className="text-xs bg-blue-900/40 text-blue-200 border-blue-600/40">
                        <Star className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400 font-bold">
                    <Coins className="h-4 w-4" />
                    {item.cost}
                  </div>
                </div>
                <CardTitle className="text-lg text-yellow-100">{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-200/70 text-sm">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Item Actions */}
        {selectedItemId && selectedItem && (
          <Card className="mt-6 bg-slate-800/60 backdrop-blur-md border-2 border-yellow-500/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{selectedItem.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-yellow-100">{selectedItem.name}</h3>
                      {selectedItem.isGlobal && (
                        <Badge variant="outline" className="text-xs bg-blue-900/40 text-blue-200 border-blue-600/40">
                          <Star className="w-3 h-3 mr-1" />
                          Default Item
                        </Badge>
                      )}
                    </div>
                    <p className="text-yellow-200/70">{selectedItem.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Coins className="h-5 w-5 text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-lg">{selectedItem.cost} Gold</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleBuyItem}
                    disabled={purchaseMutation.isPending || (progress as any).goldTotal < selectedItem.cost}
                    className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white border border-green-400/50"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy
                  </Button>
                  {!selectedItem.isGlobal && (
                    <Button
                      onClick={handleDeleteItem}
                      disabled={deleteMutation.isPending}
                      variant="destructive"
                      className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {shopItems.length === 0 && (
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-yellow-400/50" />
              <p className="text-yellow-100 font-medium text-lg mb-2">No items in shop</p>
              <p className="text-yellow-200/70 mb-4">Add your first shop item to get started!</p>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white border border-yellow-400/50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Item Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-slate-800 border-2 border-yellow-600/40 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-100 font-serif text-2xl">Add New Shop Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name" className="text-yellow-200">Item Name</Label>
              <Input
                id="name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter item name"
                className="bg-slate-700/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40"
              />
            </div>
            
            <div>
              <Label htmlFor="cost" className="text-yellow-200">Cost (Gold)</Label>
              <Input
                id="cost"
                type="number"
                value={newItemCost}
                onChange={(e) => setNewItemCost(e.target.value)}
                placeholder="Enter cost"
                className="bg-slate-700/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40"
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-yellow-200">Description</Label>
              <Textarea
                id="description"
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                placeholder="Enter item description"
                className="bg-slate-700/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40"
                rows={3}
              />
            </div>
            
            <div>
              <Label className="text-yellow-200 mb-3 block">Select Icon</Label>
              <div className="grid grid-cols-10 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-900/50 rounded-lg border border-yellow-600/20">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewItemIcon(emoji)}
                    className={`text-3xl p-2 rounded transition-all ${
                      newItemIcon === emoji
                        ? 'bg-yellow-600/40 ring-2 ring-yellow-500'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-center">
                <span className="text-yellow-200/70 text-sm">Selected: </span>
                <span className="text-4xl ml-2">{newItemIcon}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
              className="border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={addItemMutation.isPending}
              className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white border border-yellow-400/50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
