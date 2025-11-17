import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp, Heart, DollarSign, Home, Briefcase, GraduationCap, Target, ChevronDown, ChevronUp, Plus, Plane, Book, Users, Dumbbell, Globe, Trophy, Star, Sparkles, Rocket, Mountain, Compass, Flag, Award, Zap, Gift } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AddCampaignModal } from "@/components/add-campaign-modal";
import { useQuery } from "@tanstack/react-query";

// Icon mapping for custom campaigns
const ICON_MAP: Record<string, any> = {
  Heart, DollarSign, Target, Briefcase, Home, GraduationCap,
  Plane, Book, Users, Dumbbell, Globe, Trophy, Star, Sparkles,
  Crown, Rocket, Mountain, Compass, Flag, Award, Zap, Gift
};

const ICON_COLORS: Record<string, string> = {
  Heart: "text-pink-400",
  DollarSign: "text-green-400",
  Target: "text-blue-400",
  Briefcase: "text-purple-400",
  Home: "text-orange-400",
  GraduationCap: "text-indigo-400",
  Plane: "text-cyan-400",
  Book: "text-amber-400",
  Users: "text-teal-400",
  Dumbbell: "text-red-400",
  Globe: "text-emerald-400",
  Trophy: "text-yellow-400",
  Star: "text-yellow-300",
  Sparkles: "text-pink-300",
  Crown: "text-purple-300",
  Rocket: "text-blue-300",
  Mountain: "text-slate-400",
  Compass: "text-orange-300",
  Flag: "text-red-300",
  Award: "text-amber-300",
  Zap: "text-yellow-400",
  Gift: "text-rose-400",
};

