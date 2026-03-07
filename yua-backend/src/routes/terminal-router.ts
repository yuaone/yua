import { Router } from "express";
import {
  issueTerminalToken,
  verifyTerminalToken,
  revokeTerminalToken,
} from "../control/terminal-controller";
import { ownerAuth } from "../middleware/owner-auth";

const router = Router();

router.post("/terminal/token", ownerAuth, issueTerminalToken);
router.post("/terminal/verify", verifyTerminalToken);
router.post("/terminal/revoke", ownerAuth, revokeTerminalToken);

export default router;
