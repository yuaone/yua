import { Router } from "express";
import multer from "multer";
import * as ctrl from "../control/fs.controller";

const upload = multer();
const r = Router();

r.get("/console/fs/list", ctrl.list);
r.get("/console/fs/tree", ctrl.tree);
r.get("/console/fs/download", ctrl.download);
r.post("/console/fs/upload", upload.single("file"), ctrl.upload);

export default r;
