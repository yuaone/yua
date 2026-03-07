import { Router } from "express";
import { proController } from "../../control/yua/pro-controller";

const router = Router();

/** 
 * YUA Pro Mode (HPE + Memory)
 */
router.post("/", proController.run);

export default router;
