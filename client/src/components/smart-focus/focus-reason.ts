// The reason line shown on a quest. The server's "Protected: overdue or due today." note stays in the data but is not
// shown; anything after it (such as a work-filter or ranking note) still is.
export function visibleFocusReason(reason: string | null | undefined): string {
  return (reason ?? "").replace(/^\s*Protected:[^.]*\.\s*/i, "").trim();
}
