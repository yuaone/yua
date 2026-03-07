import { Response, Request } from "express";
import { ThreadEngine } from "../ai/engines/thread.engine";

export const threadController = {
  async list(req: Request, res: Response) {
    if (!req.user || !req.workspace) {
      return res.status(401).json({ ok: false });
    }

    const projectId =
      typeof req.query?.projectId === "string"
        ? req.query.projectId
        : null;

    const threads = await ThreadEngine.listThreads({
      userId: req.user.userId,
      workspaceId: req.workspace.id, // 🔥 필수
      projectId,
    });

    return res.json({
      ok: true,
      threads: threads.map((t) => ({
        id: String(t.id),
        title: t.title,
        projectId: t.project_id ?? null,
        createdAt: new Date(t.created_at).getTime(),
      })),
    });
  },

  async create(req: Request, res: Response) {
    if (!req.user || !req.workspace) {
      return res.status(401).json({ ok: false });
    }

    const title =
      typeof req.body?.title === "string" && req.body.title.length > 0
        ? req.body.title
        : "New Chat";

    const projectId =
      typeof req.body?.projectId === "string"
        ? req.body.projectId
        : null;

    const threadId = await ThreadEngine.createThread({
      userId: req.user.userId,
      workspaceId: req.workspace.id, // 🔥 추가
      title,
      projectId,
    });

    return res.json({ ok: true, threadId });
  },

  async rename(req: Request, res: Response) {
    if (!req.user || !req.workspace) {
      return res.status(401).json({ ok: false });
    }

    const threadId = Number(req.params.id);
    const title = req.body?.title;

    if (!threadId || typeof title !== "string") {
      return res.status(400).json({ ok: false });
    }

    const ok = await ThreadEngine.renameThread(
      threadId,
      req.user.userId,
      req.workspace.id, // 🔥 추가
      title
    );

    return ok
      ? res.json({ ok: true })
      : res.status(404).json({ ok: false });
  },

  async remove(req: Request, res: Response) {
    if (!req.user || !req.workspace) {
      return res.status(401).json({ ok: false });
    }

    const threadId = Number(req.params.id);
    if (!threadId) {
      return res.status(400).json({ ok: false });
    }

    const ok = await ThreadEngine.deleteThread(
      threadId,
      req.user.userId,
      req.workspace.id // 🔥 추가
    );

    return ok
      ? res.json({ ok: true })
      : res.status(404).json({ ok: false });
  },
};
