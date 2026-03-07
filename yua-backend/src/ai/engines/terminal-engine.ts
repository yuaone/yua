import crypto from "crypto";
import { enginePrisma } from "../../db/engine-prisma";

const TTL_SECONDS = Number(process.env.TERMINAL_TOKEN_TTL || 300);

export type IssueParams = {
  instanceId: string;
  userId: string;
  scope: "ssh";
};

class TerminalEngine {
  async issue(params: IssueParams) {
    const token = `term_${crypto.randomBytes(24).toString("hex")}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000);

    const session = await enginePrisma.terminalSession.create({
      data: {
        token,
        instanceId: params.instanceId,
        userId: params.userId,
        scope: params.scope,
        expiresAt,
      },
    });

    return session;
  }

  async verify(token: string) {
    const session = await enginePrisma.terminalSession.findUnique({
      where: { token },
    });

    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await this.revoke(token);
      return null;
    }

    await enginePrisma.terminalSession.update({
      where: { token },
      data: { lastVerifiedAt: new Date() },
    });

    return session;
  }

  async revoke(token: string) {
    await enginePrisma.terminalSession.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }
}

export const terminalEngine = new TerminalEngine();
