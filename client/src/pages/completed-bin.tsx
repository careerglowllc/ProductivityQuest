import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { Archive, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, GitBranch, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUndoableCompletedTaskDelete } from "@/hooks/use-undoable-completed-task-delete";

type CompletedTask = {
  id: number;
  title: string;
  description?: string | null;
  completedAt?: string | null;
  duration: number;
  goldValue: number;
  importance?: string | null;
  skillTags?: string[] | null;
  questlineId?: number | null;
  parentTaskId?: number | null;
};

type CompletedArchiveResponse = {
  tasks: CompletedTask[];
  count: number;
  limit: number;
};

const PAGE_SIZE = 50;

export default function CompletedBin() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { removeCompletedTask, isRemovingTask } = useUndoableCompletedTaskDelete();
  const { data, isLoading, error } = useQuery<CompletedArchiveResponse>({
    queryKey: ["/api/completed-tasks"],
    queryFn: async () => {
      const response = await fetch("/api/completed-tasks", { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load completed quests");
      return response.json();
    },
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data?.tasks ?? [];
    return (data?.tasks ?? []).filter((task) =>
      task.title.toLowerCase().includes(query)
      || task.description?.toLowerCase().includes(query)
      || task.skillTags?.some((skill) => skill.toLowerCase().includes(query))
      || (task.questlineId != null && String(task.questlineId).includes(query))
    );
  }, [data?.tasks, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleTasks = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 px-4 py-6 pb-24 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/tasks">
            <Button variant="ghost" className="text-purple-100 hover:bg-white/10 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to quests
            </Button>
          </Link>
          <Link href="/recycling-bin">
            <Button variant="outline" className="border-slate-600 bg-slate-900/60 text-slate-200">
              <Trash2 className="mr-2 h-4 w-4" /> Recycling bin
            </Button>
          </Link>
        </div>

        <Card className="border-purple-500/30 bg-slate-900/80 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-6 w-6 text-purple-300" />
              Completed quest archive
            </CardTitle>
            <p className="text-sm text-slate-400">
              Your completed quests are kept as durable history unless you permanently remove them here.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>{(data?.count ?? 0).toLocaleString()} archived</span>
              <span>{(data?.limit ?? 5000).toLocaleString()} maximum</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{ width: `${Math.min(100, ((data?.count ?? 0) / (data?.limit ?? 5000)) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search titles, descriptions, skills, or questline ID"
            className="border-slate-700 bg-slate-900/80 pl-10 text-slate-100"
          />
        </div>

        {isLoading ? (
          <Card className="border-slate-700 bg-slate-900/70"><CardContent className="py-12 text-center text-slate-400">Loading completed quests…</CardContent></Card>
        ) : error ? (
          <Card className="border-red-500/30 bg-slate-900/70"><CardContent className="py-12 text-center text-red-300">Completed history could not be loaded.</CardContent></Card>
        ) : visibleTasks.length === 0 ? (
          <Card className="border-slate-700 bg-slate-900/70">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-slate-400">{search ? "No completed quests match that search." : "Completed quests will appear here."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleTasks.map((task) => (
              <Card key={task.id} className="border-slate-700/80 bg-slate-900/75 text-slate-100">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <h2 className="font-semibold">{task.title}</h2>
                        {task.questlineId != null && (
                          <Badge variant="outline" className="border-purple-500/40 text-purple-200">
                            <GitBranch className="mr-1 h-3 w-3" /> Questline #{task.questlineId}
                          </Badge>
                        )}
                        {task.parentTaskId != null && (
                          <Badge variant="outline" className="border-slate-600 text-slate-300">Subquest</Badge>
                        )}
                      </div>
                      {task.description && <p className="mt-2 line-clamp-2 text-sm text-slate-400">{task.description}</p>}
                      {!!task.skillTags?.length && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {task.skillTags.map((skill) => <Badge key={skill} className="bg-purple-500/15 text-purple-200">{skill}</Badge>)}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-3 text-right text-xs text-slate-400">
                      <div>
                      <p>{task.completedAt ? format(new Date(task.completedAt), "MMM d, yyyy · h:mm a") : "Completion date unavailable"}</p>
                      <p className="mt-1">{task.duration} min · {task.goldValue} gold</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isRemovingTask(task.id)}
                        onClick={() => removeCompletedTask(task)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isRemovingTask(task.id) ? "Removing…" : "Permanently remove"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} className="border-slate-700 bg-slate-900">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-400">Page {safePage} of {pageCount}</span>
            <Button variant="outline" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)} className="border-slate-700 bg-slate-900">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}