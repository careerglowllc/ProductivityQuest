import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Coins, 
  AlertTriangle, 
  Briefcase, 
  Tag,
  CheckCircle2,
  FileText,
  BarChart3,
  Repeat,
  Heart
} from "lucide-react";
import { format } from "date-fns";

interface TaskDetailModalProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  if (!task) return null;

  const getImportanceBadgeColor = (importance: string | null) => {
    switch (importance) {
      case 'Pareto': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Med-High': return 'bg-yellow-500 text-white';
      case 'Medium': return 'bg-blue-500 text-white';
      case 'Med-Low': return 'bg-green-500 text-white';
      case 'Low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getBusinessFilterBadgeColor = (filter: string | null) => {
    switch (filter) {
      case 'Apple': return 'bg-gray-800 text-white border-gray-600';
      case 'Vi': return 'bg-purple-600 text-white border-purple-500';
      case 'General': return 'bg-blue-600 text-white border-blue-500';
      case 'SP': return 'bg-green-600 text-white border-green-500';
      case 'Vel': return 'bg-orange-600 text-white border-orange-500';
      case 'CG': return 'bg-pink-600 text-white border-pink-500';
      default: return 'bg-slate-600 text-white border-slate-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-yellow-100 pr-8">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-400">
                <FileText className="w-4 h-4" />
                <h3 className="font-semibold">Description</h3>
              </div>
              <p className="text-yellow-200/80 bg-slate-800/50 rounded-lg p-3 border border-yellow-600/20">
                {task.description}
              </p>
            </div>
          )}

          {/* Details */}
          {task.details && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-400">
                <BarChart3 className="w-4 h-4" />
                <h3 className="font-semibold">Details</h3>
              </div>
              <p className="text-yellow-200/80 bg-slate-800/50 rounded-lg p-3 border border-yellow-600/20 whitespace-pre-wrap">
                {task.details}
              </p>
            </div>
          )}

          {/* Key Information Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-600/20">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-semibold">Due Date</span>
              </div>
              <p className="text-yellow-100">
                {task.dueDate 
                  ? format(new Date(task.dueDate), 'MMM dd, yyyy')
                  : 'No due date'}
              </p>
            </div>

            {/* Duration */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-600/20">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-semibold">Duration</span>
              </div>
              <p className="text-yellow-100">{task.duration} minutes</p>
            </div>

            {/* Gold Value */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-600/20">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Coins className="w-4 h-4" />
                <span className="text-sm font-semibold">Reward</span>
              </div>
              <p className="text-yellow-100 font-bold">{task.goldValue} Gold</p>
            </div>

            {/* Importance */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-600/20">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-semibold">Importance</span>
              </div>
              {task.importance && (
                <Badge className={getImportanceBadgeColor(task.importance)}>
                  {task.importance}
                </Badge>
              )}
            </div>
          </div>

          {/* Additional Properties */}
          <div className="space-y-3">
            {/* Business/Work Filter */}
            {task.businessWorkFilter && (
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-yellow-600/20">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm font-semibold">Business/Work Filter</span>
                </div>
                <Badge className={getBusinessFilterBadgeColor(task.businessWorkFilter)}>
                  {task.businessWorkFilter}
                </Badge>
              </div>
            )}

            {/* Kanban Stage */}
            {task.kanbanStage && (
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-yellow-600/20">
                <div className="flex items-center gap-2 text-yellow-400">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Kanban Stage</span>
                </div>
                <Badge className="bg-indigo-600 text-white border-indigo-500">
                  {task.kanbanStage}
                </Badge>
              </div>
            )}

            {/* Recurrence Type */}
            {task.recurType && (
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-yellow-600/20">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Repeat className="w-4 h-4" />
                  <span className="text-sm font-semibold">Recurrence</span>
                </div>
                <Badge className="bg-purple-600 text-white border-purple-500">
                  {task.recurType}
                </Badge>
              </div>
            )}

            {/* Life Domain */}
            {task.lifeDomain && (
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-yellow-600/20">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm font-semibold">Life Domain</span>
                </div>
                <Badge className="bg-rose-600 text-white border-rose-500">
                  {task.lifeDomain}
                </Badge>
              </div>
            )}
          </div>

          {/* Special Flags */}
          {(task.apple || task.smartPrep || task.delegationTask || task.velin) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-400">
                <Tag className="w-4 h-4" />
                <h3 className="font-semibold">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.apple && (
                  <Badge className="bg-gray-700 text-white border-gray-600">
                    🍎 Apple
                  </Badge>
                )}
                {task.smartPrep && (
                  <Badge className="bg-blue-700 text-white border-blue-600">
                    🧠 Smart Prep
                  </Badge>
                )}
                {task.delegationTask && (
                  <Badge className="bg-green-700 text-white border-green-600">
                    👥 Delegation
                  </Badge>
                )}
                {task.velin && (
                  <Badge className="bg-orange-700 text-white border-orange-600">
                    ⚡ Velin
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Completion Status */}
          {task.completed && task.completedAt && (
            <div className="bg-green-900/30 rounded-lg p-4 border border-green-600/30">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Completed</span>
              </div>
              <p className="text-green-200/80 text-sm mt-1">
                {format(new Date(task.completedAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
