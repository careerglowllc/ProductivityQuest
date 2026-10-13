import type { Express, RequestHandler } from "express";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { eligibleFocus, protectedFocus, focusSignals, focusWorkload, rankFocus, type FocusMemory, type FocusQuest, type FocusAdvice, type FocusRanking, type FocusWorkload } from "../shared/smart-focus-ai";

export interface FocusStore {
  tasks(id: string): Promise<FocusQuest[]>;
  timezone(id: string): Promise<string>;
  read(id: string): Promise<FocusMemory>;
  change(id: string, change: (memory: FocusMemory) => void): Promise<void>;
}
type Advice = (input: { quests: FocusQuest[]; memory: FocusMemory; day: string; workload?: FocusWorkload }) => Promise<FocusAdvice[]>;
export function registerSmartFocus(app: Express, auth: RequestHandler, store: FocusStore, advise: Advice,
  available = () => !!process.env.OPENAI_API_KEY, clock = () => new Date()) {
  const cache = new Map<string, { hash: string; until: number; result: FocusRanking }>();
  const inFlight = new Map<string, Promise<FocusRanking>>();
  const cooldown = new Map<string, number>();
  const forget = (id: string) => cache.delete(id);
  const handler = (fn: (req: any, res: any) => Promise<unknown>): RequestHandler => async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try { await fn(req, res); } catch (error) {
      if (error instanceof z.ZodError) { res.status(400).json({ message: "Invalid Smart Focus input." }); return; }
      res.status(500).json({ message: "Smart Focus could not save or load your data. Please retry." });
    }
  };
  const dayFor = async (id: string) => {
    const timezone = await store.timezone(id);
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(clock());
    const value = (type: string) => parts.find(p => p.type === type)!.value;
    return { day: `${value("year")}-${value("month")}-${value("day")}`, timezone };
  };
  app.get("/api/smart-focus/state", auth, handler(async (req, res) => {
    const id = req.session.userId, memory = await store.read(id);
    const { day, timezone } = await dayFor(id);
    res.json({ enabled: memory.enabled, available: available(), preferences: memory.preferences, signals: focusSignals(memory, day), timezone });
  }));
  app.patch("/api/smart-focus/settings", auth, handler(async (req, res) => {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body), id = req.session.userId;
    await store.change(id, m => { m.enabled = enabled; }); forget(id); res.json({ enabled });
  }));
  app.post("/api/smart-focus/feedback", auth, handler(async (req, res) => {
    const input = z.object({ taskId: z.number().int().positive(), text: z.string().trim().min(1).max(3000) }).parse(req.body);
    const id = req.session.userId;
    const task = (await store.tasks(id)).find(q => q.id === input.taskId);
    if (!task) return res.status(404).json({ message: "Quest not found." });
    const preference = { id: randomUUID(), taskId: task.id, taskTitle: task.title, text: input.text, createdAt: clock().toISOString() };
    try {
      await store.change(id, m => {
        if (m.preferences.length >= 100 || m.preferences.reduce((sum, p) => sum + p.text.length, 0) + input.text.length > 30000)
          throw new Error("Preference capacity reached");
        m.preferences.push(preference);
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Preference capacity reached")
        return res.status(409).json({ message: "Preference memory is full. Forget an old preference before adding more." });
      throw error;
    }
    forget(id); res.status(201).json({ preference, message: "Feedback saved privately. Refresh AI focus to apply it; date safeguards still apply." });
  }));
  app.post("/api/smart-focus/dismiss", auth, handler(async (req, res) => {
    const input = z.object({ taskId: z.number().int().positive(), undo: z.boolean().optional() }).parse(req.body);
    const id = req.session.userId, { day } = await dayFor(id);
    const task = (await store.tasks(id)).find(q => q.id === input.taskId);
    if (!task) return res.status(404).json({ message: "Quest not found." });
    if (!input.undo && protectedFocus(task, day)) return res.status(409).json({
      message: "This quest is due/overdue or starts today. Change its dates explicitly if appropriate; AI cannot hide it.",
    });
    await store.change(id, m => {
      m.dismissals = m.dismissals.filter(e => !(e.taskId === task.id && e.day === day));
      if (!input.undo) m.dismissals.push({ taskId: task.id, taskTitle: task.title, day });
      m.dismissals = m.dismissals.slice(-500);
    });
    forget(id); res.json({ success: true });
  }));
  app.delete("/api/smart-focus/preferences/:id", auth, handler(async (req, res) => {
    const id = req.session.userId;
    await store.change(id, m => { m.preferences = m.preferences.filter(p => p.id !== req.params.id); });
    forget(id); res.json({ success: true });
  }));
  app.delete("/api/smart-focus/signals/:taskId", auth, handler(async (req, res) => {
    const taskId = z.coerce.number().int().positive().parse(req.params.taskId), id = req.session.userId;
    await store.change(id, m => { m.dismissals = m.dismissals.filter(e => e.taskId !== taskId); });
    forget(id); res.json({ success: true });
  }));
  app.delete("/api/smart-focus/memory", auth, handler(async (req, res) => {
    const id = req.session.userId;
    await store.change(id, m => { m.preferences = []; m.dismissals = []; });
    forget(id); res.json({ success: true });
  }));
  app.post("/api/smart-focus/rank", auth, handler(async (req, res) => {
    const id = req.session.userId;
    // Serialize requests per account, including forced refreshes (no duplicate paid calls).
    if (inFlight.has(id)) return res.json(await inFlight.get(id));
    const work = (async () => {
      const [quests, memory, { day }] = await Promise.all([store.tasks(id), store.read(id), dayFor(id)]);
      const hash = createHash("sha256").update(JSON.stringify([quests, memory, day, available()])).digest("hex");
      const hit = cache.get(id);
      if (hit && hit.hash === hash && hit.until > Date.now() && req.query.refresh !== "1") return hit.result;
      let result = rankFocus(quests, day, memory);
      let ttl = 15 * 60 * 1000;
      if (!memory.enabled) result.message = "Rules-based focus. Enable AI to use your private preferences.";
      else if (!available()) result.message = "Rules-based focus: OpenAI is not configured on this server.";
      else if ((cooldown.get(id) || 0) > Date.now()) {
        result.message = "Rules-based focus: wait up to one minute before another AI refresh."; ttl = 30 * 1000;
      } else {
        cooldown.set(id, Date.now() + 60000);
        try {
          // Highest-priority baseline first, then potential missing work. Always keep all protected tasks in final ranking.
          const eligible = quests.filter(q => eligibleFocus(q, day));
          const order = new Map(rankFocus(quests, day, memory).ids.map((taskId, index) => [taskId, index]));
          const feedbackTargets = new Set(memory.preferences.map(p => p.taskId));
          const priority = (q: FocusQuest) => feedbackTargets.has(q.id) ? -1 : order.get(q.id) ?? 1000;
          const candidates = eligible.sort((a, b) => priority(a) - priority(b) || a.id - b.id).slice(0, 100);
          const advice = await advise({ quests: candidates, memory, day, workload: focusWorkload(quests, day) });
          result = rankFocus(quests, day, memory, advice);
          if (eligible.length > 100) result.message += " AI reviewed 100 candidates; safeguards cover all quests.";
        } catch (error) {
          const code = (error as { code?: string })?.code;
          result.message = code === "credit_balance_exhausted" || code === "insufficient_quota"
            ? "Rules-based focus: the AI provider reports exhausted credits or quota. Restore API billing, then refresh. Your preferences are saved."
            : "Rules-based focus: OpenAI is temporarily unavailable or returned an invalid response. Your preferences are saved.";
          ttl = 60000; // Cache failures too, avoiding a retry storm.
        }
      }
      // Do not retain a result if memory changed/was forgotten while OpenAI was running.
      const [latest, latestQuests, latestDate] = await Promise.all([store.read(id), store.tasks(id), dayFor(id)]);
      if (JSON.stringify(latest) !== JSON.stringify(memory) || JSON.stringify(latestQuests) !== JSON.stringify(quests) || latestDate.day !== day) {
        const safe = rankFocus(latestQuests, latestDate.day, latest); safe.message = "Quests or preferences changed during ranking. Refresh to apply AI.";
        return safe;
      }
      if (cache.size > 1000) cache.delete(cache.keys().next().value!);
      if (cooldown.size > 1000) cooldown.forEach((until, key) => { if (until < Date.now()) cooldown.delete(key); });
      cache.set(id, { hash, until: Date.now() + ttl, result });
      return result;
    })();
    inFlight.set(id, work);
    try { res.json(await work); } finally { inFlight.delete(id); }
  }));
}
