// 📂 src/control/personalization.controller.ts

import { Request, Response } from "express";
import {
  getWorkspaceUserPersonaFlags,
  upsertWorkspaceUserPersonaFlags,
} from "../db/repo/workspace-user-persona-flags.repo";
import {
  getWorkspaceUserToneSignal,
  upsertWorkspaceUserToneSignal,
} from "../db/repo/workspace-user-tone-signal.repo";

export async function getMePersonalization(req: Request, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.workspace?.id;

  if (!userId || !workspaceId) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const [flags, tone] = await Promise.all([
    getWorkspaceUserPersonaFlags(workspaceId, userId),
    getWorkspaceUserToneSignal(workspaceId, userId),
  ]);

  res.json({
    allowNameCall: flags?.allowNameCall ?? false,
    allowPersonalTone: flags?.allowPersonalTone ?? false,
    displayName: tone?.name ?? null,
  });
}

export async function postMePersonalization(req: Request, res: Response) {
  const userId = req.user?.id;
  const workspaceId = req.workspace?.id;

  if (!userId || !workspaceId) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const { allowNameCall, allowPersonalTone, displayName } = req.body ?? {};

  // 1) displayName -> tone signal (workspace scoped)
  if (typeof displayName === "string") {
    const name = displayName.trim();
    await upsertWorkspaceUserToneSignal(workspaceId, userId, {
      name: name.length > 0 ? name : null,
      toneCapability: name.length > 0 ? "named" : "anonymous",
    });
  }

  // 2) persona flags (workspace scoped)
  await upsertWorkspaceUserPersonaFlags(workspaceId, userId, {
    allowNameCall: Boolean(allowNameCall),
    allowPersonalTone: Boolean(allowPersonalTone),
  });

  res.status(204).end();
}
