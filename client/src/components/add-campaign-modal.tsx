import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Heart, DollarSign, Target, Briefcase, Home, GraduationCap, 
  Plane, Book, Users, Dumbbell, Globe, Trophy, Star, Sparkles,
  Crown, Rocket, Mountain, Compass, Flag, Award, Zap, Gift
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AddCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  { name: "Heart", icon: Heart, color: "text-pink-400" },
  { name: "DollarSign", icon: DollarSign, color: "text-green-400" },
  { name: "Target", icon: Target, color: "text-blue-400" },
  { name: "Briefcase", icon: Briefcase, color: "text-purple-400" },
  { name: "Home", icon: Home, color: "text-orange-400" },
  { name: "GraduationCap", icon: GraduationCap, color: "text-indigo-400" },
  { name: "Plane", icon: Plane, color: "text-cyan-400" },
  { name: "Book", icon: Book, color: "text-amber-400" },
  { name: "Users", icon: Users, color: "text-teal-400" },
  { name: "Dumbbell", icon: Dumbbell, color: "text-red-400" },
  { name: "Globe", icon: Globe, color: "text-emerald-400" },
  { name: "Trophy", icon: Trophy, color: "text-yellow-400" },
  { name: "Star", icon: Star, color: "text-yellow-300" },
  { name: "Sparkles", icon: Sparkles, color: "text-pink-300" },
  { name: "Crown", icon: Crown, color: "text-purple-300" },
  { name: "Rocket", icon: Rocket, color: "text-blue-300" },
  { name: "Mountain", icon: Mountain, color: "text-slate-400" },
  { name: "Compass", icon: Compass, color: "text-orange-300" },
  { name: "Flag", icon: Flag, color: "text-red-300" },
  { name: "Award", icon: Award, color: "text-amber-300" },
  { name: "Zap", icon: Zap, color: "text-yellow-400" },
  { name: "Gift", icon: Gift, color: "text-rose-400" },
];

export function AddCampaignModal({ open, onClose }: AddCampaignModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0].name);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: { title: string; description: string; icon: string }) => {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create campaign");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({
        title: "Campaign Created! 🎯",
        description: `"${title}" has been added to your campaigns`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your campaign",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a description for your campaign",
        variant: "destructive",
      });
      return;
    }

    createCampaignMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      icon: selectedIcon,
    });
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setSelectedIcon(AVAILABLE_ICONS[0].name);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 border-2 border-purple-600/40">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-bold text-purple-100 flex items-center gap-2">
            <Target className="h-6 w-6 text-purple-400" />
            Create Custom Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Campaign Title */}
          <div>
            <label className="text-sm font-semibold text-purple-200 mb-2 block">
              Campaign Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Get Fit & Healthy, Master Programming, Travel the World"
              className="bg-slate-800/50 border-purple-600/30 text-purple-100 placeholder:text-purple-400/50 focus:border-purple-500/50"
              maxLength={100}
            />
            <p className="text-xs text-purple-300/60 mt-1">
              {title.length}/100 characters
            </p>
          </div>

          {/* Campaign Description */}
          <div>
            <label className="text-sm font-semibold text-purple-200 mb-2 block">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this campaign means to you and what you hope to achieve..."
              className="bg-slate-800/50 border-purple-600/30 text-purple-100 placeholder:text-purple-400/50 focus:border-purple-500/50 min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-purple-300/60 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="text-sm font-semibold text-purple-200 mb-3 block">
              Choose an Icon
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-11 gap-2">
              {AVAILABLE_ICONS.map(({ name, icon: Icon, color }) => (
                <button
                  key={name}
                  onClick={() => setSelectedIcon(name)}
                  className={`
                    p-3 rounded-lg border-2 transition-all hover:scale-105
                    ${
                      selectedIcon === name
                        ? "bg-purple-600/30 border-purple-500/80 shadow-lg shadow-purple-500/20"
                        : "bg-slate-800/30 border-slate-600/30 hover:border-purple-500/40"
                    }
                  `}
                  title={name}
                >
                  <Icon className={`h-5 w-5 ${color}`} />
                </button>
              ))}
            </div>
            <p className="text-xs text-purple-300/70 mt-2">
              Selected: <span className="font-semibold">{selectedIcon}</span>
            </p>
          </div>

          {/* Preview */}
          <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
            <p className="text-xs text-purple-300/70 mb-3 uppercase tracking-wide">Preview</p>
            <div className="flex items-start gap-3">
              {(() => {
                const IconComponent = AVAILABLE_ICONS.find(i => i.name === selectedIcon)?.icon || Target;
                const iconColor = AVAILABLE_ICONS.find(i => i.name === selectedIcon)?.color || "text-purple-400";
                return (
                  <div className="p-3 bg-purple-600/30 rounded-lg border border-purple-500/50">
                    <IconComponent className={`h-6 w-6 ${iconColor}`} />
                  </div>
                );
              })()}
              <div className="flex-1">
                <h3 className="text-xl font-serif font-bold text-purple-100 mb-1">
                  {title || "Campaign Title"}
                </h3>
                <p className="text-purple-300/70 text-sm">
                  {description || "Campaign description will appear here"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-purple-600/20">
            <Button
              variant="outline"
              onClick={handleClose}
              className="bg-slate-800/50 border-slate-600/50 text-slate-200 hover:bg-slate-700/50"
              disabled={createCampaignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold"
              disabled={createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
