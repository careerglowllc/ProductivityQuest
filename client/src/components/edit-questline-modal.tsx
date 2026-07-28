import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, CornerDownRight, ArrowLeft, ArrowRight, CheckCircle2, Circle, X, GripVertical, MoreVertical, HelpCircle, Edit2, Check } from "lucide-react";
import { calculateGoldValue } from "@/lib/goldCalculation";

const QUESTLINE_ICONS = [
  // Fantasy / RPG
  "⚔️", "🛡️", "🏰", "🐉", "🧙", "👑", "💎", "🔮", "🗡️", "🏹", "⚡", "🔥", "🌟", "📜", "🎯", "🚀", "💰", "🧪", "🎭", "🌙",
  // Household / Chores / Home
  "🏠", "🏡", "🧹", "🧺", "🧽", "🪣", "🧴", "🛁", "🚿", "🪥", "🪒", "🧻", "🗑️", "♻️", "🧼", "🫧",
  // Kitchen & Appliances
  "🍳", "🥘", "🍽️", "🧊", "🫙", "🍶", "☕", "🧑‍🍳", "🔪", "🥄",
  // Furniture & Rooms
  "🛋️", "🪑", "🛏️", "🪞", "🖼️", "🚪", "🪟", "💡", "🕯️", "🪴",
  // Outdoor / Lawn / Garden / Water
  "🌿", "�", "�🌻", "🌳", "🌲", "🌴", "🌵", "🎋", "🪻", "🪵", "🪨", "🌾", "🍂", "🍁", "🍄", "🧑‍🌾", "⛏️",
  "💧", "�", "⛲", "🚰", "🌧️", "☀️", "🌤️", "❄️", "🌬️", "🏊",
  // Fruits & Vegetables
  "🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🍒", "🥭", "🍍", "🥝", "🍌", "🍐", "🍈", "🫐", "🍅", "🥑", "🍆", "🥦", "🥕", "🌽",
  // Insects / Bugs / Critters
  "🦟", "🐝", "🦋", "🐛", "🐞", "🐜", "🪲", "🦗", "🕷️", "🪳", "🦂", "🐌", "🪰",
  // Handyman / House Parts / Structure
  "🏗️", "🧱", "🛖", "⛩️", "🚧", "🔌", "🪠", "🔶", "🪝", "🧲", "📏", "🎨", "🖌️", "🛠️",
  // Tools & Maintenance
  "🔧", "🔨", "🪛", "🪚", "🧰", "🪜", "📐", "🔩", "⚙️", "🪤",
  // Vehicles & Errands
  "🚗", "🚙", "⛽", "🛒", "📦", "📬", "🏪", "🧾",
  // Clothing & Laundry
  "👕", "👖", "🧤", "🧣", "👟", "🧶", "🧵", "�", "👔", "�", "🪮",
  // Pets
  "🐶", "🐱", "🐾", "🦴", "🐟", "🐦",
  // Tech & Office
  "🔑", "🔒", "📎", "✂️", "🖊️", "📋", "🗂️", "🗃️", "💻", "📱", "🖥️", "🎮", "📚", "🎒", "📺", "📻",
  // Country Flags
  "🇺🇸", "🇨🇦", "🇲🇽", "🇧🇷", "🇦🇷", "🇨🇱", "🇨🇴", "🇵🇪", "🇨🇷", "🇵🇦", "🇨🇺", "🇯🇲",
  "🇬🇧", "🇫🇷", "🇩🇪", "🇮🇹", "🇪🇸", "🇵🇹", "🇳🇱", "🇧🇪", "🇨🇭", "🇦🇹", "🇸🇪", "🇳🇴",
  "🇩🇰", "🇫🇮", "🇮🇸", "🇮🇪", "🇬🇷", "🇵🇱", "🇨🇿", "🇭🇺", "🇷🇴", "🇭🇷", "🇺🇦", "🇷🇺",
  "🇯🇵", "🇨🇳", "🇰🇷", "🇮🇳", "🇹🇭", "🇻🇳", "🇮🇩", "🇲🇾", "🇸🇬", "🇵🇭", "🇹🇼", "🇭🇰",
  "🇸🇦", "🇦🇪", "🇮🇱", "🇯🇴", "🇹🇷", "🇮🇷", "🇵🇰", "🇳🇵", "🇧🇩", "🇱🇰",
  "🇪🇬", "🇿🇦", "🇳🇬", "🇰🇪", "🇲🇦", "🇹🇿", "🇪🇹", "🇬🇭", "🇷🇼",
  "🇦🇺", "🇳🇿", "🇫🇯", "🇵🇫",
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
  indentLevel: number;
  /** If set, this new item will be nested under an existing task with this ID */
  existingParentId?: number | null;
  dueDate: string;
  emoji: string;
}

function createEmptyStage(indentLevel = 0, existingParentId: number | null = null): Stage {
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
    existingParentId,
    dueDate: "",
    emoji: "",
  };
}

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
      dueDate: stage.dueDate || null,
      emoji: stage.emoji || null,
      children: [],
    };

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

interface QuestlineTask {
  id: number;
  title: string;
  completed: boolean;
  recycled?: boolean | null;
  goldValue: number;
  indentLevel?: number | null;
  parentTaskId?: number | null;
  questlineOrder?: number | null;
  emoji?: string | null;
}

interface EditQuestlineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questline: {
    id: number;
    title: string;
    description: string | null;
    icon: string | null;
    tasks: QuestlineTask[];
  } | null;
}

