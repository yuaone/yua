import { Request, Response } from "express";
import { enginePrisma as prisma } from "../db/engine-prisma";
import { terminalEngine } from "../ai/engines/terminal-engine";

/**
 * POST /terminal/token
 * Console → AI
 */
export async function issueTerminalToken(req: Request, res: Response) {
  try {
    const { instanceId } = req.body;
    if (!instanceId) {
      return res.status(400).json({ ok: false, error: "INSTANCE_ID_REQUIRED" });
    }

    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
      include: { policy: true },
    });

    if (!instance) {
      return res.status(404).json({ ok: false, error: "INSTANCE_NOT_FOUND" });
    }

    if (instance.status !== "RUNNING") {
      return res
        .status(400)
        .json({ ok: false, error: "INSTANCE_NOT_RUNNING" });
    }

    if (!instance.policy?.allowTerminal) {
      return res
        .status(403)
        .json({ ok: false, error: "TERMINAL_NOT_ALLOWED" });
    }

    const userId =
      (req as any).user?.id ??
      ((req as any).ownerLevel1 ? "owner" : "unknown");

    const session = await terminalEngine.issue({
      instanceId,
      userId,
      scope: "ssh",
    });

    return res.json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt.getTime(),
    });
  } catch (err) {
    console.error("[TERMINAL TOKEN ERROR]", err);
    return res.status(500).json({ ok: false, error: "TOKEN_ISSUE_FAILED" });
  }
}

/**
 * POST /terminal/verify
 * Agent → AI
 */
export async function verifyTerminalToken(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ ok: false, error: "TOKEN_REQUIRED" });
  }

  const session = await terminalEngine.verify(token);
  if (!session) {
    return res.status(401).json({ ok: false, error: "INVALID_TOKEN" });
  }

  return res.json({ ok: true, session });
}

/**
 * POST /terminal/revoke
 */
export async function revokeTerminalToken(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ ok: false, error: "TOKEN_REQUIRED" });
  }

  await terminalEngine.revoke(token);
  return res.json({ ok: true });
}
