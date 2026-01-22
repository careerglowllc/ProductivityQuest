import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Star, MessageCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function NPCsPage() {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} pb-24 relative overflow-hidden`}>
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-32 right-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="h-10 w-10 text-blue-400" />
              <h1 className="text-4xl font-serif font-bold text-yellow-100">NPCs</h1>
            </div>
            <p className="text-yellow-200/70 text-lg">Your Network & Relationships Rolodex</p>
          </div>

          {/* Coming Soon Card */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-blue-600/40">
            <CardHeader className="border-b border-blue-600/30">
              <CardTitle className="text-2xl font-serif text-blue-100 flex items-center gap-2">
                <Star className="h-6 w-6 text-blue-400" />
                Coming Soon
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <UserPlus className="h-24 w-24 text-blue-400/40 mx-auto mb-6" />
                  <h3 className="text-xl font-serif font-bold text-blue-100 mb-3">
                    Your Personal Rolodex
                  </h3>
                  <p className="text-blue-200/70 mb-6 max-w-xl mx-auto">
                    This feature will help you manage and nurture your network of friends, 
                    professional contacts, mentors, and relationships. Stay tuned for:
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MessageCircle className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-blue-100 font-semibold mb-1">Contact Management</h4>
                        <p className="text-blue-300/70 text-sm">
                          Track important details, last contact, and relationship notes
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-blue-100 font-semibold mb-1">Relationship Levels</h4>
                        <p className="text-blue-300/70 text-sm">
                          Track connection strength and relationship categories
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-blue-100 font-semibold mb-1">Reminders</h4>
                        <p className="text-blue-300/70 text-sm">
                          Get nudged to reach out and maintain connections
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MessageCircle className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-blue-100 font-semibold mb-1">Interaction History</h4>
                        <p className="text-blue-300/70 text-sm">
                          Log conversations, meetings, and important moments
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <p className="text-blue-300/60 text-sm italic">
                    Feature currently in development...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