export function EditQuestlineModal({ open, onOpenChange, questline }: EditQuestlineModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("⚔️");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showHierarchyHelp, setShowHierarchyHelp] = useState(false);
  const [newStages, setNewStages] = useState<Stage[]>([]);
  // Local flat list of existing tasks for drag-and-drop reordering
  const [orderedTasks, setOrderedTasks] = useState<QuestlineTask[]>([]);
  const dragId = useRef<number | null>(null);
  const dragOverId = useRef<number | null>(null);

  // Pre-fill when questline changes
  useEffect(() => {
    if (questline && open) {
      setTitle(questline.title);
      setDescription(questline.description || "");
      setIcon(questline.icon || "⚔️");
      setNewStages([]);
      setOrderedTasks([...questline.tasks].sort((a, b) => (a.questlineOrder ?? 0) - (b.questlineOrder ?? 0)));
    }
  }, [questline, open]);

  const scrollInputIntoView = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, []);

  const reorderMutation = useMutation({
    mutationFn: async (order: Array<{ id: number; parentTaskId: number | null; questlineOrder: number; indentLevel: number }>) =>
      apiRequest("POST", `/api/questlines/${questline!.id}/reorder`, { order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "✅ Order saved!", description: "Quest positions updated." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to reorder.", variant: "destructive" }),
  });

  // Recalculate indentLevels from parentTaskId after a reorder
  const rebuildIndentLevels = useCallback((tasks: QuestlineTask[]): QuestlineTask[] => {
    const idToTask = new Map(tasks.map((t) => [t.id, { ...t }]));
    const getDepth = (id: number, visited = new Set<number>()): number => {
      if (visited.has(id)) return 0;
      visited.add(id);
      const t = idToTask.get(id);
      if (!t || !t.parentTaskId) return 0;
      return 1 + getDepth(t.parentTaskId, visited);
    };
    return tasks.map((t) => ({ ...t, indentLevel: getDepth(t.id) }));
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: number) => {
    dragId.current = taskId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, taskId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverId.current = taskId;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropOnId: number) => {
    e.preventDefault();
    const fromId = dragId.current;
    if (!fromId || fromId === dropOnId) return;

    setOrderedTasks((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === fromId);
      const toIdx = prev.findIndex((t) => t.id === dropOnId);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);

      // Reassign questlineOrder
      const reindexed = updated.map((t, i) => ({ ...t, questlineOrder: i }));

      // Rebuild parentTaskId: the parent is the nearest preceding item with indentLevel = this item's indentLevel - 1
      const rebuiltParents = reindexed.map((t, i) => {
        const myLevel = t.indentLevel ?? 0;
        if (myLevel === 0) return { ...t, parentTaskId: null };
        for (let j = i - 1; j >= 0; j--) {
          if ((reindexed[j].indentLevel ?? 0) < myLevel) {
            return { ...t, parentTaskId: reindexed[j].id };
          }
        }
        return { ...t, parentTaskId: null };
      });

      // Persist
      reorderMutation.mutate(rebuiltParents.map((t) => ({
        id: t.id,
        parentTaskId: t.parentTaskId ?? null,
        questlineOrder: t.questlineOrder ?? 0,
        indentLevel: t.indentLevel ?? 0,
      })));

      return rebuiltParents;
    });

    dragId.current = null;
    dragOverId.current = null;
  }, [reorderMutation]);

  // Allow changing indent level (parent reassignment) via left/right arrows on existing tasks
  const changeExistingIndent = useCallback((taskId: number, direction: "in" | "out") => {
    setOrderedTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === taskId);
      if (idx === -1) return prev;
      const cur = prev[idx];
      const curLevel = cur.indentLevel ?? 0;
      const newLevel = direction === "in" ? Math.min(curLevel + 1, MAX_DEPTH) : Math.max(curLevel - 1, 0);
      if (newLevel === curLevel) return prev;

      const updated = [...prev];
      updated[idx] = { ...cur, indentLevel: newLevel };

      // Update parent
      const parentUpdated = updated.map((t, i) => {
        const myLevel = t.indentLevel ?? 0;
        if (myLevel === 0) return { ...t, parentTaskId: null };
        for (let j = i - 1; j >= 0; j--) {
          if ((updated[j].indentLevel ?? 0) < myLevel) {
            return { ...t, parentTaskId: updated[j].id };
          }
        }
        return { ...t, parentTaskId: null };
      });

      reorderMutation.mutate(parentUpdated.map((t, i) => ({
        id: t.id,
        parentTaskId: t.parentTaskId ?? null,
        questlineOrder: i,
        indentLevel: t.indentLevel ?? 0,
      })));

      return parentUpdated;
    });
  }, [reorderMutation]);

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: (_data, taskId) => {
      setOrderedTasks(prev => prev.filter(t => t.id !== taskId));
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "🗑️ Quest removed", description: "Moved to recycling bin." });
    },
    onError: () => {
      toast({ title: "Failed to remove quest", variant: "destructive" });
    },
  });

  // Inline edit state for existing tasks
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{
    title: string; description: string; dueDate: string;
    duration: string; importance: string; emoji: string;
  } | null>(null);

  const openInlineEdit = (task: any) => {
    setEditingTaskId(task.id);
    setInlineEdit({
      title: task.title || "",
      description: task.description || "",
      dueDate: task.dueDate ? (task.dueDate.split("T")[0] ?? "") : "",
      duration: String(task.duration || 30),
      importance: task.importance || "Medium",
      emoji: task.emoji || "",
    });
  };

  const patchTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setOrderedTasks(prev => prev.map(t => t.id === id ? { ...t, ...inlineEdit, dueDate: inlineEdit?.dueDate ? `${inlineEdit.dueDate}T00:00:00.000Z` : null, duration: parseInt(inlineEdit?.duration || "30"), goldValue: calculateGoldValue(inlineEdit?.importance || "Medium", parseInt(inlineEdit?.duration || "30")) } : t));
      setEditingTaskId(null);
      setInlineEdit(null);
      toast({ title: "✅ Saved", description: "Quest updated." });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const saveInlineEdit = (taskId: number) => {
    if (!inlineEdit) return;
    patchTaskMutation.mutate({
      id: taskId,
      data: {
        title: inlineEdit.title.trim(),
        description: inlineEdit.description,
        dueDate: inlineEdit.dueDate ? new Date(inlineEdit.dueDate + "T12:00:00").toISOString() : null,
        duration: parseInt(inlineEdit.duration) || 30,
        importance: inlineEdit.importance,
        emoji: inlineEdit.emoji || null,
        goldValue: calculateGoldValue(inlineEdit.importance, parseInt(inlineEdit.duration) || 30),
      },
    });
  };

  const saveQuestlineMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/questlines/${questline!.id}/add-stages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const addedCount = newStages.length;
      toast({
        title: "✅ Questline Updated!",
        description: addedCount > 0
          ? `Saved changes and added ${addedCount} new item${addedCount > 1 ? "s" : ""}.`
          : "Questline details saved.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Questline",
        description: error.message || "Failed to save. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStage = (id: string, updates: Partial<Stage>) => {
    setNewStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeStage = (id: string) => {
    setNewStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const removedLevel = prev[idx].indentLevel;
      const toRemove = new Set<string>([id]);
      for (let i = idx + 1; i < prev.length; i++) {
        if (prev[i].indentLevel > removedLevel) toRemove.add(prev[i].id);
        else break;
      }
      return prev.filter((s) => !toRemove.has(s.id));
    });
  };

  const addStageAfter = (id: string, asChild: boolean) => {
    setNewStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const parentLevel = prev[idx].indentLevel;
      const newLevel = asChild ? Math.min(parentLevel + 1, MAX_DEPTH) : parentLevel;
      let insertIdx = idx + 1;
      if (!asChild) {
        for (let i = idx + 1; i < prev.length; i++) {
          if (prev[i].indentLevel > parentLevel) insertIdx = i + 1;
          else break;
        }
      }
      const newStage = createEmptyStage(newLevel);
      const updated = prev.map((s) => ({ ...s, expanded: false }));
      updated.splice(insertIdx, 0, newStage);
      return updated;
    });
  };

  const addTopLevelStage = () => {
    setNewStages((prev) => [
      ...prev.map((s) => ({ ...s, expanded: false })),
      createEmptyStage(0, null),
    ]);
  };

  const addChildUnderExisting = (existingTask: QuestlineTask) => {
    setNewStages((prev) => [
      ...prev,
      createEmptyStage(0, existingTask.id),
    ]);
  };

  const indentStage = (id: string) => {
    setNewStages((prev) => {
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
          if (updated[i].indentLevel + 1 <= MAX_DEPTH)
            updated[i] = { ...updated[i], indentLevel: updated[i].indentLevel + 1 };
        } else break;
      }
      return updated;
    });
  };

  const outdentStage = (id: string) => {
    setNewStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const current = prev[idx];
      if (current.indentLevel <= 0) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], indentLevel: updated[idx].indentLevel - 1 };
      for (let i = idx + 1; i < updated.length; i++) {
        if (prev[i].indentLevel > current.indentLevel)
          updated[i] = { ...updated[i], indentLevel: updated[i].indentLevel - 1 };
        else break;
      }
      return updated;
    });
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    setNewStages((prev) => {
      const current = prev[index];
      let endIdx = index + 1;
      while (endIdx < prev.length && prev[endIdx].indentLevel > current.indentLevel) endIdx++;
      const block = prev.slice(index, endIdx);
      if (direction === "up") {
        if (index === 0) return prev;
        let prevStart = index - 1;
        while (prevStart > 0 && prev[prevStart].indentLevel > current.indentLevel) prevStart--;
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
        while (nextEnd < prev.length && prev[nextEnd].indentLevel > current.indentLevel) nextEnd++;
        const updated = [...prev];
        const nextBlock = updated.splice(nextStart, nextEnd - nextStart);
        updated.splice(index, 0, ...nextBlock);
        return updated;
      }
    });
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: "Title Required", description: "Please enter a questline title.", variant: "destructive" });
      return;
    }
    for (let i = 0; i < newStages.length; i++) {
      if (!newStages[i].title.trim()) {
        const label = getDepthLabel(newStages[i].indentLevel);
        toast({ title: `${label} Missing Title`, description: `New item ${i + 1} needs a title.`, variant: "destructive" });
        return;
      }
      if (!newStages[i].dueDate) {
        const label = getDepthLabel(newStages[i].indentLevel);
        toast({ title: `${label} Missing Due Date`, description: `"${newStages[i].title.trim() || `Item ${i + 1}`}" needs a due date.`, variant: "destructive" });
        return;
      }
    }

    // Group stages by existingParentId, build trees per group
    const groups = new Map<number | null, Stage[]>();
    for (const s of newStages) {
      const key = s.existingParentId ?? null;
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }

    const stages: any[] = [];
    groups.forEach((items, parentId) => {
      const trees = buildTree(items);
      if (parentId === null) {
        stages.push(...trees);
      } else {
        stages.push(...trees.map((t) => ({ ...t, existingParentId: parentId })));
      }
    });

    saveQuestlineMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      icon,
      stages,
    });
  };

  if (!questline) return null;

  const existingTasks = orderedTasks;
  // Compute gold for new top-level stages only (for the summary)
  const topLevelNew = newStages.filter((s) => !s.existingParentId);
  const existingChildNew = newStages.filter((s) => s.existingParentId != null);
  const newGold = newStages.reduce((sum, s) => sum + calculateGoldValue(s.importance, parseInt(s.duration) || 30), 0);

  // Group pending-new items by existingParentId
  const pendingByParent = new Map<number, Stage[]>();
  for (const s of existingChildNew) {
    if (s.existingParentId != null) {
      const arr = pendingByParent.get(s.existingParentId) ?? [];
      arr.push(s);
      pendingByParent.set(s.existingParentId, arr);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 border-2 border-purple-500/40 text-yellow-100 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-serif text-purple-200 flex items-center gap-2">
            <span>✏️</span> Edit Questline
            <button
              type="button"
              onClick={() => setShowHierarchyHelp(true)}
              className="ml-1 p-1 rounded-full text-purple-400/60 hover:text-purple-300 hover:bg-purple-600/20 transition-colors"
              title="How does the hierarchy work?"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </DialogTitle>
          <p className="text-sm text-purple-300/60 mt-1">
            Update the questline details and add new stages or quests.
          </p>
        </DialogHeader>

        {/* Hierarchy Help Modal */}
        {showHierarchyHelp && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 border-2 border-purple-500/40 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
              <button
                onClick={() => setShowHierarchyHelp(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-serif font-bold text-purple-200 mb-1">⚔️ Quest Hierarchy</h2>
              <p className="text-sm text-purple-300/60 mb-5">How items nest inside a questline</p>

              {/* Visual diagram */}
              <div className="space-y-1.5">
                {/* L0 Stage */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-purple-400 shrink-0" />
                    <div className="w-0.5 flex-1 bg-purple-500/30 mt-1" style={{ minHeight: 40 }} />
                  </div>
                  <div className="pb-2 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">L0 · STAGE</span>
                      <span className="text-xs text-slate-400">Top-level milestone or phase</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Groups related quests. Think of it as a chapter — e.g. <span className="text-purple-300/80 italic">"House Cleanup"</span> or <span className="text-purple-300/80 italic">"Launch Marketing"</span>.</p>
                  </div>
                </div>

                {/* L1 Quest */}
                <div className="flex items-start gap-3 pl-5">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-blue-400 shrink-0" />
                    <div className="w-0.5 flex-1 bg-blue-500/30 mt-1" style={{ minHeight: 40 }} />
                  </div>
                  <div className="pb-2 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">L1 · QUEST</span>
                      <span className="text-xs text-slate-400">A concrete goal within a Stage</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">A meaningful unit of work with its own gold reward — e.g. <span className="text-blue-300/80 italic">"Clear out front lawn"</span>.</p>
                  </div>
                </div>

                {/* L2 Sub-quest */}
                <div className="flex items-start gap-3 pl-10">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 shrink-0" />
                    <div className="w-0.5 flex-1 bg-cyan-500/30 mt-1" style={{ minHeight: 40 }} />
                  </div>
                  <div className="pb-2 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">L2 · SUB-QUEST</span>
                      <span className="text-xs text-slate-400">Breaks a Quest into parts</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Optional sub-division — e.g. <span className="text-cyan-300/80 italic">"Move furniture"</span> under a larger quest.</p>
                  </div>
                </div>

                {/* L3 Task */}
                <div className="flex items-start gap-3 pl-[60px]">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-teal-400 shrink-0" />
                    <div className="w-0.5 flex-1 bg-teal-500/30 mt-1" style={{ minHeight: 36 }} />
                  </div>
                  <div className="pb-2 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">L3 · TASK</span>
                      <span className="text-xs text-slate-400">A single actionable step</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Small, completable unit — e.g. <span className="text-teal-300/80 italic">"Bag up junk items"</span>.</p>
                  </div>
                </div>

                {/* L4 Sub-task */}
                <div className="flex items-start gap-3 pl-[76px]">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-slate-400 shrink-0" />
                  </div>
                  <div className="pb-1 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300">L4 · SUB-TASK</span>
                      <span className="text-xs text-slate-400">Deepest level detail</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Ultra-granular step if needed — e.g. <span className="text-slate-300/80 italic">"Label each bag"</span>.</p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-5 bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-purple-300 uppercase tracking-wide mb-2">💡 Tips</p>
                <p className="text-[11px] text-slate-400">• Use <span className="text-purple-300">← →</span> arrows to indent/outdent items and change their level.</p>
                <p className="text-[11px] text-slate-400">• Use <span className="text-purple-300">↑ ↓</span> arrows to reorder items at the same level.</p>
                <p className="text-[11px] text-slate-400">• Complete all items to earn the <span className="text-yellow-400">3× gold bonus</span>.</p>
                <p className="text-[11px] text-slate-400">• You don't need all 5 levels — most questlines only need L0 + L1.</p>
              </div>

              <button
                onClick={() => setShowHierarchyHelp(false)}
                className="mt-4 w-full py-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-sm font-semibold transition-colors"
              >
                Got it ✓
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="space-y-6 py-4 pb-[40vh]">
            {/* Icon + Title row */}
            <div className="flex gap-3 items-start">
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
                          onClick={() => { setIcon(emoji); setShowIconPicker(false); }}
                          className={`w-9 h-9 rounded flex items-center justify-center text-lg hover:bg-purple-600/30 transition-colors ${icon === emoji ? "bg-purple-600/40 ring-1 ring-purple-400" : ""}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="edit-ql-title" className="text-purple-200">
                  Questline Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="edit-ql-title"
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
              <Label htmlFor="edit-ql-desc" className="text-purple-200">Description</Label>
              <Textarea
                id="edit-ql-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={scrollInputIntoView}
                placeholder="What is this questline about? (optional)"
                className="bg-slate-800/50 border-purple-500/30 text-yellow-100 placeholder:text-purple-300/40 min-h-[60px]"
                maxLength={500}
              />
            </div>

            {/* Existing tasks — interactive + draggable */}
            {existingTasks.length > 0 && (
              <div className="border-t border-purple-500/20 pt-4">
                <h3 className="text-base font-serif text-purple-200 mb-2 flex items-center gap-2">
                  📋 Current Structure
                  <span className="text-sm text-purple-400/50 font-normal">({existingTasks.length} items)</span>
                  {reorderMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
                </h3>
                <p className="text-[11px] text-purple-300/50 mb-3 flex flex-wrap gap-2">
                  <span>
                    <span className="text-blue-300/70 font-medium">⠿ Drag</span> rows to reorder.
                  </span>
                  <span>
                    <span className="text-cyan-300/70 font-medium">← →</span> to change nesting level.
                  </span>
                  <span>
                    <span className="text-blue-300/70 font-medium">+ Quest</span> to add children.
                  </span>
                </p>
                <div className="space-y-0.5">
                  {existingTasks.map((task) => {
                    const indent = task.indentLevel || 0;
                    const done = task.completed || task.recycled;
                    const childLabel = getDepthLabel(indent + 1);
                    const pending = pendingByParent.get(task.id) ?? [];
                    return (
                      <div key={task.id}>
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragOver={(e) => handleDragOver(e, task.id)}
                          onDrop={(e) => handleDrop(e, task.id)}
                          onDragEnd={() => { dragId.current = null; dragOverId.current = null; }}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${getDepthColor(indent)} hover:border-purple-400/40 cursor-grab active:cursor-grabbing active:opacity-60 active:scale-[0.99]`}
                          style={{ marginLeft: `${indent * 16}px` }}
                        >
                          {/* Drag handle + context menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 p-0.5 rounded hover:bg-purple-500/20 cursor-grab active:cursor-grabbing group"
                                title="Options"
                              >
                                <GripVertical className="w-3.5 h-3.5 text-purple-400/30 group-hover:text-purple-300/70 transition-colors" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="bg-slate-800 border-purple-500/30 text-sm min-w-[160px]"
                              side="right"
                              align="start"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-2 py-1.5 text-[10px] text-purple-400/60 uppercase tracking-wide font-semibold truncate max-w-[200px]">
                                {task.title}
                              </div>
                              <DropdownMenuSeparator className="bg-purple-500/20" />
                              <DropdownMenuItem
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/15 cursor-pointer flex items-center gap-2"
                                onClick={() => deleteTaskMutation.mutate(task.id)}
                                disabled={deleteTaskMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove from questline
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {indent > 0 && <CornerDownRight className="w-3 h-3 text-purple-400/25 shrink-0" />}
                          <span className="shrink-0">
                            {done
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60" />
                              : <Circle className="w-3.5 h-3.5 text-slate-500" />}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${getDepthBadge(indent)}`}>
                            {getDepthLabel(indent).charAt(0)}
                          </span>
                          <span className={`text-xs flex-1 truncate min-w-0 ${done ? "line-through text-slate-500" : "text-purple-100"}`}>
                            {task.emoji && <span className="mr-1">{task.emoji}</span>}
                            {task.title}
                          </span>
                          <span className="text-[10px] text-yellow-400/40 shrink-0">🪙 {task.goldValue}</span>

                          {/* Indent controls */}
                          <div className="flex shrink-0 gap-0">
                            <button type="button" disabled={indent <= 0}
                              onClick={(e) => { e.stopPropagation(); changeExistingIndent(task.id, "out"); }}
                              className="p-0.5 text-purple-400/40 hover:text-purple-300 disabled:opacity-20" title="Move out (decrease nesting)">
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <button type="button" disabled={indent >= MAX_DEPTH}
                              onClick={(e) => { e.stopPropagation(); changeExistingIndent(task.id, "in"); }}
                              className="p-0.5 text-purple-400/40 hover:text-purple-300 disabled:opacity-20" title="Move in (increase nesting)">
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          {indent < MAX_DEPTH && (
                            <button
                              type="button"
                              onClick={() => addChildUnderExisting(task)}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors shrink-0 ${
                                indent === 0 ? "bg-blue-500/15 text-blue-300 border-blue-500/20 hover:bg-blue-500/30" :
                                indent === 1 ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/30" :
                                indent === 2 ? "bg-teal-500/15 text-teal-300 border-teal-500/20 hover:bg-teal-500/30" :
                                "bg-slate-500/15 text-slate-300 border-slate-500/20 hover:bg-slate-500/30"
                              }`}
                              title={`Add a ${childLabel} under "${task.title}"`}
                            >
                              <CornerDownRight className="w-2.5 h-2.5" />+ {childLabel}
                            </button>
                          )}

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); editingTaskId === task.id ? (setEditingTaskId(null), setInlineEdit(null)) : openInlineEdit(task); }}
                            className={`p-1 rounded shrink-0 transition-colors ${editingTaskId === task.id ? "text-yellow-400 bg-yellow-500/20" : "text-purple-400/50 hover:text-purple-200 hover:bg-purple-500/20"}`}
                            title="Edit this item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Inline edit panel */}
                        {editingTaskId === task.id && inlineEdit && (
                          <div className="mx-2 mb-2 mt-0.5 rounded-lg border border-purple-500/30 bg-slate-900/60 p-3 space-y-2.5"
                            style={{ marginLeft: `${indent * 16 + 8}px` }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Emoji + Title */}
                            <div className="space-y-1">
                              <Label className="text-purple-200 text-xs">{getDepthLabel(indent)} Title <span className="text-red-400">*</span></Label>
                              <div className="flex gap-2">
                                <div className="relative shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => { const el = document.getElementById(`iep-${task.id}`); if (el) el.classList.toggle("hidden"); }}
                                    className="w-9 h-9 rounded-lg bg-slate-800/80 border border-purple-500/30 flex items-center justify-center text-base hover:border-purple-400/60"
                                  >{inlineEdit.emoji || "➕"}</button>
                                  <div id={`iep-${task.id}`} className="hidden absolute left-0 top-full mt-1 z-[80] bg-slate-800 border border-purple-500/40 rounded-lg p-2 grid grid-cols-8 gap-1 shadow-2xl max-h-40 overflow-y-auto w-[260px]">
                                    <button type="button" onClick={() => { setInlineEdit({ ...inlineEdit, emoji: "" }); document.getElementById(`iep-${task.id}`)?.classList.add("hidden"); }}
                                      className="w-8 h-8 rounded text-xs text-slate-400 hover:bg-purple-600/30 col-span-2">None</button>
                                    {QUESTLINE_ICONS.map(em => (
                                      <button key={em} type="button"
                                        onClick={() => { setInlineEdit({ ...inlineEdit, emoji: em }); document.getElementById(`iep-${task.id}`)?.classList.add("hidden"); }}
                                        className={`w-8 h-8 rounded text-base flex items-center justify-center hover:bg-purple-600/30 ${inlineEdit.emoji === em ? "bg-purple-600/40 ring-1 ring-purple-400" : ""}`}
                                      >{em}</button>
                                    ))}
                                  </div>
                                </div>
                                <Input value={inlineEdit.title} onChange={e => setInlineEdit({ ...inlineEdit, title: e.target.value })}
                                  onFocus={scrollInputIntoView} placeholder="Title..." maxLength={200}
                                  className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-9 text-sm flex-1" />
                              </div>
                            </div>

                            {/* Due Date + Duration */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-purple-200 text-xs">📅 Due Date</Label>
                                <Input type="date" value={inlineEdit.dueDate} onChange={e => setInlineEdit({ ...inlineEdit, dueDate: e.target.value })}
                                  onFocus={scrollInputIntoView} className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-8 text-sm [color-scheme:dark]" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-purple-200 text-xs">Duration (min)</Label>
                                <Input type="number" value={inlineEdit.duration} min="1"
                                  onChange={e => setInlineEdit({ ...inlineEdit, duration: e.target.value })}
                                  onFocus={scrollInputIntoView} className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-8 text-sm" />
                              </div>
                            </div>

                            {/* Importance */}
                            <div className="space-y-1">
                              <Label className="text-purple-200 text-xs">Importance</Label>
                              <Select value={inlineEdit.importance} onValueChange={v => setInlineEdit({ ...inlineEdit, importance: v })}>
                                <SelectTrigger className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-purple-500/40">
                                  <SelectItem value="Pareto">⭐ Pareto</SelectItem>
                                  <SelectItem value="High">🔴 High</SelectItem>
                                  <SelectItem value="Med-High">🟠 Med-High</SelectItem>
                                  <SelectItem value="Medium">🟡 Medium</SelectItem>
                                  <SelectItem value="Med-Low">🟢 Med-Low</SelectItem>
                                  <SelectItem value="Low">⚪ Low</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Description */}
                            <div className="space-y-1">
                              <Label className="text-purple-200 text-xs">Description</Label>
                              <Textarea value={inlineEdit.description} onChange={e => setInlineEdit({ ...inlineEdit, description: e.target.value })}
                                onFocus={scrollInputIntoView}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) e.preventDefault(); }}
                                placeholder="Description... (Shift+Enter for new line)"
                                className="bg-slate-800/50 border-purple-500/30 text-yellow-100 text-sm min-h-[56px] resize-none" maxLength={500} />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <Button size="sm" onClick={() => saveInlineEdit(task.id)} disabled={patchTaskMutation.isPending}
                                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white h-8 text-xs">
                                <Check className="w-3.5 h-3.5 mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingTaskId(null); setInlineEdit(null); }}
                                className="border-slate-600 text-slate-300 h-8 text-xs">Cancel</Button>
                            </div>
                          </div>
                        )}

                        {/* Pending new items under this existing task */}
                        {pending.length > 0 && (
                          <div className="mt-0.5 mb-1 space-y-1" style={{ marginLeft: `${(indent + 1) * 16}px` }}>
                            <div className="flex items-center gap-1.5 px-1 py-0.5">
                              <div className="h-px flex-1 bg-blue-500/20" />
                              <span className="text-[9px] text-blue-400/60 uppercase tracking-wide">adding here →</span>
                              <div className="h-px flex-1 bg-blue-500/20" />
                            </div>
                            {pending.map((stage, sidx) => (
                              <div key={stage.id}
                                className={`rounded-lg overflow-hidden border ${getDepthColor(stage.indentLevel)} ring-1 ring-blue-500/20`}
                                style={{ marginLeft: `${stage.indentLevel * 16}px` }}>
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
                                  onClick={() => updateStage(stage.id, { expanded: !stage.expanded })}>
                                  {stage.indentLevel > 0 && <CornerDownRight className="w-3 h-3 text-blue-400/30 shrink-0" />}
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${getDepthBadge(stage.indentLevel)}`}>
                                    NEW {getDepthLabel(stage.indentLevel).charAt(0)}
                                  </span>
                                  <span className="flex-1 text-sm text-yellow-100/90 truncate min-w-0">
                                    {stage.title || <span className="text-purple-400/40 italic">Untitled…</span>}
                                  </span>
                                  {stage.dueDate && (
                                    <span className="text-[10px] text-purple-300/70 shrink-0 hidden sm:block">
                                      📅 {stage.dueDate}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-yellow-400/50 shrink-0">
                                    🪙 {calculateGoldValue(stage.importance, parseInt(stage.duration) || 30)}
                                  </span>
                                  <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" disabled={stage.indentLevel <= 0} onClick={() => outdentStage(stage.id)}
                                      className="p-1 text-purple-400/50 hover:text-purple-300 disabled:opacity-20"><ArrowLeft className="w-3 h-3" /></button>
                                    <button type="button" disabled={stage.indentLevel >= MAX_DEPTH || sidx === 0} onClick={() => indentStage(stage.id)}
                                      className="p-1 text-purple-400/50 hover:text-purple-300 disabled:opacity-20"><ArrowRight className="w-3 h-3" /></button>
                                  </div>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); removeStage(stage.id); }}
                                    className="p-1 text-red-400/40 hover:text-red-400 shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  {stage.expanded ? <ChevronUp className="w-3.5 h-3.5 text-purple-400/40 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-purple-400/40 shrink-0" />}
                                </div>
                                {/* Quick child-add */}
                                {stage.indentLevel < MAX_DEPTH && (
                                  <div className="flex items-center gap-1.5 px-2.5 pb-1.5" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => addStageAfter(stage.id, true)}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20 hover:bg-blue-500/30 transition-colors">
                                      <CornerDownRight className="w-2.5 h-2.5" />+ {getDepthLabel(stage.indentLevel + 1)}
                                    </button>
                                    <button type="button" onClick={() => addStageAfter(stage.id, false)}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 transition-colors">
                                      <Plus className="w-2.5 h-2.5" />+ Same level
                                    </button>
                                  </div>
                                )}
                                {stage.expanded && (
                                  <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-white/5">
                                    <div className="space-y-1">
                                      <Label className="text-purple-200 text-xs">{getDepthLabel(stage.indentLevel)} Title <span className="text-red-400">*</span></Label>
                                      <Input value={stage.title} onChange={(e) => updateStage(stage.id, { title: e.target.value })}
                                        onFocus={scrollInputIntoView} placeholder={`${getDepthLabel(stage.indentLevel)} title...`}
                                        className="bg-slate-800/50 border-purple-500/30 text-yellow-100 placeholder:text-purple-300/40 h-8 text-sm" maxLength={200} />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-purple-200 text-xs">Due Date <span className="text-red-400">*</span></Label>
                                      <Input type="date" value={stage.dueDate} onChange={(e) => updateStage(stage.id, { dueDate: e.target.value })}
                                        onFocus={scrollInputIntoView}
                                        className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-8 text-sm [color-scheme:dark]" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-purple-200 text-xs">Duration (min)</Label>
                                        <Input type="number" value={stage.duration} onChange={(e) => updateStage(stage.id, { duration: e.target.value })}
                                          onFocus={scrollInputIntoView} min="1" className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-8 text-sm" />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-purple-200 text-xs">Importance</Label>
                                        <Select value={stage.importance} onValueChange={(v) => updateStage(stage.id, { importance: v })}>
                                          <SelectTrigger className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-8 text-sm"><SelectValue /></SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-purple-500/40">
                                            <SelectItem value="Pareto">⭐ Pareto</SelectItem>
                                            <SelectItem value="High">🔴 High</SelectItem>
                                            <SelectItem value="Med-High">🟠 Med-High</SelectItem>
                                            <SelectItem value="Medium">🟡 Medium</SelectItem>
                                            <SelectItem value="Med-Low">🟢 Med-Low</SelectItem>
                                            <SelectItem value="Low">⚪ Low</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New stages builder — top-level only */}
            <div className="border-t border-purple-500/20 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-serif text-purple-200">
                  ✨ Add New Top-Level Stages {topLevelNew.length > 0 && `(+${topLevelNew.length})`}
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

              {topLevelNew.length === 0 ? (
                <div className="text-center py-5 text-purple-300/40 text-xs border border-dashed border-purple-500/20 rounded-lg leading-relaxed">
                  <p>Click <span className="text-purple-300/70 font-medium">+ Add Stage</span> to create a new top-level stage.</p>
                  <p className="mt-1">Or use <span className="text-blue-300/60 font-medium">+ Quest</span> buttons above to add items inside an existing stage.</p>
                </div>
              ) : (
                <>
                  {/* Depth legend */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <span key={level} className={`text-[10px] px-2 py-0.5 rounded-full ${getDepthBadge(level)}`}>
                        L{level}: {getDepthLabel(level)}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {topLevelNew.map((stage, tlIdx) => {
                      const realIndex = newStages.findIndex((s) => s.id === stage.id);
                      let siblingNum = 0;
                      for (let i = 0; i <= tlIdx; i++) {
                        if (topLevelNew[i].indentLevel < stage.indentLevel) siblingNum = 0;
                        if (topLevelNew[i].indentLevel === stage.indentLevel && i <= tlIdx) siblingNum++;
                      }

                      return (
                        <div
                          key={stage.id}
                          className={`rounded-lg overflow-hidden border ${getDepthColor(stage.indentLevel)} transition-all`}
                          style={{ marginLeft: `${stage.indentLevel * 20}px` }}
                        >
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer hover:bg-purple-600/10 transition-colors"
                          onClick={() => updateStage(stage.id, { expanded: !stage.expanded })}
                        >
                            {stage.indentLevel > 0 && (
                              <CornerDownRight className="w-3 h-3 text-purple-400/30 shrink-0" />
                            )}
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${getDepthBadge(stage.indentLevel)}`}>
                              {getDepthLabel(stage.indentLevel).charAt(0)}{siblingNum}
                            </span>
                            {stage.emoji && <span className="shrink-0 text-sm">{stage.emoji}</span>}
                            <span className="flex-1 text-sm text-yellow-100 truncate">
                              {stage.title || (
                                <span className="text-purple-400/40 italic">
                                  Untitled {getDepthLabel(stage.indentLevel).toLowerCase()}
                                </span>
                              )}
                            </span>
                            {stage.dueDate && (
                              <span className="text-[10px] text-purple-300/70 shrink-0 hidden sm:block">
                                📅 {stage.dueDate}
                              </span>
                            )}
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
                                title="Outdent"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={stage.indentLevel >= MAX_DEPTH || realIndex === 0}
                                onClick={() => indentStage(stage.id)}
                                className="p-1 text-purple-400/60 hover:text-purple-300 disabled:opacity-20"
                                title="Indent"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Move up/down */}
                            <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button type="button" disabled={realIndex === 0} onClick={() => moveStage(realIndex, "up")}
                                className="p-1 text-purple-400/60 hover:text-purple-300 disabled:opacity-20">
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" disabled={realIndex === newStages.length - 1} onClick={() => moveStage(realIndex, "down")}
                                className="p-1 text-purple-400/60 hover:text-purple-300 disabled:opacity-20">
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

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

                          {/* Always-visible quick-add buttons for child items */}
                          {stage.indentLevel < MAX_DEPTH && (
                            <div className="flex items-center gap-1.5 px-2.5 pb-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => addStageAfter(stage.id, true)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/15 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 transition-colors border border-blue-500/20"
                              >
                                <CornerDownRight className="w-2.5 h-2.5" />
                                + {getDepthLabel(stage.indentLevel + 1)}
                              </button>
                              <button
                                type="button"
                                onClick={() => addStageAfter(stage.id, false)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 transition-colors border border-purple-500/20"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                + {getDepthLabel(stage.indentLevel)}
                              </button>
                            </div>
                          )}

                          {stage.expanded && (
                            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-purple-500/15">
                              {/* Emoji + Title row */}
                              <div className="space-y-1">
                                <Label className="text-purple-200 text-xs">
                                  {getDepthLabel(stage.indentLevel)} Title <span className="text-red-400">*</span>
                                </Label>
                                <div className="flex gap-2 items-center">
                                  {/* Emoji picker button */}
                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const el = document.getElementById(`ep-${stage.id}`);
                                        if (el) el.classList.toggle("hidden");
                                      }}
                                      className="w-10 h-9 rounded-lg bg-slate-800/80 border border-purple-500/30 flex items-center justify-center text-lg hover:border-purple-400/60 transition-colors relative"
                                      title="Pick emoji"
                                    >
                                      {stage.emoji || "➕"}
                                    </button>
                                    <div id={`ep-${stage.id}`} className="hidden absolute left-0 top-full mt-1 z-[70] bg-slate-800 border border-purple-500/40 rounded-lg p-2 grid grid-cols-8 gap-1 shadow-xl max-h-48 overflow-y-auto w-[280px]">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); updateStage(stage.id, { emoji: "" }); document.getElementById(`ep-${stage.id}`)?.classList.add("hidden"); }}
                                        className="w-9 h-9 rounded flex items-center justify-center text-xs text-slate-400 hover:bg-purple-600/30 transition-colors col-span-2"
                                      >None</button>
                                      {QUESTLINE_ICONS.map((em) => (
                                        <button
                                          key={em}
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); updateStage(stage.id, { emoji: em }); document.getElementById(`ep-${stage.id}`)?.classList.add("hidden"); }}
                                          className={`w-9 h-9 rounded flex items-center justify-center text-lg hover:bg-purple-600/30 transition-colors ${stage.emoji === em ? "bg-purple-600/40 ring-1 ring-purple-400" : ""}`}
                                        >{em}</button>
                                      ))}
                                    </div>
                                  </div>
                                  <Input
                                    value={stage.title}
                                    onChange={(e) => updateStage(stage.id, { title: e.target.value })}
                                    onFocus={scrollInputIntoView}
                                    placeholder={`${getDepthLabel(stage.indentLevel)} title...`}
                                    className="bg-slate-800/50 border-purple-500/30 text-yellow-100 placeholder:text-purple-300/40 h-9 text-sm flex-1"
                                    maxLength={200}
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-purple-200 text-xs">Due Date <span className="text-red-400">*</span></Label>
                                <Input
                                  type="date"
                                  value={stage.dueDate}
                                  onChange={(e) => updateStage(stage.id, { dueDate: e.target.value })}
                                  onFocus={scrollInputIntoView}
                                  className="bg-slate-800/50 border-purple-500/30 text-yellow-100 h-9 text-sm [color-scheme:dark]"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-purple-200 text-xs">Description</Label>
                                <Textarea
                                  value={stage.description}
                                  onChange={(e) => updateStage(stage.id, { description: e.target.value })}
                                  onFocus={scrollInputIntoView}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) e.preventDefault(); }}
                                  placeholder="Brief description... (Shift+Enter for new line)"
                                  className="bg-slate-800/50 border-purple-500/30 text-yellow-100 placeholder:text-purple-300/40 text-sm min-h-[60px] resize-none"
                                  maxLength={500}
                                />
                              </div>

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
                                      <SelectItem value="Pareto">⭐ Pareto</SelectItem>
                                      <SelectItem value="High">🔴 High</SelectItem>
                                      <SelectItem value="Med-High">🟠 Med-High</SelectItem>
                                      <SelectItem value="Medium">🟡 Medium</SelectItem>
                                      <SelectItem value="Med-Low">🟢 Med-Low</SelectItem>
                                      <SelectItem value="Low">⚪ Low</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

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
                                      <SelectItem value="GPR">GPR</SelectItem>
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
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Summary — shown when any new items exist */}
            {newStages.length > 0 && (
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 flex items-center justify-between">
                <div className="text-sm text-purple-300/70">
                  <span className="font-semibold text-purple-200">{newStages.length}</span> new item{newStages.length > 1 ? "s" : ""} will be added
                  {existingChildNew.length > 0 && (
                    <span className="ml-2 text-blue-300/60">({existingChildNew.length} inside existing stages)</span>
                  )}
                </div>
                <div className="text-sm text-yellow-300 font-semibold">🪙 +{newGold}</div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 shrink-0 pt-3 border-t border-purple-500/20">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-purple-500/40 text-purple-200 hover:bg-slate-700/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saveQuestlineMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold"
          >
            {saveQuestlineMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>✅ Save Questline</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
