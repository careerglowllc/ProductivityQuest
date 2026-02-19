import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Crown, Sparkles, Rocket, Gift, Plus, Target, Pencil, Trash2, Check, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const ICON_MAP: Record<string, any> = {
  Sparkles,
  Rocket,
  Crown,
  Gift,
  Target,
};

type QuestStatus = 'completed' | 'in-progress' | 'locked';

interface Quest {
  id: number;
  title: string;
  status: QuestStatus;
}

interface Campaign {
  id: number;
  title: string;
  description: string;
  icon: string;
  quests: Quest[];
  rewards: string[];
  progress: number;
  isActive: boolean;
}

export default function CampaignsPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editQuests, setEditQuests] = useState<Quest[]>([]);
  const [newQuestTitle, setNewQuestTitle] = useState("");

  // Fetch campaigns from API
  const { data: campaignsData = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  // Update campaign mutation
  const updateCampaign = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Campaign> }) => {
      const response = await apiRequest("PATCH", `/api/campaigns/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
  });

  const toggleCampaign = async (campaign: Campaign) => {
    const activeCampaigns = campaignsData.filter((c: Campaign) => c.isActive);
    
    if (campaign.isActive) {
      // Remove from campaigns
      await updateCampaign.mutateAsync({ id: campaign.id, updates: { isActive: false } });
      toast({
        title: "Campaign Removed",
        description: "Questline removed from active campaigns.",
      });
    } else {
      // Add to campaigns (max 2)
      if (activeCampaigns.length >= 2) {
        toast({
          title: "Maximum Campaigns Reached",
          description: "You can only have 2 active campaigns. Remove one to add another.",
          variant: "destructive",
        });
        return;
      }
      await updateCampaign.mutateAsync({ id: campaign.id, updates: { isActive: true } });
      toast({
        title: "Campaign Added",
        description: "Questline marked as active campaign!",
      });
    }
  };

  const openEditModal = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCampaign(campaign);
    setEditQuests([...(campaign.quests || [])]);
    setNewQuestTitle("");
  };

  const handleQuestStatusChange = (questId: number, newStatus: QuestStatus) => {
    setEditQuests(prev => prev.map(q => q.id === questId ? { ...q, status: newStatus } : q));
  };

  const handleQuestTitleChange = (questId: number, newTitle: string) => {
    setEditQuests(prev => prev.map(q => q.id === questId ? { ...q, title: newTitle } : q));
  };

  const handleAddQuest = () => {
    if (!newQuestTitle.trim()) return;
    const maxId = editQuests.reduce((max, q) => Math.max(max, q.id), 0);
    setEditQuests([...editQuests, { id: maxId + 1, title: newQuestTitle.trim(), status: 'locked' }]);
    setNewQuestTitle("");
  };

  const handleRemoveQuest = (questId: number) => {
    setEditQuests(prev => prev.filter(q => q.id !== questId));
  };

  const handleSaveQuests = async () => {
    if (!editingCampaign) return;
    
    // Recalculate progress based on quest statuses
    const completed = editQuests.filter(q => q.status === 'completed').length;
    const total = editQuests.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    await updateCampaign.mutateAsync({
      id: editingCampaign.id,
      updates: { quests: editQuests, progress },
    });
    
    setEditingCampaign(null);
    toast({
      title: "Questline Updated",
      description: "Quest steps and statuses have been saved.",
    });
  };

  const questlines = campaignsData;

  const activeCampaignCount = questlines.filter((q: Campaign) => q.isActive).length;

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

            {isLoading ? (
              <div className="text-center py-8 text-blue-300/70">Loading questlines...</div>
            ) : questlines.length === 0 ? (
              <div className="text-center py-8 text-blue-300/70">No questlines yet. Create one to get started!</div>
            ) : (
            <div className="space-y-4">
              {questlines.map((questline: Campaign) => {
                const isCampaign = questline.isActive;
                const Icon = ICON_MAP[questline.icon] || Target;
                
                return (
                  <Card 
                    key={questline.id}
                    className={`${
                      isCampaign 
                        ? 'bg-purple-900/30 border-2 border-purple-600/40 hover:border-purple-500/60' 
                        : 'bg-blue-900/30 border-2 border-blue-600/40 hover:border-blue-500/60'
                    } transition-all overflow-hidden cursor-pointer`}
                    onClick={() => toggleCampaign(questline)}
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
                              <div className="flex items-start gap-3 flex-shrink-0">
                                {/* Edit Button */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={`${
                                    isCampaign 
                                      ? 'text-purple-300 hover:bg-purple-600/20 hover:text-purple-100' 
                                      : 'text-blue-300 hover:bg-blue-600/20 hover:text-blue-100'
                                  }`}
                                  onClick={(e) => openEditModal(questline, e)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <div className="text-right">
                                  <p className={`text-xs mb-1 ${
                                    isCampaign ? 'text-purple-200/70' : 'text-blue-200/70'
                                  }`}>Progress</p>
                                  <p className={`text-2xl font-bold ${
                                    isCampaign ? 'text-purple-100' : 'text-blue-100'
                                  }`}>{questline.progress}%</p>
                                </div>
                              </div>
                            </div>

                            {/* Quest Chain */}
                            <div className="mt-4 space-y-2">
                              {(questline.quests || []).map((quest: Quest) => (
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
                                {(questline.rewards || []).map((reward: string, idx: number) => (
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
            )}

            {/* Info box */}
            <div className="mt-6 p-4 bg-slate-800/40 rounded-lg border border-slate-600/30">
              <p className="text-sm text-slate-300">
                <strong className="text-purple-300">💡 Tip:</strong> Click on any questline to mark it as an active campaign. 
                Active campaigns are highlighted in purple and will appear in your dashboard for quick tracking.
                {activeCampaignCount > 0 && (
                  <span className="block mt-2 text-purple-300">
                    Currently tracking {activeCampaignCount} of 2 campaigns.
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Quest Modal */}
      <Dialog open={!!editingCampaign} onOpenChange={(open) => !open && setEditingCampaign(null)}>
        <DialogContent className="bg-slate-800 border-2 border-yellow-600/40 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-yellow-100 font-serif">
              Edit Quests — {editingCampaign?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {editQuests.map((quest, index) => (
              <div key={quest.id} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <span className="text-yellow-200/70 text-sm font-mono w-6 flex-shrink-0">{index + 1}.</span>
                <Input
                  value={quest.title}
                  onChange={(e) => handleQuestTitleChange(quest.id, e.target.value)}
                  className="flex-1 bg-slate-800/50 border-slate-600/50 text-yellow-100 text-sm"
                />
                <Select
                  value={quest.status}
                  onValueChange={(val) => handleQuestStatusChange(quest.id, val as QuestStatus)}
                >
                  <SelectTrigger className="w-[130px] bg-slate-800/50 border-slate-600/50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="completed" className="text-green-300">✓ Completed</SelectItem>
                    <SelectItem value="in-progress" className="text-yellow-300">! In Progress</SelectItem>
                    <SelectItem value="locked" className="text-slate-400">🔒 Locked</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/30 h-8 w-8 flex-shrink-0"
                  onClick={() => handleRemoveQuest(quest.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Add New Quest */}
            <div className="flex items-center gap-2 pt-2">
              <Input
                placeholder="New quest step..."
                value={newQuestTitle}
                onChange={(e) => setNewQuestTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddQuest()}
                className="flex-1 bg-slate-800/50 border-slate-600/50 text-yellow-100 text-sm"
              />
              <Button
                size="sm"
                onClick={handleAddQuest}
                disabled={!newQuestTitle.trim()}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCampaign(null)} className="border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100">
              Cancel
            </Button>
            <Button onClick={handleSaveQuests} className="bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-white border border-yellow-400/50">
              <Check className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
