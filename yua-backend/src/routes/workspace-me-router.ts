import { Router } from "express";
import { requireFirebaseAuth } from "../auth/auth.express";
import { withWorkspace } from "../middleware/with-workspace";
import {
  getMePersonalization,
  postMePersonalization,
} from "../control/personalization.controller";

const router = Router();

// 🔒 SSOT: auth → workspace
router.use(requireFirebaseAuth);
router.use(withWorkspace);

router.get("/personalization", getMePersonalization);
router.post("/personalization", postMePersonalization);

export default router;