export default function CampaignsPage() {
  const isMobile = useIsMobile();
  const [expandedFinancial, setExpandedFinancial] = useState(false);
  const [expandedPeace, setExpandedPeace] = useState(false);
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);

  // Fetch custom campaigns
  const { data: customCampaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await fetch("/api/campaigns", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      return response.json();
    },
  });

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${isMobile ? 'pb-20' : 'pt-20'} px-4`}>
      <div className="max-w-6xl mx-auto py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="h-8 w-8 text-purple-400" />
            <h1 className="text-4xl font-serif font-bold text-purple-100">Your Campaigns</h1>
          </div>
          <p className="text-purple-300/70 text-lg">
            Track your life's major objectives and milestones
          </p>
        </div>

        {/* Main Campaign - Financial Independence */}
        <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-md border-2 border-purple-600/40 hover:border-purple-500/60 transition-all mb-6">
          <CardHeader className="border-b border-purple-600/30">
            <div className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-purple-400" />
              <CardTitle className="text-2xl font-serif font-bold text-purple-100">Main Campaign</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Financial Independence Section - Collapsible */}
            <div className="mb-6">
              <button
                onClick={() => setExpandedFinancial(!expandedFinancial)}
                className="w-full flex items-center gap-3 p-4 bg-purple-900/30 hover:bg-purple-900/40 border border-purple-600/30 rounded-lg transition-all group"
              >
                <div className="p-3 bg-purple-600/30 rounded-lg border border-purple-500/50">
                  <DollarSign className="h-6 w-6 text-purple-300" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl font-serif font-bold text-purple-100">Financial Independence</h3>
                  <p className="text-purple-300/70 text-sm">Build wealth and achieve freedom</p>
                </div>
                <div className="text-right mr-2">
                  <p className="text-purple-200/70 text-xs mb-1">Current Net Worth</p>
                  <p className="text-2xl font-bold text-purple-100">$500,000</p>
                </div>
                {expandedFinancial ? (
                  <ChevronUp className="h-6 w-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                ) : (
                  <ChevronDown className="h-6 w-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                )}
              </button>

              {expandedFinancial && (
                <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                  {/* Progress Section */}
                  <div className="bg-purple-900/30 border border-purple-600/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-purple-200/90 font-medium">Goal: $1.3M Net Worth</span>
                      <span className="text-purple-100 font-bold text-lg">38.5%</span>
                    </div>
                    <Progress value={38.5} className="h-3 bg-slate-700/50 mb-2">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all" style={{ width: '38.5%' }} />
                    </Progress>
                    <p className="text-sm text-purple-300/70">$800,000 remaining to achieve financial freedom</p>
                  </div>

                  {/* Milestones */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-purple-100 mb-3">Key Milestones</h4>
                    
                    <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-600/30 rounded-lg border border-green-500/50 mt-1">
                          <Target className="h-5 w-5 text-green-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-purple-100">$100K Milestone</h5>
                            <span className="text-xs text-green-300 font-semibold">✓ COMPLETED</span>
                          </div>
                          <p className="text-sm text-purple-300/70">First six figures - The foundation is set</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-600/30 rounded-lg border border-green-500/50 mt-1">
                          <Target className="h-5 w-5 text-green-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-purple-100">$500K Milestone</h5>
                            <span className="text-xs text-green-300 font-semibold">✓ COMPLETED</span>
                          </div>
                          <p className="text-sm text-purple-300/70">Half a million - Momentum is building</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4 border-2 border-yellow-500/50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-yellow-600/30 rounded-lg border border-yellow-500/50 mt-1 animate-pulse">
                          <Target className="h-5 w-5 text-yellow-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-purple-100">$1M Milestone</h5>
                            <span className="text-xs text-yellow-300 font-semibold">IN PROGRESS</span>
                          </div>
                          <p className="text-sm text-purple-300/70 mb-3">Seven figures - Nearly there</p>
                          <Progress value={50} className="h-2 bg-slate-700/50">
                            <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all" style={{ width: '50%' }} />
                          </Progress>
                          <p className="text-xs text-purple-300/60 mt-1">$500,000 / $1,000,000</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4 opacity-60">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-600/30 rounded-lg border border-slate-500/50 mt-1">
                          <Target className="h-5 w-5 text-slate-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-purple-100">$1.3M Goal</h5>
                            <span className="text-xs text-slate-300 font-semibold">LOCKED</span>
                          </div>
                          <p className="text-sm text-purple-300/70">Financial independence achieved</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Strategy & Notes */}
                  <div className="mt-6 bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-purple-100 mb-3">Strategy & Focus Areas</h4>
                    <ul className="space-y-2 text-sm text-purple-300/80">
                      <li className="flex items-start gap-2">
                        <Briefcase className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Career Growth:</strong> Maximize income through skill development and strategic opportunities</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Investment Portfolio:</strong> Diversified assets with focus on long-term growth</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Home className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Real Estate:</strong> Build equity through property ownership</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <GraduationCap className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Continuous Learning:</strong> Invest in skills that compound over time</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Peace of Mind Section - Collapsible */}
            <div>
              <button
                onClick={() => setExpandedPeace(!expandedPeace)}
                className="w-full flex items-center gap-3 p-4 bg-purple-900/30 hover:bg-purple-900/40 border border-purple-600/30 rounded-lg transition-all group"
              >
                <div className="p-3 bg-purple-600/30 rounded-lg border border-purple-500/50">
                  <Heart className="h-6 w-6 text-purple-300" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl font-serif font-bold text-purple-100">Peace of Mind</h3>
                  <p className="text-purple-300/70 text-sm">Mental clarity and emotional balance</p>
                </div>
                {expandedPeace ? (
                  <ChevronUp className="h-6 w-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                ) : (
                  <ChevronDown className="h-6 w-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                )}
              </button>

              {expandedPeace && (
                <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-6">
                    <blockquote className="text-purple-200/90 text-lg italic leading-relaxed mb-4">
                      "Peace is a choice. The journey is all there is. There are no rules to the game."
                    </blockquote>
                    
                    <div className="space-y-3 mt-4">
                      <h4 className="text-base font-semibold text-purple-100">Core Principles</h4>
                      <ul className="space-y-2 text-sm text-purple-300/80">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">•</span>
                          <span>Practice daily mindfulness and presence</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">•</span>
                          <span>Accept what cannot be controlled</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">•</span>
                          <span>Focus on progress, not perfection</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400">•</span>
                          <span>Cultivate gratitude for the present moment</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Future Campaigns Placeholder */}
        {customCampaigns.length > 0 && (
          <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-md border-2 border-purple-600/40 hover:border-purple-500/60 transition-all mb-6">
            <CardHeader className="border-b border-purple-600/30">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-purple-400" />
                <CardTitle className="text-2xl font-serif font-bold text-purple-100">Custom Campaigns</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {customCampaigns.map((campaign: any) => {
                const IconComponent = ICON_MAP[campaign.icon] || Target;
                const iconColor = ICON_COLORS[campaign.icon] || "text-purple-400";
                
                return (
                  <div
                    key={campaign.id}
                    className="flex items-start gap-3 p-4 bg-purple-900/30 border border-purple-600/30 rounded-lg hover:bg-purple-900/40 transition-all"
                  >
                    <div className="p-3 bg-purple-600/30 rounded-lg border border-purple-500/50">
                      <IconComponent className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-serif font-bold text-purple-100 mb-1">
                        {campaign.title}
                      </h3>
                      <p className="text-purple-300/70 text-sm">
                        {campaign.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-800/40 backdrop-blur-md border-2 border-slate-600/30">
          <CardContent className="p-8 text-center">
            <Crown className="h-12 w-12 text-slate-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-serif font-bold text-slate-300 mb-2">Add Your Own Campaign</h3>
            <p className="text-slate-400 text-sm mb-6">
              Create custom life campaigns to track your unique goals and objectives
            </p>
            <Button
              onClick={() => setShowAddCampaignModal(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Custom Campaign
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Add Campaign Modal */}
      <AddCampaignModal
        open={showAddCampaignModal}
        onClose={() => setShowAddCampaignModal(false)}
      />
    </div>
  );
}
