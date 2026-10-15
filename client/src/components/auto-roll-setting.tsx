import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { autoRollText, autoRollToast } from "@/lib/auto-roll-text";

type AccountSettings = { timezone?: string; autoRollDueDates?: boolean };
const SETTINGS_KEY = ["/api/settings"] as const;

// The per-account switch for moving overdue quests to today at midnight.
export function AutoRollSetting({ isMobile = false }: { isMobile?: boolean }) {
  const client = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AccountSettings>({ queryKey: SETTINGS_KEY });
  const enabled = data?.autoRollDueDates === true;
  const text = autoRollText(data?.timezone, enabled);

  const change = useMutation({
    mutationFn: async (next: boolean) => {
      const response = await apiRequest("POST", "/api/settings/auto-roll-due-dates", { enabled: next });
      return (await response.json()) as { autoRollDueDates: boolean };
    },
    // Show the new state at once; put it back if the server says no.
    onMutate: async (next) => {
      await client.cancelQueries({ queryKey: SETTINGS_KEY });
      const previous = client.getQueryData<AccountSettings>(SETTINGS_KEY);
      client.setQueryData<AccountSettings>(SETTINGS_KEY, (old) => ({ ...old, autoRollDueDates: next }));
      return { previous };
    },
    onError: (_error, _next, context) => {
      client.setQueryData(SETTINGS_KEY, context?.previous);
      toast({ title: "Could not save the setting", description: "Please try again.", variant: "destructive" });
    },
    onSuccess: (_data, next) => toast(autoRollToast(next)),
    onSettled: () => client.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });

  return (
    <Card data-testid="auto-roll-setting" className={`bg-slate-800/60 backdrop-blur-md border border-yellow-600/30 ${isMobile ? "mb-3" : "mb-6"}`}>
      <CardContent className={isMobile ? "p-3" : "p-5"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <CalendarClock aria-hidden className={`${isMobile ? "mt-0.5 h-4 w-4" : "mt-1 h-5 w-5"} shrink-0 text-yellow-400`} />
            <div className="min-w-0">
              <h3 id="auto-roll-title" className={`${isMobile ? "text-sm" : "text-lg"} font-serif font-bold text-yellow-100`}>{text.title}</h3>
              <p className={`${isMobile ? "text-[11px] leading-tight" : "text-sm"} text-yellow-200/70`}>{text.description}</p>
              <p data-testid="auto-roll-hint" className={`mt-1 ${isMobile ? "text-[11px] leading-tight" : "text-xs"} text-yellow-200/50`}>{text.hint}</p>
            </div>
          </div>
          <Switch
            data-testid="auto-roll-switch"
            aria-labelledby="auto-roll-title"
            checked={enabled}
            disabled={isLoading || change.isPending}
            onCheckedChange={(next) => change.mutate(next)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
