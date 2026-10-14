import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ChildrenAtStake, ChildrenChoice } from "@shared/questline-delete";
import { describeStake } from "@/lib/quest-delete-text";

// Asked before deleting a quest that has quests after it in its questline (A -> B -> C, delete B).
export function DeleteChildrenDialog({ stake, onChoose, onCancel }: {
  stake: ChildrenAtStake | null; onChoose: (choice: ChildrenChoice) => void; onCancel: () => void;
}) {
  const text = stake ? describeStake(stake) : null;
  return (
    <AlertDialog open={!!stake} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent data-testid="delete-children-dialog" className="border-[var(--dash-line)] bg-[var(--dash-surface)] text-[var(--dash-ink)]">
        {text && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{text.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-[var(--dash-muted)]">{text.intro}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2">
              <button
                type="button"
                data-testid="delete-children-keep"
                onClick={() => onChoose("promote")}
                className="dash-focus flex flex-col items-start gap-0.5 rounded-[10px] border border-[var(--dash-violet)] bg-[var(--dash-violet-soft)] px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-[var(--dash-ink)]">{text.keepLabel}</span>
                <span className="text-xs text-[var(--dash-muted)]">{text.keepHint}</span>
              </button>
              <button
                type="button"
                data-testid="delete-children-delete"
                onClick={() => onChoose("delete")}
                className="dash-focus flex flex-col items-start gap-0.5 rounded-[10px] border border-red-500/50 px-4 py-3 text-left hover:bg-red-500/10"
              >
                <span className="text-sm font-semibold text-red-500">{text.deleteLabel}</span>
                <span className="text-xs text-[var(--dash-muted)]">{text.deleteHint}</span>
              </button>
            </div>
            <AlertDialogFooter>
              <Button type="button" variant="outline" data-testid="delete-children-cancel" onClick={onCancel}>Cancel</Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
