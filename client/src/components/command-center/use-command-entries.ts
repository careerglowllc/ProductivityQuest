import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CommandEntry, CommandEntryInput } from "@shared/command-center";

export function useCommandEntries() {
  const client = useQueryClient();
  const entries = useQuery<CommandEntry[]>({ queryKey: ["/api/command-center"] });
  const save = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: CommandEntryInput }): Promise<CommandEntry> => {
      const response = await apiRequest(id ? "PATCH" : "POST", id ? `/api/command-center/${encodeURIComponent(id)}` : "/api/command-center", input);
      return response.json();
    },
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["/api/command-center"] }); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/command-center/${encodeURIComponent(id)}`); },
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["/api/command-center"] }); },
  });
  return { entries, save, remove };
}
