import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Target, Plus, Pencil, Trash2, CheckCircle, Gift, Trophy, ChevronDown, ChevronUp, Loader2, Circle, Clock, Check, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AddQuestlineModal } from "@/components/add-questline-modal";
import { EmojiPicker } from "@/components/emoji-picker";

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
  parentTaskId: number | null;
  indentLevel: number | null;
  kanbanStage: string | null;
  emoji: string | null;
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

// ──── Kanban Status Helpers ────

type KanbanStatus = "Done" | "In Progress" | "Not Started";

/** Derive the effective kanban status from task data */
function getEffectiveStatus(task: QuestlineTask): KanbanStatus {
  if (task.completed || task.recycled) return "Done";
  if (task.kanbanStage === "Done") return "Done";
  if (task.kanbanStage === "In Progress" || task.kanbanStage === "Review") return "In Progress";
  return "Not Started";
}

/** Cycle through statuses: Not Started → In Progress → Done → Not Started */
function nextStatus(current: KanbanStatus): KanbanStatus {
  if (current === "Not Started") return "In Progress";
  if (current === "In Progress") return "Done";
  return "Not Started"; // Done → Not Started
}

// ──── Animated Kanban Status Icon ────

function KanbanStatusIcon({ status, size = 16, onClick }: { status: KanbanStatus; size?: number; onClick?: (e: React.MouseEvent) => void }) {
  const sizeClass = size <= 14 ? "w-3.5 h-3.5" : "w-4 h-4";

  if (status === "Done") {
    return (
      <button onClick={onClick} className={`${sizeClass} shrink-0 group relative`} title="Done — click to change">
        <svg viewBox="0 0 24 24" className="w-full h-full animate-[kanbanCheckPop_0.35s_ease-out]">
          <circle cx="12" cy="12" r="10" fill="#22c55e" className="animate-[kanbanCheckFill_0.3s_ease-out]" />
          <path
            d="M7 12.5l3.5 3.5 6.5-7"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-[kanbanCheckDraw_0.35s_ease-out_0.15s_both]"
            style={{ strokeDasharray: 20, strokeDashoffset: 0 }}
          />
        </svg>
      </button>
    );
  }

  if (status === "In Progress") {
    return (
      <button onClick={onClick} className={`${sizeClass} shrink-0 group relative`} title="In Progress — click to change">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          {/* Outer spinning track */}
          <circle cx="12" cy="12" r="10" fill="none" stroke="#a855f7" strokeWidth="2" opacity="0.25" />
          {/* Spinning arc */}
          <circle
            cx="12" cy="12" r="10"
            fill="none"
            stroke="#a855f7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="20 43"
            className="animate-[kanbanSpin_1.2s_linear_infinite] origin-center"
          />
          {/* Center dot pulse */}
          <circle cx="12" cy="12" r="3" fill="#a855f7" className="animate-[kanbanPulse_2s_ease-in-out_infinite]" />
        </svg>
      </button>
    );
  }

  // Not Started — grey hollow circle
  return (
    <button onClick={onClick} className={`${sizeClass} shrink-0 group relative`} title="Not Started — click to change">
      <svg viewBox="0 0 24 24" className="w-full h-full transition-colors group-hover:opacity-80">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
      </svg>
    </button>
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const tasks = questline.tasks || [];
  const completedTasks = tasks.filter((t) => t.completed || t.recycled);
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const totalGold = tasks.reduce((sum, t) => sum + (t.goldValue || 0), 0);
  const bonusGold = totalGold * 3;
  const isComplete = questline.completed;
  const allDone = completedTasks.length === totalTasks && totalTasks > 0;

  // ── Edit mode state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(questline.title);
  const [editDesc, setEditDesc] = useState(questline.description || "");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskGold, setEditTaskGold] = useState("");
  const taskTitleRef = useRef<HTMLInputElement>(null);

  // ── Questline header update mutation ──
  const updateQuestline = useMutation({
    mutationFn: async (updates: { title?: string; description?: string; icon?: string }) => {
      return apiRequest("PATCH", `/api/questlines/${questline.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update questline.", variant: "destructive" });
    },
  });

  // ── Task field update mutation ──
  const updateTask = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    },
  });

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(questline.title);
    setEditDesc(questline.description || "");
    setIsEditing(true);
    // Also expand the card so stages are visible for editing
    if (!expanded) onToggleExpand();
  };

  const saveQuestlineEdits = () => {
    const updates: Record<string, string> = {};
    if (editTitle.trim() && editTitle !== questline.title) updates.title = editTitle.trim();
    if (editDesc !== (questline.description || "")) updates.description = editDesc;
    if (Object.keys(updates).length > 0) updateQuestline.mutate(updates);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingTaskId(null);
  };

  const startEditingTask = (e: React.MouseEvent, task: QuestlineTask) => {
    if (!isEditing) return;
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskGold(String(task.goldValue || 0));
    setTimeout(() => taskTitleRef.current?.focus(), 50);
  };

  const saveTaskEdits = (taskId: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updates: Record<string, unknown> = {};
    if (editTaskTitle.trim() && editTaskTitle !== task.title) updates.title = editTaskTitle.trim();
    const goldNum = parseInt(editTaskGold);
    if (!isNaN(goldNum) && goldNum !== task.goldValue) updates.goldValue = goldNum;
    if (Object.keys(updates).length > 0) updateTask.mutate({ taskId, updates });
    setEditingTaskId(null);
  };

  // ── Kanban status toggle mutation ──
  const updateKanbanStatus = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: number; newStatus: KanbanStatus }) => {
      const updates: Record<string, unknown> = { kanbanStage: newStatus };
      // Sync completed flag with Done status
      if (newStatus === "Done") {
        updates.completed = true;
      } else {
        updates.completed = false;
      }
      return apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
    },
    onMutate: async ({ taskId, newStatus }) => {
      // Optimistic update in the questlines cache
      await queryClient.cancelQueries({ queryKey: ["/api/questlines"] });
      queryClient.setQueryData<QuestlineData[]>(["/api/questlines"], (old) => {
        if (!old) return old;
        return old.map((ql) => {
          if (ql.id !== questline.id) return ql;
          return {
            ...ql,
            tasks: ql.tasks.map((t) => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                kanbanStage: newStatus,
                completed: newStatus === "Done",
                recycled: newStatus === "Done" ? t.recycled : null,
              };
            }),
          };
        });
      });
    },
    onSuccess: () => {
      // Delayed refetch to keep optimistic UI stable
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      }, 800);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const handleStatusClick = useCallback((e: React.MouseEvent, task: QuestlineTask) => {
    e.stopPropagation();
    const current = getEffectiveStatus(task);
    const next = nextStatus(current);
    updateKanbanStatus.mutate({ taskId: task.id, newStatus: next });
  }, [updateKanbanStatus]);

  // ── Emoji update mutation ──
  const updateEmoji = useMutation({
    mutationFn: async ({ taskId, emoji }: { taskId: number; emoji: string }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { emoji });
    },
    onMutate: async ({ taskId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/questlines"] });
      queryClient.setQueryData<QuestlineData[]>(["/api/questlines"], (old) => {
        if (!old) return old;
        return old.map((ql) => {
          if (ql.id !== questline.id) return ql;
          return {
            ...ql,
            tasks: ql.tasks.map((t) =>
              t.id === taskId ? { ...t, emoji } : t
            ),
          };
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      toast({ title: "Error", description: "Failed to update emoji.", variant: "destructive" });
    },
  });

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
        <div className="flex items-start gap-3 cursor-pointer" onClick={isEditing ? undefined : onToggleExpand}>
          <span className={isMobile ? "text-xl" : "text-2xl"}>{questline.icon || "⚔️"}</span>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-slate-900/60 border-purple-500/40 text-purple-100 font-serif font-bold h-8 text-sm"
                  placeholder="Questline title"
                />
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="bg-slate-900/60 border-purple-500/30 text-purple-300/70 h-7 text-xs"
                  placeholder="Description (optional)"
                />
              </div>
            ) : (
              <>
                <h3 className={`${isMobile ? "text-sm" : "text-lg"} font-serif font-bold ${isComplete ? "text-green-200" : "text-purple-100"}`}>
                  {questline.title}
                  {isComplete && <span className="ml-2 text-green-400">✓</span>}
                </h3>
                {questline.description && (
                  <p className={`${isMobile ? "text-xs" : "text-sm"} ${isComplete ? "text-green-300/50" : "text-purple-300/60"} line-clamp-1`}>
                    {questline.description}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Progress + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); saveQuestlineEdits(); }}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors"
                  title="Save"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                  className="p-1 text-red-400/60 hover:text-red-400 transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className={`${isMobile ? "text-sm" : "text-lg"} font-bold ${isComplete ? "text-green-300" : "text-purple-200"}`}>
                  {completedTasks.length}/{totalTasks}
                </span>
                <button
                  onClick={startEditing}
                  className="p-1 text-purple-400/40 hover:text-purple-300 transition-colors"
                  title="Edit questline"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
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
              </>
            )}
          </div>
        </div>

        {/* Expanded: stages list */}
        {expanded && (
          <div className={`${isMobile ? "mt-3" : "mt-4"} space-y-1`}>
            {isEditing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-purple-500/10 border border-purple-500/20 mb-2">
                <Pencil className="w-3 h-3 text-purple-400" />
                <span className="text-[11px] text-purple-300/70">Click any stage to edit its title and gold value</span>
              </div>
            )}
            {tasks.map((task, idx) => {
              const indent = task.indentLevel || 0;
              const status = getEffectiveStatus(task);
              const depthColor = indent === 0 ? "border-l-purple-500/40" : indent === 1 ? "border-l-blue-500/30" : indent === 2 ? "border-l-cyan-500/30" : indent === 3 ? "border-l-teal-500/25" : "border-l-slate-500/20";

              return (
                <div
                  key={task.id}
                  className={`flex items-center ${isMobile ? "gap-2 py-1.5 px-2" : "gap-2.5 py-1.5 px-3"} rounded transition-colors ${
                    status === "Done"
                      ? "bg-green-950/30"
                      : status === "In Progress"
                      ? "bg-purple-950/30"
                      : "bg-slate-900/40"
                  } ${indent > 0 ? `border-l-2 ${depthColor}` : ""}`}
                  style={{ marginLeft: `${indent * (isMobile ? 12 : 16)}px` }}
                >
                  <KanbanStatusIcon
                    status={status}
                    size={isMobile ? 14 : 16}
                    onClick={(e) => handleStatusClick(e, task)}
                  />
                  <span
                    className="flex-shrink-0 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EmojiPicker
                      value={task.emoji || "📝"}
                      onChange={(emoji: string) => updateEmoji.mutate({ taskId: task.id, emoji })}
                      size="sm"
                    />
                  </span>
                  {indent > 0 && (
                    <span className={`text-[8px] font-bold px-1 py-0 rounded ${
                      indent === 1 ? "bg-blue-500/15 text-blue-400/60" :
                      indent === 2 ? "bg-cyan-500/15 text-cyan-400/60" :
                      indent === 3 ? "bg-teal-500/15 text-teal-400/60" :
                      "bg-slate-500/15 text-slate-400/60"
                    } shrink-0`}>
                      L{indent}
                    </span>
                  )}
                  {isEditing && editingTaskId === task.id ? (
                    <>
                      <Input
                        ref={taskTitleRef}
                        value={editTaskTitle}
                        onChange={(e) => setEditTaskTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveTaskEdits(task.id); if (e.key === "Escape") setEditingTaskId(null); }}
                        className="flex-1 bg-slate-900/60 border-purple-500/40 text-purple-100 h-7 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-yellow-400/50 text-[10px]">🪙</span>
                        <Input
                          value={editTaskGold}
                          onChange={(e) => setEditTaskGold(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveTaskEdits(task.id); if (e.key === "Escape") setEditingTaskId(null); }}
                          className="w-14 bg-slate-900/60 border-yellow-600/30 text-yellow-200 h-7 text-xs text-center"
                          type="number"
                        />
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); saveTaskEdits(task.id); }} className="p-0.5 text-green-400 hover:text-green-300">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingTaskId(null); }} className="p-0.5 text-red-400/60 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className={`flex-1 ${isMobile ? "text-xs" : "text-sm"} truncate transition-all ${
                          status === "Done"
                            ? "text-green-300 line-through opacity-60"
                            : status === "In Progress"
                            ? "text-purple-200"
                            : "text-slate-300"
                        } ${isEditing ? "cursor-pointer hover:text-purple-200" : ""}`}
                        onClick={(e) => startEditingTask(e, task)}
                      >
                        {task.title}
                      </span>
                      {status === "In Progress" && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 shrink-0">
                          Active
                        </span>
                      )}
                      <span className={`${isMobile ? "text-[10px]" : "text-xs"} shrink-0 ${
                        status === "Done" ? "text-green-400/40" : "text-yellow-400/50"
                      }`}>
                        🪙 {task.goldValue}
                      </span>
                    </>
                  )}
                </div>
              );
            })}

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
