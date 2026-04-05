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
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, CornerDownRight, ArrowLeft, ArrowRight } from "lucide-react";
import { calculateGoldValue } from "@/lib/goldCalculation";

const QUESTLINE_ICONS = [
  // Fantasy / RPG
  "⚔️", "🛡️", "🏰", "🐉", "🧙", "👑", "💎", "🔮", "🗡️", "🏹", "⚡", "🔥", "🌟", "📜", "🎯", "🚀", "💰", "🧪", "🎭", "🌙",
  // Household / Chores / Home
  "🏠", "🏡", "🧹", "🧺", "🧽", "🪣", "🧴", "🛁", "🚿", "🪥", "🪒", "🧻", "🗑️", "♻️",
  // Kitchen & Appliances
  "🍳", "🥘", "🍽️", "🧊", "🫙", "🍶", "☕", "🧑‍🍳", "🔪", "🥄",
  // Furniture & Rooms
  "🛋️", "🪑", "🛏️", "🪞", "🖼️", "🚪", "🪟", "💡", "🕯️", "🪴",
  // Outdoor / Yard / Garden
  "🌿", "🌻", "🌳", "🪻", "🪵", "🪨", "⛏️", "🧑‍🌾", "🌾", "🪴",
  // Tools & Maintenance
  "🔧", "🔨", "🪛", "🪚", "🧰", "🪜", "📐", "🪤", "🔩", "⚙️",
  // Vehicles & Errands
  "🚗", "🚙", "⛽", "🛒", "📦", "📬", "🏪", "🧾",
  // Cleaning & Laundry
  "👕", "👖", "🧤", "🧣", "👟", "🪮", "🧶", "🪡", "🧵",
  // Pets
  "🐶", "🐱", "🐾", "🦴", "🐟", "🐦",
  // Miscellaneous objects
  "🔑", "🔒", "📎", "✂️", "🖊️", "📋", "🗂️", "🗃️", "💻", "📱", "🖥️", "🎮", "📚", "🎒",
];
const MAX_DEPTH = 4;

interface Stage {
  id: string;
  title: string;
  description: string;
  duration: string;
  importance: string;
  businessWorkFilter: string;
  campaign: string;
  expanded: boolean;
  indentLevel: number; // 0 = top-level stage, 1-4 = nested depth
}

function createEmptyStage(indentLevel = 0): Stage {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    duration: "30",
    importance: "Medium",
    businessWorkFilter: "General",
    campaign: "unassigned",
    expanded: true,
    indentLevel,
  };
}

// Build a tree structure from the flat stages list for submission to backend
function buildTree(stages: Stage[]): any[] {
  const result: any[] = [];
  const stack: { node: any; level: number }[] = [];

  for (const stage of stages) {
    const node: any = {
      title: stage.title.trim(),
      description: stage.description.trim(),
      duration: parseInt(stage.duration) || 30,
      goldValue: calculateGoldValue(stage.importance, parseInt(stage.duration) || 30),
      importance: stage.importance,
      businessWorkFilter: stage.businessWorkFilter,
      campaign: stage.campaign,
      children: [],
    };

    // Pop items from stack that are at same or deeper level
    while (stack.length > 0 && stack[stack.length - 1].level >= stage.indentLevel) {
      stack.pop();
    }

    if (stack.length === 0) {
      result.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, level: stage.indentLevel });
  }

  return result;
}

// Depth label helpers
const getDepthLabel = (level: number) => {
  switch (level) {
    case 0: return "Stage";
    case 1: return "Quest";
    case 2: return "Sub-quest";
    case 3: return "Task";
    case 4: return "Sub-task";
    default: return "Item";
  }
};

const getDepthColor = (level: number) => {
  switch (level) {
    case 0: return "border-purple-500/40 bg-purple-900/15";
    case 1: return "border-blue-500/30 bg-blue-900/10";
    case 2: return "border-cyan-500/25 bg-cyan-900/8";
    case 3: return "border-teal-500/20 bg-teal-900/5";
    case 4: return "border-slate-500/20 bg-slate-800/5";
    default: return "border-slate-500/20";
  }
};

