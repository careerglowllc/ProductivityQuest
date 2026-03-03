import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { calculateGoldValue } from "@/lib/goldCalculation";

const QUESTLINE_ICONS = ["⚔️", "🛡️", "🏰", "🐉", "🧙", "👑", "💎", "🔮", "🗡️", "🏹", "⚡", "🔥", "🌟", "📜", "🎯", "🚀", "💰", "🧪", "🎭", "🌙"];

interface Stage {
  id: string;
  title: string;
  description: string;
  duration: string;
  importance: string;
  businessWorkFilter: string;
  campaign: string;
  expanded: boolean;
}

function createEmptyStage(): Stage {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    duration: "30",
    importance: "Medium",
    businessWorkFilter: "General",
    campaign: "unassigned",
    expanded: true,
  };
}

interface AddQuestlineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddQuestlineModal({ open, onOpenChange }: AddQuestlineModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Questline-level state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("⚔️");
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Stages state
  const [stages, setStages] = useState<Stage[]>([createEmptyStage()]);

  // Scroll focused input into view above keyboard on iOS
  const scrollInputIntoView = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300); // delay for keyboard animation
  }, []);

  const createQuestlineMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/questlines", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "⚔️ Questline Created!",
        description: `"${title}" has been forged with ${stages.length} stage${stages.length > 1 ? "s" : ""}.`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Questline",
        description: error.message || "Failed to create questline. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIcon("⚔️");
    setShowIconPicker(false);
    setStages([createEmptyStage()]);
  };

  const updateStage = (id: string, updates: Partial<Stage>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeStage = (id: string) => {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  const addStage = () => {
    // Collapse existing stages, add new expanded one
    setStages((prev) => [
      ...prev.map((s) => ({ ...s, expanded: false })),
      createEmptyStage(),
    ]);
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;
    const updated = [...stages];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setStages(updated);
  };

  // Calculate totals
  const totalGold = stages.reduce((sum, s) => {
    const dur = parseInt(s.duration) || 30;
    return sum + calculateGoldValue(s.importance, dur);
  }, 0);
  const bonusGold = totalGold * 3;

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a questline title.",
        variant: "destructive",
      });
      return;
    }

    // Validate stages
    for (let i = 0; i < stages.length; i++) {
      if (!stages[i].title.trim()) {
        toast({
          title: `Stage ${i + 1} Missing Title`,
          description: "Every stage needs a title.",
          variant: "destructive",
        });
        return;
      }
    }

    const data = {
      title: title.trim(),
      description: description.trim(),
      icon,
      stages: stages.map((s) => ({
        title: s.title.trim(),
        description: s.description.trim(),
        duration: parseInt(s.duration) || 30,
        goldValue: calculateGoldValue(s.importance, parseInt(s.duration) || 30),
        importance: s.importance,
        businessWorkFilter: s.businessWorkFilter,
        campaign: s.campaign,
      })),
    };

    createQuestlineMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 border-2 border-purple-500/40 text-yellow-100 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-serif text-purple-200 flex items-center gap-2">
            <span>⚔️</span> Create New Questline
          </DialogTitle>
          <p className="text-sm text-purple-300/60 mt-1">
            A questline is a chain of stages (quests) that earn a 3× bonus when all completed.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-6 py-4 pb-[40vh]">
          {/* Icon + Title row */}
          <div className="flex gap-3 items-start">
            {/* Icon picker */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-12 h-12 rounded-lg bg-slate-800/80 border border-purple-500/40 flex items-center justify-center text-2xl hover:border-purple-400/60 transition-colors"
              >
                {icon}
              </button>
              {showIconPicker && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowIconPicker(false)} />
                  <div className="absolute left-0 top-full mt-1 z-[70] bg-slate-800 border border-purple-500/40 rounded-lg p-2 grid grid-cols-5 gap-1 shadow-xl">
                    {QUESTLINE_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setIcon(emoji);
                          setShowIconPicker(false);
                        }}
                        className={`w-9 h-9 rounded flex items-center justify-center text-lg hover:bg-purple-600/30 transition-colors ${
                          icon === emoji ? "bg-purple-600/40 ring-1 ring-purple-400" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="ql-title" className="text-purple-200">
                Questline Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="ql-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={scrollInputIntoView}
                placeholder="e.g. Launch the New Product..."
                className="bg-slate-800/50 border-purple-500/30 text-yellow-100 placeholder:text-purple-300/40"
                maxLength={200}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ql-desc" className="text-purple-200">
              Description
            </Label>
            <Textarea
              id="ql-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={scrollInputIntoView}
              placeholder="What is this questline about? (optional)"
              className="bg-slate-800/50 border-purple-500/30 text-yellow-100 placeholder:text-purple-300/40 min-h-[60px]"
              maxLength={500}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-purple-500/20 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-serif text-purple-200">
                Stages ({stages.length})
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addStage}
                className="border-purple-500/40 text-purple-200 hover:bg-purple-600/20 hover:text-purple-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Stage
              </Button>
            </div>

            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="border border-purple-500/30 rounded-lg bg-slate-800/40 overflow-hidden"
                >
                  {/* Stage header — always visible */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-purple-600/10 transition-colors"
                    onClick={() => updateStage(stage.id, { expanded: !stage.expanded })}
                  >
                    <GripVertical className="w-4 h-4 text-purple-400/40 shrink-0" />
                    <span className="text-sm font-medium text-purple-300/70 shrink-0 w-8">
                      #{index + 1}
                    </span>
                    <span className="flex-1 text-sm text-yellow-100 truncate">
                      {stage.title || <span className="text-purple-400/40 italic">Untitled stage</span>}
                    </span>
                    <span className="text-xs text-yellow-400/60 shrink-0">
                      🪙 {calculateGoldValue(stage.importance, parseInt(stage.duration) || 30)}
                    </span>

                    {/* Reorder buttons */}
                    <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveStage(index, "up")}
                        className="p-1 text-purple-400/60 hover:text-purple-300 disabled:opacity-30"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === stages.length - 1}
                        onClick={() => moveStage(index, "down")}
                        className="p-1 text-purple-400/60 hover:text-purple-300 disabled:opacity-30"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {stages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStage(stage.id);
                        }}
                        className="p-1 text-red-400/50 hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {stage.expanded ? (
                      <ChevronUp className="w-4 h-4 text-purple-400/50 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-400/50 shrink-0" />
                    )}
                  </div>

                  {/* Stage body — collapsible */}
                  {stage.expanded && (
                    <div className="px-3 pb-3 pt-1 space-y-3 border-t border-purple-500/20">
                      {/* Title */}
                      <div className="space-y-1">
                        <Label className="text-purple-200 text-xs">
                          Stage Title <span className="text-red-400">*</span>
                        </Label>
                        <Input
                          value={stage.title}
                          onChange={(e) => updateStage(stage.id, { title: e.target.value })}
                          onFocus={scrollInputIntoView}
                          placeholder={`Stage ${index + 1} title...`}
                          className="bg-slate-800/50 border-purple-500/30 text-yellow-100 placeholder:text-purple-300/40 h-9 text-sm"
                          maxLength={200}
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <Label className="text-purple-200 text-xs">Description</Label>
                        <Input
                          value={stage.description}
                          onChange={(e) => updateStage(stage.id, { description: e.target.value })}
                          onFocus={scrollInputIntoView}
                          placeholder="Brief description..."
                          className="bg-slate-800/50 border-purple-500/30 text-yellow-100 placeholder:text-purple-300/40 h-9 text-sm"
                          maxLength={500}
                        />
                      </div>

                      {/* Duration + Importance row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-purple-200 text-xs">Duration (min)</Label>
                          <Input
                            type="number"
                            value={stage.duration}
                            onChange={(e) => updateStage(stage.id, { duration: e.target.value })}
                            onFocus={scrollInputIntoView}
                            min="1"
                            className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-purple-200 text-xs">Importance</Label>
                          <Select value={stage.importance} onValueChange={(v) => updateStage(stage.id, { importance: v })}>
                            <SelectTrigger className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-purple-500/40">
                              <SelectItem value="Pareto">🔥 Pareto</SelectItem>
                              <SelectItem value="High">🚨 High</SelectItem>
                              <SelectItem value="Med-High">⚠️ Med-High</SelectItem>
                              <SelectItem value="Medium">📋 Medium</SelectItem>
                              <SelectItem value="Med-Low">📝 Med-Low</SelectItem>
                              <SelectItem value="Low">📄 Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Work Filter + Campaign row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-purple-200 text-xs">Work Filter</Label>
                          <Select value={stage.businessWorkFilter} onValueChange={(v) => updateStage(stage.id, { businessWorkFilter: v })}>
                            <SelectTrigger className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-purple-500/40">
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="Apple">Apple</SelectItem>
                              <SelectItem value="MW">MW</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-purple-200 text-xs">Campaign</Label>
                          <Select value={stage.campaign} onValueChange={(v) => updateStage(stage.id, { campaign: v })}>
                            <SelectTrigger className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-purple-500/40">
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              <SelectItem value="Main">Main</SelectItem>
                              <SelectItem value="Side">Side</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bonus Preview */}
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-200 mb-2">Completion Bonus Preview</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-purple-300/60">Total Stage Gold:</span>
                <span className="ml-2 text-yellow-300">🪙 {totalGold}</span>
              </div>
              <div>
                <span className="text-purple-300/60">3× Bonus:</span>
                <span className="ml-2 text-yellow-300 font-bold">🪙 {bonusGold}</span>
              </div>
            </div>
            <p className="text-xs text-purple-300/50 mt-2">
              Complete all {stages.length} stage{stages.length > 1 ? "s" : ""} to earn the 3× gold &amp; XP bonus!
            </p>
          </div>
        </div>
        </div>

        <DialogFooter className="gap-2 shrink-0 pt-3 border-t border-purple-500/20">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="border-purple-500/40 text-purple-200 hover:bg-slate-700/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createQuestlineMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold"
          >
            {createQuestlineMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Forging...
              </>
            ) : (
              <>⚔️ Create Questline</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
