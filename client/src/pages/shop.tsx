import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, ShoppingCart } from "lucide-react";

export default function Shop() {
  const { data: progress = { goldTotal: 0 } } = useQuery({
    queryKey: ["/api/progress"],
  });

  // Placeholder shop items - backend implementation pending
  const shopItems = [
    {
      id: 1,
      name: "Item 1",
      description: "Coming soon",
      price: 100,
      icon: "🎁",
    },
    {
      id: 2,
      name: "Item 2",
      description: "Coming soon",
      price: 250,
      icon: "⭐",
    },
    {
      id: 3,
      name: "Item 3",
      description: "Coming soon",
      price: 500,
      icon: "💎",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Shop</h1>
          <p className="text-gray-600">Spend your hard-earned gold!</p>
        </div>

        {/* Gold Balance */}
        <Card className="mb-8 bg-gradient-to-r from-yellow-400 to-yellow-500 border-0">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-yellow-900" />
              <div>
                <p className="text-sm text-yellow-900 font-medium">Your Balance</p>
                <p className="text-3xl font-bold text-yellow-900">{progress.goldTotal} Gold</p>
              </div>
            </div>
            <ShoppingCart className="h-12 w-12 text-yellow-900 opacity-20" />
          </CardContent>
        </Card>

        {/* Shop Items */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shopItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{item.icon}</span>
                  <div className="flex items-center gap-1 text-yellow-600 font-bold">
                    <Coins className="h-4 w-4" />
                    {item.price}
                  </div>
                </div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                <Button 
                  className="w-full" 
                  variant="outline"
                  disabled
                >
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon Message */}
        <Card className="mt-8 bg-purple-50 border-purple-200">
          <CardContent className="p-6 text-center">
            <p className="text-purple-900 font-medium">
              More items coming soon! Keep completing tasks to earn gold.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
