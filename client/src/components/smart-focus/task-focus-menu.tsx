import { useState } from "react";
import { MoreHorizontal, MessageSquare, CalendarMinus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { FocusFeedbackDialog } from "./feedback-dialog";
import { focusError, useFocusActions } from "./use-smart-focus";

export function TaskFocusMenu({ taskId, taskTitle, completed = false }: { taskId: number; taskTitle: string; completed?: boolean }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { dismiss } = useFocusActions();
  const { toast } = useToast();
  const changeDismissal = async (undo = false) => {
    try {
        // Await explicitly: the card can unmount when the ranking removes it.
        // Mutation per-call callbacks would then drop the Undo toast.
        await dismiss.mutateAsync({ taskId, ...(undo ? { undo: true } : {}) });
        setDismissed(!undo);
        toast({
          title: undo ? "Back in your focus queue" : "Set aside for today",
          description: undo ? taskTitle : "The quest is unchanged. Smart Focus can recommend it on another day.",
          duration: 30000,
          ...(!undo ? { action: <ToastAction altText="Undo not today" onClick={() => changeDismissal(true)}>Undo</ToastAction> } : {}),
        });
    } catch (error) {
      toast({ title: "Could not set this quest aside", description: focusError(error), variant: "destructive" });
    }
  };
  return (
    <div className="shrink-0" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-[var(--dash-muted)] hover:bg-[var(--dash-violet-soft)]" aria-label={`Quest menu for ${taskTitle}`}><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="sf-menu">
          <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}><MessageSquare className="mr-2 h-4 w-4" />AI feedback</DropdownMenuItem>
          <DropdownMenuItem disabled={completed || dismiss.isPending} onSelect={() => changeDismissal(dismissed)}>
            {dismissed ? <Undo2 className="mr-2 h-4 w-4" /> : <CalendarMinus className="mr-2 h-4 w-4" />}{dismissed ? "Undo not today" : "Not today"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {feedbackOpen && <FocusFeedbackDialog taskId={taskId} taskTitle={taskTitle} open={feedbackOpen} onOpenChange={setFeedbackOpen} />}
    </div>
  );
}
