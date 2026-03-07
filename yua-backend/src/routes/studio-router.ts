import { Router } from "express";
import { studioAssetController } from "../control/studio-asset-controller";

const router = Router();

router.get("/assets/:assetId", studioAssetController.getAsset);
router.get("/images", studioAssetController.listImages);
router.post("/assets/:assetId/execute", studioAssetController.executeAsset);
router.get("/assets/:assetId/download", studioAssetController.download);

export default router;
