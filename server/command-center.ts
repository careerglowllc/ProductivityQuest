import type { Express, RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { commandEntryInput, commandImportSchema, type CommandEntry } from "../shared/command-center";

export interface CommandStore {
  email(userId: string): Promise<string | undefined>;
  list(userId: string): Promise<CommandEntry[]>;
  get(userId: string, id: string): Promise<CommandEntry | undefined>;
  insertOnce(userId: string, entry: CommandEntry): Promise<boolean>;
  update(userId: string, entry: CommandEntry): Promise<boolean>;
  remove(userId: string, id: string): Promise<boolean>;
}

export function registerCommandCenter(app: Express, auth: RequestHandler, store: CommandStore) {
  app.use("/api/command-center", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  app.get("/api/command-center", auth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      res.json((await store.list(userId)).sort((a, b) => b.date.localeCompare(a.date)));
    } catch {
      res.status(500).json({ message: "Could not load your strategy entries. Please retry." });
    }
  });
  app.post("/api/command-center/import", auth, async (req, res) => {
    const parsed = commandImportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid strategy briefing file." });
    try {
      const userId = req.session.userId!;
      const email = await store.email(userId);
      if (email?.trim().toLowerCase() !== parsed.data.ownerEmail.trim().toLowerCase()) {
        return res.status(403).json({ message: "This briefing belongs to a different account. Sign into the account named in the file before importing." });
      }
      const entry: CommandEntry = { ...parsed.data.entry, updatedAt: new Date().toISOString() };
      if (!await store.insertOnce(userId, entry)) {
        return res.status(409).json({ message: "This briefing has already been imported or deleted. Existing entries were not changed." });
      }
      res.status(201).json(entry);
    } catch {
      res.status(500).json({ message: "Could not import your briefing. Please retry." });
    }
  });
  app.post("/api/command-center", auth, async (req, res) => {
    const parsed = commandEntryInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    try {
      const entry: CommandEntry = { ...parsed.data, id: randomUUID(), updatedAt: new Date().toISOString() };
      await store.insertOnce(req.session.userId!, entry);
      res.status(201).json(entry);
    } catch {
      res.status(500).json({ message: "Could not save your entry. Your draft has not been saved." });
    }
  });
  app.patch("/api/command-center/:id", auth, async (req, res) => {
    const parsed = commandEntryInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
    try {
      const userId = req.session.userId!;
      const existing = await store.get(userId, req.params.id);
      if (!existing) return res.status(404).json({ message: "Entry not found." });
      const entry = { ...existing, ...parsed.data, updatedAt: new Date().toISOString() };
      if (!await store.update(userId, entry)) return res.status(404).json({ message: "Entry not found." });
      res.json(entry);
    } catch {
      res.status(500).json({ message: "Could not update your entry. Please retry." });
    }
  });
  app.delete("/api/command-center/:id", auth, async (req, res) => {
    try {
      if (!await store.remove(req.session.userId!, req.params.id)) return res.status(404).json({ message: "Entry not found." });
      res.status(204).end();
    } catch {
      res.status(500).json({ message: "Could not delete your entry. Please retry." });
    }
  });
}
