import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { focusError, useFocusActions, useFocusPlacement } from "./use-smart-focus";
import { feedbackLabel, feedbackPlaceholder, focusActionOptions } from "./feedback-actions";
import type { FocusAction } from "@shared/smart-focus-ai";
import "./smart-focus.css";

export function FocusFeedbackDialog({ taskId, taskTitle, open, onOpenChange }: {
  taskId: number; taskTitle: string; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [action, setAction] = useState<FocusAction | null>(null);
  const inFocus = useFocusPlacement(taskId);
  const { feedback } = useFocusActions();
  const valid = text.trim().length >= 1 && text.length <= 3000;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!feedback.isPending) { onOpenChange(next); if (!next) { setText(""); setAction(null); feedback.reset(); } } }}>
      <DialogContent className="sf-dialog sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Help Smart Focus understand you</DialogTitle>
          <DialogDescription className="sf-muted">Feedback for “{taskTitle}”. Choose what should happen to it, then say why, so Smart Focus can learn from it.</DialogDescription>
        </DialogHeader>
        {feedback.isSuccess ? (
          <div className="space-y-4" role="status">
            <p className="text-sm">{feedback.data?.message || "Preference saved. Smart Focus will use it when choosing your next quests."} Review or forget it in Settings, under Smart Focus.</p>
            <Button className="sf-primary" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (valid) feedback.mutate({ taskId, text: text.trim(), ...(action ? { action, ...(inFocus !== undefined ? { inFocus } : {}) } : {}) }); }}>
            <label htmlFor={`focus-feedback-${taskId}`} className="text-sm font-medium">{feedbackLabel(action)}</label>
            <Textarea id={`focus-feedback-${taskId}`} className="sf-textarea min-h-32" value={text} maxLength={3000} required disabled={feedback.isPending} onChange={(event) => setText(event.target.value)} placeholder={feedbackPlaceholder(action, inFocus)} />
            <div className="flex justify-between gap-3 text-xs sf-muted"><span>1–3,000 characters. Stored privately on your account.</span><span>{text.length}/3000</span></div>
            <div role="group" aria-label="What should happen to this quest" data-testid="focus-actions" className="space-y-2">
              {inFocus !== undefined && <p className="text-xs sf-muted">Right now this quest is {inFocus ? "in" : "not in"} your Smart Focus list.</p>}
              <div className="flex flex-wrap gap-2">
                {focusActionOptions(inFocus).map((option) => {
                  const selected = action === option.action;
                  return (
                    <Button key={option.action} type="button" variant="outline" size="sm" data-focus-action={option.action}
                      aria-pressed={selected} title={option.hint} disabled={option.disabled || feedback.isPending}
                      className={`sf-button h-auto whitespace-normal text-left text-xs ${selected ? "border-[var(--dash-violet)] bg-[var(--dash-violet-soft)] font-semibold ring-1 ring-[var(--dash-violet)]" : ""}`}
                      onClick={() => setAction(selected ? null : option.action)}>
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs sf-muted">{action ? "Your explanation will teach Smart Focus why. Click the choice again to unselect it." : "Optional: pick one, or just write a preference."}</p>
            </div>
            <p className="text-xs sf-muted">If Smart Focus is enabled, relevant quest content and your preferences are sent to OpenAI. You can save feedback while it is off.</p>
            {feedback.isError && <p role="alert" className="sf-error">{focusError(feedback.error)} You can retry without losing your text.</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="sf-button" disabled={feedback.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="sf-primary" disabled={!valid || feedback.isPending}>{feedback.isPending ? "Submitting…" : feedback.isError ? "Retry submitting" : "Submit"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
