import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { calculateGoldValue } from "@/lib/goldCalculation";

const TASK_EMOJIS = [
  "📝","⚔️","🎯","🚀","💡","🔥","⭐","🏆","💼","📱","💻","🌐","📊","📈","🔧","🛠️",
  "📦","🎨","✏️","📚","🧠","💪","🤝","📞","✉️","🗓️","⏰","🔔","🎉","🌟","💰","🏦",
  "🔍","🧩","🎭","🎬","🎵","🎮","🏋️","🧘","🌱","🌍","🚗","✈️","🏠","🍽️","☕","🎁",
  "🛡️","⚡","🔑","🧪","🔬","📡","🤖","👁️","🦁","🐉","🌈","🎪","🏗️","📌","🗺️","💎",
];

const EMOJI_CATEGORIES = [
  { label: "Work", emojis: ["📝","💼","💻","📱","🔧","🛠️","📊","📈","📦","🔍","📡","🤖","🖥️","⌨️","🖨️","💾","📁","📂","🗂️","📋","📌","📍","✂️","📏","📐","🔏","🔐","🔒","🔓","🔑","🗝️","🏗️","🏢","📠","📺","📷","📸","📹","🎞️","📽️","🎙️","📻"] },
  { label: "Goals", emojis: ["🎯","🚀","⭐","🏆","💡","🔥","💪","🌟","⚔️","🛡️","⚡","💎","🥇","🥈","🥉","🎖️","🏅","🎗️","🎀","👑","✨","🌠","🌌","🧭","🗺️","🏁","🚩","🎌","🏴","🔮","⚗️","🧬","🔬","🔭","🧪","🧫","💫","🌀","🎆","🎇"] },
  { label: "Social", emojis: ["🤝","📞","✉️","🎉","🎁","🎭","🎬","🎵","🎮","👁️","🦁","🐉","💬","💭","🗨️","🗯️","👋","🙌","👏","🤗","🥂","🍾","🎤","🎧","🎼","🎹","🥁","🎷","🎸","🎺","🎻","🪗","👥","👤","🧑‍🤝‍🧑","🫂","💌","📮","📯","📣","📢"] },
  { label: "Life", emojis: ["🏠","🚗","✈️","🍽️","☕","🌱","🌍","🧘","🏋️","🌈","🗓️","⏰","🏡","🛖","🏘️","🏰","🏯","🚂","🚢","🛸","🚁","⛵","🏄","🚴","🏇","⛷️","🤸","🧗","🎭","🎠","🎡","🎢","🌅","🌇","🌆","🏖️","🏕️","🌲","🌳","🌴","🌵","🌾","🍀","🌺","🌸","🌼","🌻","🍁","🍂","🍃","🌙","☀️","⛅","🌤️","🌦️","⛈️","❄️","🌊","🌋"] },
  { label: "Health", emojis: ["🏥","💊","💉","🩺","🩻","🩹","🧬","❤️","🧡","💛","💚","💙","💜","🖤","🤍","❤️‍🔥","💓","💗","💖","💝","😴","🛌","🥗","🥤","🍎","🧃","🏃","🚶","🧠","🫀","🫁","🦷","👁️","👂","🤲","💆","💇","🛁","🚿"] },
  { label: "Finance", emojis: ["💰","💵","💴","💶","💷","💸","💳","🏦","📈","📉","💹","🪙","💲","🤑","🏧","🏷️","🧾","📊","⚖️","🔖","💼","🪙","🏪","🏬","🏫","🏨","🏩","🏛️","⚱️","🎰","🎲","🃏","🀄","🎴"] },
  { label: "Food", emojis: ["🍕","🍔","🌮","🌯","🥙","🧆","🥚","🍳","🧇","🥞","🧈","🥓","🥩","🍗","🍖","🌭","🍟","🫔","🍱","🍘","🍣","🍤","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","☕","🍵","🧋","🥛","🍺","🍷","🥤"] },
  { label: "Travel", emojis: ["✈️","🚀","🛸","🚂","🚢","🛳️","⛴️","🚁","🛩️","🪂","🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🚲","🛴","🛹","🛼","🛷","⛷️","🏄","🚣","🧗","🏇","🏊","🤽","🚵","🏌️","🗺️","🌐","🏔️","🏝️","🏜️","🏟️"] },
  { label: "Animals", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔","🐾","🐉","🐲","🌵","🌲","🌳","🌴"] },
  { label: "Objects", emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🏒","🥍","🏑","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🪄","🎿","🛷","🥌","🎯","🎳","🎰","🎲","♟️","🧩","🪆","🪅","🎭","🎨","🖼️","🎪","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎸","🎺","🎻","🪗","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶","💷","💰","💳","🪙","💎","⚖️","🧲","🔧","🔨","⚒️","🛠️","⛏️","🔩","🗜️","🔗","⛓️","🪝","🧱","🪞","🪟","🛏️","🛋️","🪑","🚽","🚿","🛁","🧴","🪒","🧼","🪥","🧻","🪣","🧺","🧹","🧽","🪤","🪣","🧴","🛒","🚪","🪣","🏺","🎎","🪆","🪅","🎠","🎡","🎢"] },
  { label: "Art & Performance", emojis: ["🎭","🎪","🎨","🖼️","🖌️","🖍️","✏️","🎬","🎥","📽️","🎞️","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎸","🎺","🎻","🪗","🪕","🎙️","📻","🎵","🎶","🎤","🎼","🎟️","🎫","🃏","🀄","🎴","🃏","🎭","🃏","🎩","🪄","🧿","🪬","👁️","🔮","🪩","💃","🕺","🩰","🩱","🩲","🩳","👘","🥻","🩴","🎒","👒","🎓","⛑️","🪖","👑","💍","💎","🧵","🧶","🪡","🧷","🪢","🎀","🎗️","🪭","🪮","🖼️","🗿","🏛️","🎠","🎡","🎢","🎪","🌂","☂️","🪆","🎎","🎏","🎐","🎑","🧧","🎊","🎉","🎈","🎋","🎍","🎆","🎇","🧨","✨","🪅"] },
];

// All emojis with searchable keywords
const EMOJI_SEARCH_MAP: { emoji: string; keywords: string }[] = [
  { emoji: "📝", keywords: "note write task memo document" },
  { emoji: "💼", keywords: "work business briefcase job" },
  { emoji: "💻", keywords: "laptop computer work tech" },
  { emoji: "📱", keywords: "phone mobile app" },
  { emoji: "🔧", keywords: "fix repair tool wrench" },
  { emoji: "🛠️", keywords: "tools build repair" },
  { emoji: "📊", keywords: "chart graph data analytics" },
  { emoji: "📈", keywords: "growth increase stock up" },
  { emoji: "📉", keywords: "decline decrease down" },
  { emoji: "📦", keywords: "box package ship deliver" },
  { emoji: "🔍", keywords: "search find look investigate" },
  { emoji: "📡", keywords: "signal broadcast antenna tech" },
  { emoji: "🤖", keywords: "robot ai tech automation" },
  { emoji: "🎯", keywords: "goal target aim focus" },
  { emoji: "🚀", keywords: "launch start rocket growth" },
  { emoji: "⭐", keywords: "star favorite rating" },
  { emoji: "🏆", keywords: "trophy win achievement" },
  { emoji: "💡", keywords: "idea lightbulb creative" },
  { emoji: "🔥", keywords: "fire hot streak urgent" },
  { emoji: "💪", keywords: "strong workout gym fitness" },
  { emoji: "🌟", keywords: "star shine glow special" },
  { emoji: "⚔️", keywords: "sword battle fight challenge" },
  { emoji: "🛡️", keywords: "shield protect defend" },
  { emoji: "⚡", keywords: "lightning fast electric energy" },
  { emoji: "💎", keywords: "diamond gem value precious" },
  { emoji: "🤝", keywords: "handshake deal partner meet" },
  { emoji: "📞", keywords: "call phone talk" },
  { emoji: "✉️", keywords: "email letter message" },
  { emoji: "🎉", keywords: "party celebrate event" },
  { emoji: "🎁", keywords: "gift present reward" },
  { emoji: "🎭", keywords: "theater drama art performance" },
  { emoji: "🎬", keywords: "film movie video camera" },
  { emoji: "🎵", keywords: "music note song audio" },
  { emoji: "🎮", keywords: "game gaming controller play" },
  { emoji: "🏠", keywords: "house home real estate" },
  { emoji: "🚗", keywords: "car drive vehicle auto" },
  { emoji: "✈️", keywords: "plane flight travel trip" },
  { emoji: "🍽️", keywords: "food eat meal restaurant" },
  { emoji: "☕", keywords: "coffee morning drink" },
  { emoji: "🌱", keywords: "grow plant nature garden" },
  { emoji: "🌍", keywords: "earth world global" },
  { emoji: "🧘", keywords: "meditation yoga relax mindful" },
  { emoji: "🏋️", keywords: "gym lift weight exercise" },
  { emoji: "🌈", keywords: "rainbow color diversity" },
  { emoji: "🗓️", keywords: "calendar schedule date plan" },
  { emoji: "⏰", keywords: "alarm time clock deadline" },
  { emoji: "💰", keywords: "money cash rich finance" },
  { emoji: "🏦", keywords: "bank finance money savings" },
  { emoji: "💊", keywords: "medicine pill health drug" },
  { emoji: "❤️", keywords: "love heart care" },
  { emoji: "🧠", keywords: "brain think mind smart" },
  { emoji: "🏃", keywords: "run jog sprint exercise" },
  { emoji: "🎨", keywords: "art paint creative design" },
  { emoji: "📚", keywords: "books study read learn" },
  { emoji: "🔑", keywords: "key unlock access" },
  { emoji: "👑", keywords: "crown king queen royal important" },
  { emoji: "🧩", keywords: "puzzle piece solve problem" },
  { emoji: "🌙", keywords: "moon night sleep rest" },
  { emoji: "☀️", keywords: "sun morning bright day" },
  { emoji: "🌊", keywords: "wave ocean water surf" },
  { emoji: "🏡", keywords: "home house family" },
  { emoji: "🐶", keywords: "dog pet animal" },
  { emoji: "🐱", keywords: "cat pet animal" },
  { emoji: "🦁", keywords: "lion courage brave strong" },
  { emoji: "🐉", keywords: "dragon power fantasy" },
  { emoji: "🦋", keywords: "butterfly change transform" },
  { emoji: "🌺", keywords: "flower bloom beauty" },
  { emoji: "🏔️", keywords: "mountain climb peak challenge" },
  { emoji: "🍕", keywords: "pizza food eat" },
  { emoji: "🧪", keywords: "science lab experiment test" },
  { emoji: "⚽", keywords: "soccer football sport" },
  { emoji: "🏀", keywords: "basketball sport" },
  { emoji: "🎯", keywords: "bullseye target goal" },
  { emoji: "🪙", keywords: "coin money gold token" },
  { emoji: "🎭", keywords: "theater theatre drama mask performance art" },
  { emoji: "🎪", keywords: "circus performance show event" },
  { emoji: "🎨", keywords: "art paint creative design palette" },
  { emoji: "🖌️", keywords: "brush paint art creative" },
  { emoji: "🖍️", keywords: "crayon draw art color" },
  { emoji: "🎬", keywords: "film movie clapper action" },
  { emoji: "🎤", keywords: "mic microphone sing perform" },
  { emoji: "🎼", keywords: "music score sheet compose" },
  { emoji: "🪄", keywords: "magic wand trick performance" },
  { emoji: "🎩", keywords: "top hat magic fancy performance" },
  { emoji: "🧿", keywords: "evil eye amulet mystical" },
  { emoji: "🔮", keywords: "crystal ball magic future predict" },
  { emoji: "💃", keywords: "dance woman dancer performance" },
  { emoji: "🕺", keywords: "dance man dancer performance" },
  { emoji: "🩰", keywords: "ballet dance performance art" },
  { emoji: "🎟️", keywords: "ticket event show theater" },
  { emoji: "🎫", keywords: "ticket event concert show" },
  { emoji: "🃏", keywords: "joker card wild card game" },
  { emoji: "🎴", keywords: "cards game japan flower" },
  { emoji: "🀄", keywords: "mahjong tiles game" },
  { emoji: "♟️", keywords: "chess strategy game" },
  { emoji: "🪅", keywords: "pinata party festive art" },
  { emoji: "🪆", keywords: "matryoshka nesting doll art" },
  { emoji: "🎎", keywords: "japanese doll art culture" },
  { emoji: "🎐", keywords: "wind chime art decoration" },
  { emoji: "🎑", keywords: "moon viewing art japanese" },
  { emoji: "🎊", keywords: "confetti party celebrate" },
  { emoji: "🎉", keywords: "party popper celebrate confetti" },
  { emoji: "📜", keywords: "scroll document plan quest" },
  { emoji: "🗡️", keywords: "dagger blade combat" },
  { emoji: "🏹", keywords: "bow arrow shoot aim" },
  { emoji: "⛏️", keywords: "pickaxe mine dig work" },
  { emoji: "🔮", keywords: "crystal ball magic future predict" },
  { emoji: "🗺️", keywords: "map explore travel quest" },
  { emoji: "🧲", keywords: "magnet attract pull" },
  { emoji: "🫂", keywords: "hug support friend care" },
  { emoji: "🧑‍💻", keywords: "developer code programmer" },
  { emoji: "🏗️", keywords: "build construct project" },
  { emoji: "🚁", keywords: "helicopter fly transport" },
  { emoji: "🚢", keywords: "ship ocean travel voyage" },
  { emoji: "🛒", keywords: "shop shopping cart buy" },
  { emoji: "📌", keywords: "pin mark location note" },
  { emoji: "🗂️", keywords: "folder organize files" },
  { emoji: "🔬", keywords: "microscope research science" },
  { emoji: "🔭", keywords: "telescope observe space" },
  { emoji: "💫", keywords: "sparkle special highlight" },
  { emoji: "🎪", keywords: "circus fun entertainment" },
  { emoji: "🧹", keywords: "clean sweep tidy" },
  { emoji: "🚿", keywords: "shower clean refresh" },
  { emoji: "🛁", keywords: "bath relax clean" },
  { emoji: "🪴", keywords: "plant grow indoor home" },
  { emoji: "🧳", keywords: "luggage travel pack trip" },
  { emoji: "🎓", keywords: "graduation school learn study" },
  { emoji: "👨‍⚕️", keywords: "doctor health medical" },
  { emoji: "👩‍⚕️", keywords: "doctor health medical nurse" },
  { emoji: "🧑‍🏫", keywords: "teacher education school" },
  { emoji: "👮", keywords: "police law protect" },
  { emoji: "🧑‍🍳", keywords: "chef cook food kitchen" },
  { emoji: "🧑‍🚀", keywords: "astronaut space explore" },
  { emoji: "🦺", keywords: "safety vest protect work" },
  { emoji: "🪖", keywords: "helmet safety construction" },
  { emoji: "🎤", keywords: "microphone sing speak present" },
  { emoji: "📸", keywords: "camera photo capture" },
  { emoji: "🛺", keywords: "ride transport" },
  { emoji: "🏊", keywords: "swim water pool exercise" },
  { emoji: "🚴", keywords: "bike cycle exercise commute" },
  { emoji: "⛳", keywords: "golf sport club" },
];



interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTaskModal({ open, onOpenChange }: AddTaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState("");
  const [taskEmoji, setTaskEmoji] = useState("📝");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<string>("30");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [importance, setImportance] = useState<string>("Medium");
  const [kanbanStage, setKanbanStage] = useState<string>("To Do");
  const [recurType, setRecurType] = useState<string>("one-time");
  const [businessWorkFilter, setBusinessWorkFilter] = useState<string>("General");
  const [campaign, setCampaign] = useState<string>("unassigned");
  
  // Checkbox filters
  const [apple, setApple] = useState(false);
  const [smartPrep, setSmartPrep] = useState(false);
  const [delegationTask, setDelegationTask] = useState(false);
  const [velin, setVelin] = useState(false);

  // Auto-calculate gold value whenever duration or importance changes
  const goldValue = calculateGoldValue(importance, parseInt(duration) || 30);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Invalidate all calendar event queries (matches any year/month params)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().startsWith('/api/google-calendar/events') || false
      });
      toast({
        title: "✓ Quest Created!",
        description: "Your new quest has been added to the list.",
      });
      resetForm();
      onOpenChange(false);
      
      // Refetch tasks after delays to pick up auto-categorized skillTags
      // Try at 1s and 3s in case AI categorization takes longer
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      }, 1000);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Quest",
        description: error.message || "Failed to create quest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setTaskEmoji("📝");
    setDescription("");
    setDuration("30");
    // goldValue is auto-calculated, no need to reset
    setDueDate(undefined);
    setImportance("Medium");
    setKanbanStage("To Do");
    setRecurType("one-time");
    setBusinessWorkFilter("General");
    setCampaign("unassigned");
    setApple(false);
    setSmartPrep(false);
    setDelegationTask(false);
    setVelin(false);
  };

  const handleSubmit = () => {
    // Validation
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a quest title.",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a quest description.",
        variant: "destructive",
      });
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Duration must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    // goldValue is auto-calculated, no need to validate user input

    const taskData = {
      title: title.trim(),
      emoji: taskEmoji,
      description: description.trim(),
      details: description.trim(),
      duration: durationNum,
      goldValue, // Use auto-calculated value
      dueDate: dueDate ? dueDate.toISOString() : null,
      importance,
      kanbanStage,
      recurType,
      businessWorkFilter,
      campaign,
      apple,
      smartPrep,
      delegationTask,
      velin,
      completed: false,
      skillTags: [], // Initialize with empty array
    };

    createTaskMutation.mutate(taskData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/40 text-yellow-100">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-yellow-100">
            Create New Quest
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-yellow-200">
              Quest Title <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              {/* Emoji picker */}
              <Popover open={emojiPickerOpen} onOpenChange={(open) => { setEmojiPickerOpen(open); if (!open) setEmojiSearch(""); }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 h-10 w-10 flex items-center justify-center text-xl rounded-md border border-yellow-600/30 bg-slate-800/50 hover:bg-slate-700/70 hover:border-yellow-500/60 transition-colors cursor-pointer"
                    title="Choose emoji"
                  >
                    {taskEmoji}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-slate-900 border-yellow-600/40" side="bottom" align="start">
                  <p className="text-xs text-yellow-400/70 mb-2 font-semibold">Choose quest icon</p>
                  {/* Search */}
                  <input
                    type="text"
                    value={emojiSearch}
                    onChange={e => setEmojiSearch(e.target.value)}
                    placeholder="Search emojis… (e.g. fire, goal, money)"
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 placeholder:text-slate-500 outline-none focus:border-yellow-600/60 mb-2"
                  />
                  <div className="h-56 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                    {emojiSearch.trim() ? (
                      /* Search results */
                      (() => {
                        const q = emojiSearch.trim().toLowerCase();
                        const matches = EMOJI_SEARCH_MAP.filter(e =>
                          e.keywords.includes(q) || e.emoji === q
                        ).map(e => e.emoji);
                        // Also include any category emojis that happen to contain the search char
                        const allCatEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
                        const extra = allCatEmojis.filter(e => !matches.includes(e) && e.toLowerCase().includes(q));
                        const seen = new Set<string>();
                        const results = [...matches, ...extra].filter(e => seen.has(e) ? false : seen.add(e) && true);
                        return results.length > 0 ? (
                          <div className="grid grid-cols-10 gap-0.5">
                            {results.map(e => (
                              <button key={e} type="button"
                                onClick={() => { setTaskEmoji(e); setEmojiPickerOpen(false); setEmojiSearch(""); }}
                                className={cn("h-7 w-7 flex items-center justify-center text-base rounded hover:bg-yellow-600/20 transition-colors", taskEmoji === e && "bg-yellow-600/30 ring-1 ring-yellow-500/50")}
                              >{e}</button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 text-center pt-4">No emojis found for "{emojiSearch}"</p>
                        );
                      })()
                    ) : (
                      /* Categorized browse */
                      EMOJI_CATEGORIES.map(cat => (
                        <div key={cat.label}>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{cat.label}</p>
                          <div className="grid grid-cols-10 gap-0.5">
                            {cat.emojis.map(e => (
                              <button key={e} type="button"
                                onClick={() => { setTaskEmoji(e); setEmojiPickerOpen(false); }}
                                className={cn("h-7 w-7 flex items-center justify-center text-base rounded hover:bg-yellow-600/20 transition-colors", taskEmoji === e && "bg-yellow-600/30 ring-1 ring-yellow-500/50")}
                              >{e}</button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quest title..."
                className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40"
                maxLength={200}
              />
            </div>
            <p className="text-xs text-yellow-400/60">{title.length}/200 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-yellow-200">
              Description <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this quest..."
              className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40 min-h-[100px]"
              maxLength={2000}
            />
            <p className="text-xs text-yellow-400/60">{description.length}/2000 characters</p>
          </div>

          {/* Duration and Gold Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-yellow-200">
                Duration (minutes) <span className="text-red-400">*</span>
              </Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                min="1"
                className="bg-slate-800/50 border-yellow-600/30 text-yellow-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goldValue" className="text-yellow-200 flex items-center gap-2">
                Gold Reward
                <span className="text-xs text-yellow-400/60">(Auto-calculated)</span>
              </Label>
              <Input
                id="goldValue"
                type="number"
                value={goldValue}
                readOnly
                disabled
                className="bg-slate-800/30 border-yellow-600/20 text-yellow-300 cursor-not-allowed"
              />
              <p className="text-xs text-yellow-400/60">
                Based on duration ({duration} min) and importance ({importance})
              </p>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-yellow-200">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-slate-800/50 border-yellow-600/30 text-yellow-100 hover:bg-slate-700/50 hover:text-yellow-100",
                    !dueDate && "text-yellow-400/60"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date (optional)</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-800 border-yellow-600/40">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="bg-slate-800 text-yellow-100"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Importance */}
          <div className="space-y-2">
            <Label htmlFor="importance" className="text-yellow-200">
              Importance
            </Label>
            <Select value={importance} onValueChange={setImportance}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="Pareto">� Pareto (Critical)</SelectItem>
                <SelectItem value="High">� High</SelectItem>
                <SelectItem value="Med-High">🟠 Med-High</SelectItem>
                <SelectItem value="Medium">� Medium</SelectItem>
                <SelectItem value="Med-Low">� Med-Low</SelectItem>
                <SelectItem value="Low">� Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kanban Stage */}
          <div className="space-y-2">
            <Label htmlFor="kanbanStage" className="text-yellow-200">
              Kanban Stage
            </Label>
            <Select value={kanbanStage} onValueChange={setKanbanStage}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="To Do">To Do</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Review">Review</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurrence Type */}
          <div className="space-y-2">
            <Label htmlFor="recurType" className="text-yellow-200">
              Recurrence
            </Label>
            <Select value={recurType} onValueChange={setRecurType}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="one-time">⏳ One-time</SelectItem>
                <SelectItem value="daily">� Daily</SelectItem>
                <SelectItem value="every other day">📆 Every Other Day</SelectItem>
                <SelectItem value="2x week">2️⃣ 2x Week</SelectItem>
                <SelectItem value="3x week">3️⃣ 3x Week</SelectItem>
                <SelectItem value="weekly">📅 Weekly</SelectItem>
                <SelectItem value="2x month">📅 2x Month</SelectItem>
                <SelectItem value="monthly">📅 Monthly</SelectItem>
                <SelectItem value="every 2 months">📅 Every 2 Months</SelectItem>
                <SelectItem value="quarterly">� Quarterly</SelectItem>
                <SelectItem value="every 6 months">📅 Every 6 Months</SelectItem>
                <SelectItem value="yearly">📅 Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Business/Work Filter */}
          <div className="space-y-2">
            <Label htmlFor="businessWorkFilter" className="text-yellow-200">
              Business/Work Filter
            </Label>
            <Select value={businessWorkFilter} onValueChange={setBusinessWorkFilter}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Apple">Apple</SelectItem>
                <SelectItem value="MW">MW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaign */}
          <div className="space-y-2">
            <Label htmlFor="campaign" className="text-yellow-200">
              Questline
            </Label>
            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="Main">Main</SelectItem>
                <SelectItem value="Side">Side</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="border-yellow-600/40 text-yellow-200 hover:bg-slate-700/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTaskMutation.isPending}
            className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-900 font-semibold"
          >
            {createTaskMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Quest"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
