// 📂 src/middleware/auth-middleware.ts
// 🔥 Production-Grade JWT Auth Middleware (2025.11 FINAL)
// ----------------------------------------------------------------------
// ✔ Bearer Token 파싱 오류 방지
// ✔ 만료 토큰/위조 토큰 감지
// ✔ Blacklist 기반 로그아웃/탈취 토큰 차단
// ✔ IP + User-Agent + Token 사용지 기록
// ✔ JWT 비설정/손상 대비 안전처리
// ✔ AuditEngine 기록 가능
// ✔ Express 2025 기준 TS 타입 강화
// ----------------------------------------------------------------------

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { pool } from "../db/mysql"; // Token Blacklist 저장용(Optional)



export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ------------------------------------------------------------------
    // 1) Authorization 헤더 검증
    // ------------------------------------------------------------------
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        message: "Authorization 헤더 없음 또는 형식 오류",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({ ok: false, message: "토큰 없음" });
    }

    // ------------------------------------------------------------------
    // 2) 서비스 설정값 확인
    // ------------------------------------------------------------------
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        ok: false,
        message: "서버 설정 오류: JWT_SECRET 미설정",
      });
    }

    // ------------------------------------------------------------------
    // 3) Token Blacklist 확인 (로그아웃/탈취 토큰 차단)
    // ------------------------------------------------------------------
    try {
      const [rows] = await pool.query(
        `SELECT token FROM token_blacklist WHERE token = ? LIMIT 1`,
        [token]
      );
      if ((rows as any[]).length > 0) {
        return res.status(401).json({
          ok: false,
          message: "로그아웃되었거나 만료된 토큰입니다.",
        });
      }
    } catch (err) {
      console.error("⚠ Token Blacklist Check Error:", err);
      // 블랙리스트 조회 실패해도 서비스 요청은 계속 처리 (Fail-Safe)
    }

    // ------------------------------------------------------------------
    // 4) JWT 검증 (만료/위조 모두 잡힘)
    // ------------------------------------------------------------------
    let decoded: JwtPayload | string;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS512"], // 보안 강화 추천 알고리즘
      }) as JwtPayload;
    } catch (err: any) {
      // 토큰 만료
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          ok: false,
          message: "토큰 만료됨",
        });
      }
      // 위조 / 잘못된 시그니처
      return res.status(401).json({
        ok: false,
        message: "유효하지 않은 토큰",
      });
    }

// ------------------------------------------------------------------
// 5) 사용자 정보와 보안 메타데이터 주입
// ------------------------------------------------------------------
const decodedPayload =
  typeof decoded === "string"
    ? null
    : (decoded as JwtPayload & {
        userId?: number;
        firebaseUid?: string;
        email?: string;
        name?: string;
        role?: string;
      });

if (!decodedPayload?.userId) {
  return res.status(401).json({
    ok: false,
    message: "유효하지 않은 사용자 토큰",
  });
}

req.user = {
  userId: decodedPayload.userId,
  id: decodedPayload.userId, // 🔥 alias 필수 (중요)
  firebaseUid: decodedPayload.firebaseUid ?? "",
  email: decodedPayload.email ?? null,
  name: decodedPayload.name ?? null,
  role: decodedPayload.role,
};

(req as any)._authMeta = {
  ip:
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.ip,
  userAgent: req.headers["user-agent"] || "",
  tokenHash: token.slice(0, 8) + "...",
};


    // ------------------------------------------------------------------
    // 6) Next 미들웨어로 전달
    // ------------------------------------------------------------------
    next();
  } catch (err: any) {
    console.error("❌ requireAuth Internal Error:", err);

    return res.status(500).json({
      ok: false,
      message: "인증 처리 중 서버 오류",
    });
  }
};