const getDepthBadge = (level: number) => {
  switch (level) {
    case 0: return "bg-purple-500/20 text-purple-300";
    case 1: return "bg-blue-500/20 text-blue-300";
    case 2: return "bg-cyan-500/20 text-cyan-300";
    case 3: return "bg-teal-500/20 text-teal-300";
    case 4: return "bg-slate-500/20 text-slate-300";
    default: return "bg-slate-500/20 text-slate-300";
  }
};

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

  // Stages state — flat list with indentLevel for tree structure
  const [stages, setStages] = useState<Stage[]>([createEmptyStage()]);

  // Scroll focused input into view above keyboard on iOS
  const scrollInputIntoView = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
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
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const removedLevel = prev[idx].indentLevel;
      // Remove this stage and all its descendants (deeper items immediately following)
      const toRemove = new Set<string>([id]);
      for (let i = idx + 1; i < prev.length; i++) {
        if (prev[i].indentLevel > removedLevel) {
          toRemove.add(prev[i].id);
        } else {
          break;
        }
      }
      const result = prev.filter((s) => !toRemove.has(s.id));
      return result.length === 0 ? [createEmptyStage()] : result;
    });
  };

  const addStageAfter = (id: string, asChild: boolean) => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const parentLevel = prev[idx].indentLevel;
      const newLevel = asChild ? Math.min(parentLevel + 1, MAX_DEPTH) : parentLevel;

      // Find insertion point
      let insertIdx = idx + 1;
      if (!asChild) {
        // Insert as sibling — after all descendants of current item
        for (let i = idx + 1; i < prev.length; i++) {
          if (prev[i].indentLevel > parentLevel) {
            insertIdx = i + 1;
          } else {
            break;
          }
        }
      }

      const newStage = createEmptyStage(newLevel);
      const updated = prev.map((s) => ({ ...s, expanded: false }));
      updated.splice(insertIdx, 0, newStage);
      return updated;
    });
  };

  const addTopLevelStage = () => {
    setStages((prev) => [
      ...prev.map((s) => ({ ...s, expanded: false })),
      createEmptyStage(0),
    ]);
  };

  // Indent a stage (make it a child of the previous item)
  const indentStage = (id: string) => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      const current = prev[idx];
      const prevItem = prev[idx - 1];
      if (current.indentLevel > prevItem.indentLevel) return prev;
      if (current.indentLevel >= MAX_DEPTH) return prev;

      const updated = [...prev];
      updated[idx] = { ...updated[idx], indentLevel: updated[idx].indentLevel + 1 };
      for (let i = idx + 1; i < updated.length; i++) {
        if (prev[i].indentLevel > current.indentLevel) {
          if (updated[i].indentLevel + 1 <= MAX_DEPTH) {
            updated[i] = { ...updated[i], indentLevel: updated[i].indentLevel + 1 };
          }
        } else {
          break;
        }
      }
      return updated;
    });
  };

  // Outdent a stage (move it up one level)
  const outdentStage = (id: string) => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const current = prev[idx];
      if (current.indentLevel <= 0) return prev;

      const updated = [...prev];
      updated[idx] = { ...updated[idx], indentLevel: updated[idx].indentLevel - 1 };
      for (let i = idx + 1; i < updated.length; i++) {
        if (prev[i].indentLevel > current.indentLevel) {
          updated[i] = { ...updated[i], indentLevel: updated[i].indentLevel - 1 };
        } else {
          break;
        }
      }
      return updated;
    });
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    setStages((prev) => {
      const current = prev[index];
      let endIdx = index + 1;
      while (endIdx < prev.length && prev[endIdx].indentLevel > current.indentLevel) {
        endIdx++;
      }
      const block = prev.slice(index, endIdx);

      if (direction === "up") {
        if (index === 0) return prev;
        let prevStart = index - 1;
        while (prevStart > 0 && prev[prevStart].indentLevel > current.indentLevel) {
          prevStart--;
        }
        if (prev[prevStart].indentLevel !== current.indentLevel) return prev;
        const updated = [...prev];
        updated.splice(index, block.length);
        updated.splice(prevStart, 0, ...block);
        return updated;
      } else {
        if (endIdx >= prev.length) return prev;
        const nextStart = endIdx;
        if (prev[nextStart].indentLevel !== current.indentLevel) return prev;
        let nextEnd = nextStart + 1;
        while (nextEnd < prev.length && prev[nextEnd].indentLevel > current.indentLevel) {
          nextEnd++;
        }
        const updated = [...prev];
        const nextBlock = updated.splice(nextStart, nextEnd - nextStart);
        updated.splice(index, 0, ...nextBlock);
        return updated;
      }
    });
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

    for (let i = 0; i < stages.length; i++) {
      if (!stages[i].title.trim()) {
        const label = getDepthLabel(stages[i].indentLevel);
        toast({
          title: `${label} Missing Title`,
          description: `Item ${i + 1} needs a title.`,
          variant: "destructive",
        });
        return;
      }
    }

    const tree = buildTree(stages);
    const data = {
      title: title.trim(),
      description: description.trim(),
      icon,
      stages: tree,
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
            Build a quest chain with nested stages, quests, and subtasks (up to 4 levels deep).
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
                  <div className="absolute left-0 top-full mt-1 z-[70] bg-slate-800 border border-purple-500/40 rounded-lg p-2 grid grid-cols-8 gap-1 shadow-xl max-h-60 overflow-y-auto w-[280px]">
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
                Stages & Quests ({stages.length} item{stages.length !== 1 ? "s" : ""})
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addTopLevelStage}
                className="border-purple-500/40 text-purple-200 hover:bg-purple-600/20 hover:text-purple-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Stage
              </Button>
            </div>

            {/* Depth legend */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[0, 1, 2, 3, 4].map((level) => (
                <span key={level} className={`text-[10px] px-2 py-0.5 rounded-full ${getDepthBadge(level)}`}>
                  L{level}: {getDepthLabel(level)}
                </span>
              ))}
            </div>

            <div className="space-y-2">
              {stages.map((stage, index) => {
                // Count same-level sibling number under same parent
                let siblingNum = 0;
                for (let i = 0; i <= index; i++) {
                  if (stages[i].indentLevel < stage.indentLevel) {
                    siblingNum = 0;
                  }
                  if (stages[i].indentLevel === stage.indentLevel && i <= index) {
                    siblingNum++;
                  }
                }

                return (
                  <div
                    key={stage.id}
                    className={`rounded-lg overflow-hidden border ${getDepthColor(stage.indentLevel)} transition-all`}
                    style={{ marginLeft: `${stage.indentLevel * 20}px` }}
                  >
                    {/* Stage header — always visible */}
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer hover:bg-purple-600/10 transition-colors"
                      onClick={() => updateStage(stage.id, { expanded: !stage.expanded })}
                    >
                      {/* Indent connector icon */}
                      {stage.indentLevel > 0 && (
                        <CornerDownRight className="w-3 h-3 text-purple-400/30 shrink-0" />
                      )}

                      {/* Depth badge */}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${getDepthBadge(stage.indentLevel)}`}>
                        {getDepthLabel(stage.indentLevel).charAt(0)}{siblingNum}
                      </span>

                      <span className="flex-1 text-sm text-yellow-100 truncate">
                        {stage.title || <span className="text-purple-400/40 italic">Untitled {getDepthLabel(stage.indentLevel).toLowerCase()}</span>}
                      </span>

                      <span className="text-xs text-yellow-400/60 shrink-0">
                        🪙 {calculateGoldValue(stage.importance, parseInt(stage.duration) || 30)}
                      </span>

                      {/* Indent / Outdent */}
                      <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={stage.indentLevel <= 0}
                          onClick={() => outdentStage(stage.id)}
                          className="p-1 text-purple-400/60 hover:text-purple-300 disabled:opacity-20"
                          title="Outdent (decrease level)"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={stage.indentLevel >= MAX_DEPTH || index === 0}
                          onClick={() => indentStage(stage.id)}
                          className="p-1 text-purple-400/60 hover:text-purple-300 disabled:opacity-20"
                          title="Indent (increase level)"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Move up/down */}
                      <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button type="button" disabled={index === 0} onClick={() => moveStage(index, "up")}
                          className="p-1 text-purple-400/60 hover:text-purple-300 disabled:opacity-20">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" disabled={index === stages.length - 1} onClick={() => moveStage(index, "down")}
                          className="p-1 text-purple-400/60 hover:text-purple-300 disabled:opacity-20">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeStage(stage.id); }}
                        className="p-1 text-red-400/40 hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {stage.expanded ? (
                        <ChevronUp className="w-4 h-4 text-purple-400/50 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-purple-400/50 shrink-0" />
                      )}
                    </div>

                    {/* Stage body — collapsible */}
                    {stage.expanded && (
                      <div className="px-3 pb-3 pt-1 space-y-3 border-t border-purple-500/15">
                        {/* Title */}
                        <div className="space-y-1">
                          <Label className="text-purple-200 text-xs">
                            {getDepthLabel(stage.indentLevel)} Title <span className="text-red-400">*</span>
                          </Label>
                          <Input
                            value={stage.title}
                            onChange={(e) => updateStage(stage.id, { title: e.target.value })}
                            onFocus={scrollInputIntoView}
                            placeholder={`${getDepthLabel(stage.indentLevel)} title...`}
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
                              <SelectItem value="Pareto">� Pareto</SelectItem>
                              <SelectItem value="High">� High</SelectItem>
                              <SelectItem value="Med-High">🟠 Med-High</SelectItem>
                              <SelectItem value="Medium">� Medium</SelectItem>
                              <SelectItem value="Med-Low">� Med-Low</SelectItem>
                              <SelectItem value="Low">� Low</SelectItem>
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

                        {/* Add child / sibling buttons */}
                        <div className="flex gap-2 pt-1">
                          {stage.indentLevel < MAX_DEPTH && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); addStageAfter(stage.id, true); }}
                              className="h-7 text-xs text-blue-300/70 hover:text-blue-200 hover:bg-blue-600/15"
                            >
                              <CornerDownRight className="w-3 h-3 mr-1" />
                              Add {getDepthLabel(stage.indentLevel + 1)}
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); addStageAfter(stage.id, false); }}
                            className="h-7 text-xs text-purple-300/70 hover:text-purple-200 hover:bg-purple-600/15"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add {getDepthLabel(stage.indentLevel)}
                          </Button>
                        </div>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bonus Preview */}
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-200 mb-2">Completion Bonus Preview</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-purple-300/60">Total Gold ({stages.length} items):</span>
                <span className="ml-2 text-yellow-300">🪙 {totalGold}</span>
              </div>
              <div>
                <span className="text-purple-300/60">3× Bonus:</span>
                <span className="ml-2 text-yellow-300 font-bold">🪙 {bonusGold}</span>
              </div>
            </div>
            <p className="text-xs text-purple-300/50 mt-2">
              Complete all {stages.length} item{stages.length > 1 ? "s" : ""} to earn the 3× gold &amp; XP bonus!
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
