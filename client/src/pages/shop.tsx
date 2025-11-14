import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, ShoppingCart, Star } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Shop() {
  const { data: progress = { goldTotal: 0 } } = useQuery({
    queryKey: ["/api/progress"],
  });
  const isMobile = useIsMobile();

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
          {shopItems.map((item) => (
            <Card key={item.id} className="bg-slate-800/40 backdrop-blur-md border-2 border-yellow-600/20 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-600/10 transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{item.icon}</span>
                  <div className="flex items-center gap-1 text-yellow-400 font-bold">
                    <Coins className="h-4 w-4" />
                    {item.price}
                  </div>
                </div>
                <CardTitle className="text-lg text-yellow-100">{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-200/70 text-sm mb-4">{item.description}</p>
                <Button 
                  className="w-full bg-slate-700/50 border border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100" 
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
        <Card className="mt-8 bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-400" />
              <p className="text-yellow-100 font-medium font-serif">
                More items coming soon! Keep completing tasks to earn gold.
              </p>
              <Star className="h-5 w-5 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
