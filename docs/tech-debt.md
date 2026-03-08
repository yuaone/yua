# YUA Tech Debt & Known Issues

## Security (P0 - Fixed)

### S1: JWT Fallback Secret (FIXED 2026-03-08)
- **Was**: `process.env.JWT_SECRET || "yua-secret"` in identity-engine.ts and dev-auth-controller.ts
- **Fix**: Hard crash if JWT_SECRET env var missing. No fallback.
- Files: `identity-engine.ts`, `dev-auth-controller.ts`

### S2: CORS Wildcard (FIXED 2026-03-08)
- **Was**: `origin: "*"` in server.ts
- **Fix**: Whitelist: yuaone.com, www.yuaone.com, platform.yuaone.com, admin.yuaone.com + localhost in dev
- File: `server.ts`

## Security (P1 - Pending)

### A1: Rate Limiting
- AI endpoints have `aiEngineLimiter` but verify coverage on all routes
- Check if Redis-backed rate limiter handles distributed deployments

### A8: Missing Input Validation
- File upload size/type validation needed at route level
- Chat message length validation before AI processing

### A6: Error Information Leakage
- Stack traces in production error responses
- DB query errors exposed to client

## Architecture Debt

### D1: Dual Database (MySQL + PostgreSQL)
- Users in MySQL, everything else in PostgreSQL
- Cross-DB joins impossible, requires app-level joining
- Migration plan: consolidate to PostgreSQL

### D2: No Request Tracing
- trace_id exists for chat but not for general API requests
- Add correlation IDs for debugging

### D3: Memory System Incomplete
- Phase 1 done (commit engine, stream emitter, router)
- Phases 2-5 pending (UI rewrite, DB migration, advanced retrieval)

## Frontend Debt

### F1: Chat Layout Shake (FIXED 2026-03-08)
- **Was**: `transition-all duration-200` on message container caused shake on refresh
- **Fix**: Removed transition from layout container
- File: `ChatMain.tsx`

### F2: Mermaid Korean Text
- Korean text in Mermaid diagrams causes syntax errors
- Need: escape or sanitize Korean labels before rendering

### F3: Studio Pages (WIP)
- `/studio/image`, `/studio/document`, `/studio/video` — structure only
- `/project/[id]` returns null

## Mobile Debt

### M1: Google Sign-In Requires Dev Build
- Expo Go can't use native Google Sign-In module
- Need: `npx expo run:android` development build

### M2: Firebase Persistence
- `getReactNativePersistence` not in default firebase/auth export
- Sessions don't persist (memory-only)
- Not a crash, but UX issue (re-login on every app restart)
