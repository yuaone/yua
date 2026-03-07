
// 📂 src/routes/swagger-json.ts
// Swagger JSON Export for YUA ONE

import { Router } from "express";
import swaggerUi from "swagger-ui-express";

// swaggerSpec 생성부 가져오기
// 보통 swagger-ui-express setup에 들어간 swaggerSpec을 import해야 함
// 정원 프로젝트에서는 swagger.json 파일이 없으므로 external 파일로 생성 필요

const swaggerSpec = require("../../swagger.json"); // ← swagger.json 파일 필요

const router = Router();

// /api/docs/swagger.json
router.get("/docs/swagger.json", (req, res) => {
  res.header("Content-Type", "application/json");
  res.send(swaggerSpec);
});

export default router;
