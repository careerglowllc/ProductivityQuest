import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { focusError, useFocusActions } from "./use-smart-focus";
import "./smart-focus.css";

export function FocusFeedbackDialog({ taskId, taskTitle, open, onOpenChange }: {
  taskId: number; taskTitle: string; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const { feedback } = useFocusActions();
  const valid = text.trim().length >= 1 && text.length <= 3000;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!feedback.isPending) { onOpenChange(next); if (!next) { setText(""); feedback.reset(); } } }}>
      <DialogContent className="sf-dialog sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Help Smart Focus understand you</DialogTitle>
          <DialogDescription className="sf-muted">Feedback for “{taskTitle}”. Say what makes this quest useful, difficult, or worth prioritizing.</DialogDescription>
        </DialogHeader>
        {feedback.isSuccess ? (
          <div className="space-y-4" role="status">
            <p className="text-sm">Preference saved. Smart Focus will use it when choosing your next quests. Review or forget it in Settings, under Smart Focus.</p>
            <Button className="sf-primary" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (valid) feedback.mutate({ taskId, text: text.trim() }); }}>
            <label htmlFor={`focus-feedback-${taskId}`} className="text-sm font-medium">Your preference</label>
            <Textarea id={`focus-feedback-${taskId}`} className="sf-textarea min-h-32" value={text} maxLength={3000} required disabled={feedback.isPending} onChange={(event) => setText(event.target.value)} placeholder="For example: I prefer short admin quests after lunch, but this client deadline matters most this week." />
            <div className="flex justify-between gap-3 text-xs sf-muted"><span>1–3,000 characters. Stored privately on your account.</span><span>{text.length}/3000</span></div>
            <p className="text-xs sf-muted">If Smart Focus is enabled, relevant quest content and your preferences are sent to OpenAI. You can save feedback while it is off.</p>
            {feedback.isError && <p role="alert" className="sf-error">{focusError(feedback.error)} You can retry without losing your text.</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="sf-button" disabled={feedback.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="sf-primary" disabled={!valid || feedback.isPending}>{feedback.isPending ? "Saving preference…" : feedback.isError ? "Retry saving" : "Save preference"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
