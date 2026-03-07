import { Router } from "express";
import { spineController } from "../../control/yua/spine-controller";

const router = Router();

/** 
 * YUA SPINE Mode (Omega + Quantum)
 */
router.post("/", spineController.run);

export default router;
