import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Coins, Tv, Gamepad2, Book, Coffee, Heart, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ItemShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  userGold: number;
  onPurchase: () => void;
}

const iconMap = {
  tv: Tv,
  gamepad: Gamepad2,
  book: Book,
  coffee: Coffee,
  heart: Heart,
  music: Music,
};

const categoryColors = {
  entertainment: "from-purple-50 to-pink-50 border-purple-100 hover:border-purple-200",
  relaxation: "from-green-50 to-emerald-50 border-green-100 hover:border-green-200",
  food: "from-yellow-50 to-orange-50 border-yellow-100 hover:border-yellow-200",
  wellness: "from-red-50 to-pink-50 border-red-100 hover:border-red-200",
};

export function ItemShopModal({ isOpen, onClose, userGold, onPurchase }: ItemShopModalProps) {
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: shopItems = [], isLoading } = useQuery({
    queryKey: ["/api/shop/items"],
  });

  const handlePurchase = async (itemId: number, itemCost: number) => {
    if (userGold < itemCost) {
      toast({
        title: "Insufficient Gold",
        description: "You don't have enough gold to purchase this item.",
        variant: "destructive",
      });
      return;
    }

    setPurchasing(itemId);
    try {
      await apiRequest("POST", "/api/shop/purchase", { shopItemId: itemId });
      toast({
        title: "Purchase Successful!",
        description: "Item has been added to your collection.",
      });
      onPurchase();
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "Failed to purchase item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <ShoppingCart className="w-6 h-6 text-primary" />
            <span>Reward Shop</span>
          </DialogTitle>
          <p className="text-gray-600">Spend your earned gold on recreational rewards!</p>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">Loading shop items...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {shopItems.map((item: any) => {
              const IconComponent = iconMap[item.icon as keyof typeof iconMap] || Coins;
              const colorClass = categoryColors[item.category as keyof typeof categoryColors] || categoryColors.entertainment;
              
              return (
                <Card 
                  key={item.id} 
                  className={`bg-gradient-to-br ${colorClass} border-2 transition-colors`}
                >
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <IconComponent className="w-6 h-6 text-gray-700" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Coins className="w-4 h-4 text-yellow-600" />
                        <span className="font-semibold">{item.cost}</span>
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(item.id, item.cost)}
                        disabled={userGold < item.cost || purchasing === item.id}
                        className="text-sm"
                      >
                        {purchasing === item.id ? "Purchasing..." : "Purchase"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
