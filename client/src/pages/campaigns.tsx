import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Target, Plus, Pencil, Trash2, CheckCircle, Gift, Trophy, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AddQuestlineModal } from "@/components/add-questline-modal";

interface QuestlineTask {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  recycled: boolean | null;
  goldValue: number;
  duration: number;
  importance: string | null;
  questlineOrder: number | null;
  skillTags: string[] | null;
}

interface QuestlineData {
  id: number;
  title: string;
  description: string | null;
  icon: string | null;
  completed: boolean | null;
  completedAt: string | null;
  bonusAwarded: boolean | null;
  tasks: QuestlineTask[];
}

export default function CampaignsPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: questlines = [], isLoading } = useQuery<QuestlineData[]>({
    queryKey: ["/api/questlines"],
  });

  const deleteQuestline = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/questlines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setDeletingId(null);
      toast({ title: "Questline Deleted", description: "The questline has been removed." });
    },
  });

  const checkCompletion = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/questlines/${id}/check-completion`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      if (data.bonusAwarded && data.bonusGold > 0) {
        toast({
          title: "🏆 Questline Complete!",
          description: `3× bonus awarded: 🪙 ${data.bonusGold} gold and ${data.bonusXp} XP!`,
        });
      }
    },
  });

  const active = questlines.filter((q) => !q.completed);
  const completed = questlines.filter((q) => q.completed);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${isMobile ? "pb-20 px-2 pt-1" : "pt-20 px-4"}`}>
      <div className={`max-w-6xl mx-auto ${isMobile ? "py-3" : "py-8"}`}>
        {/* Page Header */}
        <div className={isMobile ? "mb-3" : "mb-8"}>
          <div className={`flex items-center justify-between ${isMobile ? "mb-1" : "mb-2"}`}>
            <div className={`flex items-center ${isMobile ? "gap-2" : "gap-3"}`}>
              <Target className={`${isMobile ? "h-5 w-5" : "h-8 w-8"} text-purple-400`} />
              <h1 className={`${isMobile ? "text-xl" : "text-4xl"} font-serif font-bold text-purple-100`}>
                Questlines
              </h1>
            </div>
            <Button
              size={isMobile ? "sm" : "default"}
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border border-purple-400/50"
            >
              <Plus className={`${isMobile ? "h-3.5 w-3.5 mr-0.5" : "h-4 w-4 mr-1"}`} />
              {isMobile ? "New" : "New Questline"}
            </Button>
          </div>
          {!isMobile && (
            <p className="text-purple-300/70 text-lg">
              Multi-stage quest chains. Complete all stages to earn a 3× gold &amp; XP bonus!
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-purple-300/60">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-400" />
            Loading questlines...
          </div>
        ) : questlines.length === 0 ? (
          <Card className="bg-slate-800/40 border-purple-500/30">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-3 text-purple-400/50" />
              <h3 className="text-lg font-serif text-purple-200 mb-2">No Questlines Yet</h3>
              <p className="text-purple-300/50 text-sm mb-4">
                Create your first multi-stage questline to earn massive bonus rewards.
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Questline
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Questlines */}
            {active.length > 0 && (
              <div className={isMobile ? "mb-4" : "mb-8"}>
                <h2 className={`${isMobile ? "text-base mb-2" : "text-xl mb-4"} font-serif text-purple-200 flex items-center gap-2`}>
                  <Target className="h-5 w-5 text-purple-400" />
                  Active ({active.length})
                </h2>
                <div className={isMobile ? "space-y-2" : "space-y-4"}>
                  {active.map((ql) => (
                    <QuestlineCard
                      key={ql.id}
                      questline={ql}
                      isMobile={isMobile}
                      expanded={expandedId === ql.id}
                      onToggleExpand={() => setExpandedId(expandedId === ql.id ? null : ql.id)}
                      onDelete={() => setDeletingId(ql.id)}
                      onCheckCompletion={() => checkCompletion.mutate(ql.id)}
                      isCheckingCompletion={checkCompletion.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Questlines */}
            {completed.length > 0 && (
              <div>
                <h2 className={`${isMobile ? "text-base mb-2" : "text-xl mb-4"} font-serif text-green-200 flex items-center gap-2`}>
                  <Trophy className="h-5 w-5 text-green-400" />
                  Completed ({completed.length})
                </h2>
                <div className={isMobile ? "space-y-2" : "space-y-4"}>
                  {completed.map((ql) => (
                    <QuestlineCard
                      key={ql.id}
                      questline={ql}
                      isMobile={isMobile}
                      expanded={expandedId === ql.id}
                      onToggleExpand={() => setExpandedId(expandedId === ql.id ? null : ql.id)}
                      onDelete={() => setDeletingId(ql.id)}
                      onCheckCompletion={() => {}}
                      isCheckingCompletion={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Questline Modal */}
      <AddQuestlineModal open={showCreateModal} onOpenChange={setShowCreateModal} />

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="bg-slate-800 border-2 border-red-500/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-200 font-serif">Delete Questline?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">
            This will remove the questline. Its stage tasks will remain but be unlinked.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button
              onClick={() => deletingId && deleteQuestline.mutate(deletingId)}
              disabled={deleteQuestline.isPending}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleteQuestline.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──── Questline Card Component ────

interface QuestlineCardProps {
  questline: QuestlineData;
  isMobile: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onCheckCompletion: () => void;
  isCheckingCompletion: boolean;
}

function QuestlineCard({ questline, isMobile, expanded, onToggleExpand, onDelete, onCheckCompletion, isCheckingCompletion }: QuestlineCardProps) {
  const tasks = questline.tasks || [];
  const completedTasks = tasks.filter((t) => t.completed || t.recycled);
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const totalGold = tasks.reduce((sum, t) => sum + (t.goldValue || 0), 0);
  const bonusGold = totalGold * 3;
  const isComplete = questline.completed;
  const allDone = completedTasks.length === totalTasks && totalTasks > 0;

  return (
    <Card
      className={`overflow-hidden transition-all ${
        isComplete
          ? "bg-green-900/20 border-green-500/30"
          : "bg-purple-900/20 border-purple-500/30 hover:border-purple-400/50"
      }`}
    >
      {/* Progress bar */}
      <div className="h-1 bg-slate-900/50">
        <div
          className={`h-full transition-all ${isComplete ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-purple-500 to-pink-400"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <CardContent className={isMobile ? "p-3" : "p-5"}>
        {/* Header row */}
        <div className="flex items-start gap-3 cursor-pointer" onClick={onToggleExpand}>
          <span className={isMobile ? "text-xl" : "text-2xl"}>{questline.icon || "⚔️"}</span>
          <div className="flex-1 min-w-0">
            <h3 className={`${isMobile ? "text-sm" : "text-lg"} font-serif font-bold ${isComplete ? "text-green-200" : "text-purple-100"}`}>
              {questline.title}
              {isComplete && <span className="ml-2 text-green-400">✓</span>}
            </h3>
            {questline.description && (
              <p className={`${isMobile ? "text-xs" : "text-sm"} ${isComplete ? "text-green-300/50" : "text-purple-300/60"} line-clamp-1`}>
                {questline.description}
              </p>
            )}
          </div>

          {/* Progress + actions */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`${isMobile ? "text-sm" : "text-lg"} font-bold ${isComplete ? "text-green-300" : "text-purple-200"}`}>
              {completedTasks.length}/{totalTasks}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 text-red-400/40 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expanded ? (
              <ChevronUp className={`w-4 h-4 ${isComplete ? "text-green-400/50" : "text-purple-400/50"}`} />
            ) : (
              <ChevronDown className={`w-4 h-4 ${isComplete ? "text-green-400/50" : "text-purple-400/50"}`} />
            )}
          </div>
        </div>

        {/* Expanded: stages list */}
        {expanded && (
          <div className={`${isMobile ? "mt-3" : "mt-4"} space-y-1.5`}>
            {tasks.map((task, idx) => (
              <div key={task.id} className={`flex items-center ${isMobile ? "gap-2 py-1 px-2" : "gap-2.5 py-1.5 px-3"} rounded bg-slate-900/40`}>
                {task.completed || task.recycled ? (
                  <CheckCircle className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} text-green-400 shrink-0`} />
                ) : (
                  <div className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} rounded-full border-2 border-purple-400/40 shrink-0`} />
                )}
                <span className={`flex-1 ${isMobile ? "text-xs" : "text-sm"} truncate ${
                  task.completed || task.recycled ? "text-green-300 line-through opacity-70" : "text-yellow-100"
                }`}>
                  {idx + 1}. {task.title}
                </span>
                <span className={`${isMobile ? "text-[10px]" : "text-xs"} text-yellow-400/50 shrink-0`}>
                  🪙 {task.goldValue}
                </span>
              </div>
            ))}

            {/* Bonus info */}
            <div className={`${isMobile ? "mt-2 p-2" : "mt-3 p-3"} rounded-lg border ${
              isComplete ? "bg-green-950/30 border-green-500/20" : "bg-purple-950/30 border-purple-500/20"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className={`${isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} ${isComplete ? "text-green-400" : "text-purple-400"}`} />
                  <span className={`${isMobile ? "text-xs" : "text-sm"} font-semibold ${isComplete ? "text-green-200" : "text-purple-200"}`}>
                    {isComplete ? "Bonus Awarded!" : "Completion Bonus"}
                  </span>
                </div>
                <span className={`${isMobile ? "text-xs" : "text-sm"} font-bold text-yellow-300`}>
                  🪙 {bonusGold} (3×)
                </span>
              </div>
              {!isComplete && allDone && !questline.bonusAwarded && (
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCheckCompletion(); }}
                  disabled={isCheckingCompletion}
                  className="mt-2 w-full bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-slate-900 font-semibold"
                >
                  {isCheckingCompletion ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trophy className="h-4 w-4 mr-1" />
                  )}
                  Claim 3× Bonus!
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
