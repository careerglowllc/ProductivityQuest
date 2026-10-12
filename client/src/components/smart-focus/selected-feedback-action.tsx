import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FocusFeedbackDialog } from "./feedback-dialog";

type SelectedQuest = { id: number; title: string };
export function SelectedFeedbackAction({ quests }: { quests: SelectedQuest[] }) {
  const [choosing, setChoosing] = useState(false);
  const [target, setTarget] = useState<SelectedQuest | null>(null);
  return <>
    <Button variant="outline" size="sm" disabled={!quests.length}
      data-testid="selected-ai-feedback"
      onClick={() => quests.length === 1 ? setTarget(quests[0]) : setChoosing(true)}>
      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />AI feedback
    </Button>
    <Dialog open={choosing} onOpenChange={setChoosing}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Choose a quest for AI feedback</DialogTitle>
          <DialogDescription>Feedback applies to one quest at a time. Choose which selected quest you want to discuss.</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {quests.map(quest => <Button key={quest.id} variant="outline" className="h-auto w-full justify-start whitespace-normal text-left"
            onClick={() => { setChoosing(false); setTarget(quest); }}>{quest.title}</Button>)}
        </div>
      </DialogContent>
    </Dialog>
    {target && <FocusFeedbackDialog key={target.id} taskId={target.id} taskTitle={target.title}
      open onOpenChange={open => { if (!open) setTarget(null); }} />}
  </>;
}
