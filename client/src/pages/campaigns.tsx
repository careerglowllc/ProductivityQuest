import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Rocket, Gift, Plus, Target } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

export default function CampaignsPage() {
  const isMobile = useIsMobile();
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const { toast } = useToast();

  // Mock questlines data (in real app, this would come from API)
  const questlines = [
    {
      id: 'maximize-looks',
      title: 'Maximize Looks',
      description: 'A comprehensive transformation journey covering fitness, grooming, style, and confidence',
      icon: Sparkles,
      progress: 35,
      quests: [
        { id: 1, title: 'Foundation Assessment Complete', status: 'completed' },
        { id: 2, title: 'Skincare Routine Established', status: 'completed' },
        { id: 3, title: 'Fitness Fundamentals', status: 'in-progress' },
        { id: 4, title: 'Wardrobe Optimization', status: 'locked' },
        { id: 5, title: 'Confidence & Presence', status: 'locked' },
      ],
      rewards: ['🏆 Achievement Badge', '💎 500 Bonus Gold', '⚡ Exclusive Title']
    },
    {
      id: 'remote-business',
      title: 'Build a Self-Sufficient Remote Business',
      description: 'Launch and scale a profitable online business that generates passive income and location freedom',
      icon: Rocket,
      progress: 60,
      quests: [
        { id: 1, title: 'Market Research & Niche Selection', status: 'completed' },
        { id: 2, title: 'MVP Development & Launch', status: 'completed' },
        { id: 3, title: 'First 10 Paying Customers', status: 'completed' },
        { id: 4, title: 'Scale to $10K MRR', status: 'in-progress' },
        { id: 5, title: 'Automation & Systems', status: 'locked' },
        { id: 6, title: 'Full Location Independence', status: 'locked' },
      ],
      rewards: ['🏆 Entrepreneur Badge', '💎 1000 Bonus Gold', '⚡ "Digital Nomad" Title']
    },
  ];

  const toggleCampaign = (questlineId: string) => {
    if (selectedCampaigns.includes(questlineId)) {
      // Remove from campaigns
      setSelectedCampaigns(selectedCampaigns.filter(id => id !== questlineId));
      toast({
        title: "Campaign Removed",
        description: "Questline removed from active campaigns.",
      });
    } else {
      // Add to campaigns (max 2)
      if (selectedCampaigns.length >= 2) {
        toast({
          title: "Maximum Campaigns Reached",
          description: "You can only have 2 active campaigns. Remove one to add another.",
          variant: "destructive",
        });
        return;
      }
      setSelectedCampaigns([...selectedCampaigns, questlineId]);
      toast({
        title: "Campaign Added",
        description: "Questline marked as active campaign!",
      });
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${isMobile ? 'pb-20' : 'pt-20'} px-4`}>
      <div className="max-w-6xl mx-auto py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-8 w-8 text-purple-400" />
            <h1 className="text-4xl font-serif font-bold text-purple-100">Active Questlines</h1>
          </div>
          <p className="text-purple-300/70 text-lg">
            Select up to 2 questlines as active campaigns to track your major life objectives
          </p>
        </div>

        {/* Active Questlines */}
        <Card className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 backdrop-blur-md border-2 border-blue-600/40 mb-6">
          <CardHeader className="border-b border-blue-600/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-blue-400" />
                <CardTitle className="text-2xl font-serif font-bold text-blue-100">
                  Active Questlines
                </CardTitle>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Questline
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-blue-300/70 mb-6 text-sm">
              Questlines are interconnected series of tasks that guide you towards specific transformations. 
              Click on a questline to mark it as an active campaign (max 2). Campaigns are highlighted in purple.
            </p>

            <div className="space-y-4">
              {questlines.map((questline) => {
                const isCampaign = selectedCampaigns.includes(questline.id);
                const Icon = questline.icon;
                
                return (
                  <Card 
                    key={questline.id}
                    className={`${
                      isCampaign 
                        ? 'bg-purple-900/30 border-2 border-purple-600/40 hover:border-purple-500/60' 
                        : 'bg-blue-900/30 border-2 border-blue-600/40 hover:border-blue-500/60'
                    } transition-all overflow-hidden cursor-pointer`}
                    onClick={() => toggleCampaign(questline.id)}
                  >
                    <div className="relative">
                      {/* Campaign Badge */}
                      {isCampaign && (
                        <div className="absolute top-4 right-4 z-10">
                          <div className="flex items-center gap-1 px-3 py-1 bg-purple-600/90 rounded-full border border-purple-400">
                            <Crown className="h-3 w-3 text-purple-200" />
                            <span className="text-xs font-bold text-purple-100">CAMPAIGN</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Progress bar at top */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-950/50">
                        <div 
                          className={`h-full ${
                            isCampaign 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-400' 
                              : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          }`}
                          style={{ width: `${questline.progress}%` }} 
                        />
                      </div>
                      
                      <CardContent className="pt-6 pb-4 px-6">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`p-3 rounded-xl border-2 flex-shrink-0 ${
                            isCampaign
                              ? 'bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-purple-500/50'
                              : 'bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border-blue-500/50'
                          }`}>
                            <Icon className={`h-7 w-7 ${
                              isCampaign ? 'text-purple-300' : 'text-blue-300'
                            }`} />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h3 className={`text-xl font-serif font-bold mb-1 ${
                                  isCampaign ? 'text-purple-100' : 'text-blue-100'
                                }`}>
                                  {questline.title}
                                </h3>
                                <p className={`text-sm ${
                                  isCampaign ? 'text-purple-300/70' : 'text-blue-300/70'
                                }`}>
                                  {questline.description}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-xs mb-1 ${
                                  isCampaign ? 'text-purple-200/70' : 'text-blue-200/70'
                                }`}>Progress</p>
                                <p className={`text-2xl font-bold ${
                                  isCampaign ? 'text-purple-100' : 'text-blue-100'
                                }`}>{questline.progress}%</p>
                              </div>
                            </div>

                            {/* Quest Chain */}
                            <div className="mt-4 space-y-2">
                              {questline.quests.map((quest) => (
                                <div key={quest.id} className="flex items-center gap-2">
                                  {quest.status === 'completed' && (
                                    <>
                                      <div className="w-6 h-6 rounded-full bg-green-600/30 border-2 border-green-500 flex items-center justify-center flex-shrink-0">
                                        <span className="text-green-300 text-xs">✓</span>
                                      </div>
                                      <span className={`text-sm ${
                                        isCampaign ? 'text-purple-200/90' : 'text-blue-200/90'
                                      }`}>Quest {quest.id}: {quest.title}</span>
                                    </>
                                  )}
                                  {quest.status === 'in-progress' && (
                                    <>
                                      <div className="w-6 h-6 rounded-full bg-yellow-600/30 border-2 border-yellow-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                                        <span className="text-yellow-300 text-xs font-bold">!</span>
                                      </div>
                                      <span className={`text-sm font-semibold ${
                                        isCampaign ? 'text-purple-100' : 'text-blue-100'
                                      }`}>Quest {quest.id}: {quest.title} (In Progress)</span>
                                    </>
                                  )}
                                  {quest.status === 'locked' && (
                                    <>
                                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                        isCampaign 
                                          ? 'bg-purple-900/50 border-purple-600/40' 
                                          : 'bg-blue-900/50 border-blue-600/40'
                                      }`}>
                                        <span className={`text-xs ${
                                          isCampaign ? 'text-purple-400/50' : 'text-blue-400/50'
                                        }`}>{quest.id}</span>
                                      </div>
                                      <span className={`text-sm ${
                                        isCampaign ? 'text-purple-300/50' : 'text-blue-300/50'
                                      }`}>Quest {quest.id}: {quest.title} (Locked)</span>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Rewards Preview */}
                            <div className={`mt-4 p-3 rounded-lg border ${
                              isCampaign 
                                ? 'bg-purple-950/40 border-purple-600/30' 
                                : 'bg-blue-950/40 border-blue-600/30'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Gift className={`h-4 w-4 ${
                                  isCampaign ? 'text-purple-400' : 'text-blue-400'
                                }`} />
                                <span className={`text-xs font-semibold ${
                                  isCampaign ? 'text-purple-200' : 'text-blue-200'
                                }`}>Questline Rewards</span>
                              </div>
                              <div className={`flex items-center gap-4 text-xs ${
                                isCampaign ? 'text-purple-300/80' : 'text-blue-300/80'
                              }`}>
                                {questline.rewards.map((reward, idx) => (
                                  <span key={idx}>{reward}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Info box */}
            <div className="mt-6 p-4 bg-slate-800/40 rounded-lg border border-slate-600/30">
              <p className="text-sm text-slate-300">
                <strong className="text-purple-300">💡 Tip:</strong> Click on any questline to mark it as an active campaign. 
                Active campaigns are highlighted in purple and will appear in your dashboard for quick tracking.
                {selectedCampaigns.length > 0 && (
                  <span className="block mt-2 text-purple-300">
                    Currently tracking {selectedCampaigns.length} of 2 campaigns.
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
