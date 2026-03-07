import swaggerJsdoc from "swagger-jsdoc";
import { swaggerDefinition } from "./swagger";
import path from "path";

const options = {
  definition: swaggerDefinition,

  // 🔥 모든 라우트 스캔 (ts & js)
  apis: [
    path.join(__dirname, "../routes/*.ts"),
    path.join(__dirname, "../routes/*.js"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
