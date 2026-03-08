# yua-admin — CLAUDE SSOT

## Stack
- Next.js 14.2.35 (App Router) + React 18.2.0
- Tailwind 3.4.10 + Zustand v5
- yua-shared (workspace dependency)

## Dev/Build
```bash
pnpm --filter yua-admin dev    # 0.0.0.0:3200
pnpm --filter yua-admin build
pnpm --filter yua-admin lint
```

## Purpose
Internal Admin Console — user management, system health, moderation, support AI, audit logs.

## TS/Paths
- `@/*` → `src/*`
- `yua-shared` → `../yua-shared/src/index.ts`

## API
- Rewrites: `/api/:path*` → `http://127.0.0.1:4000/api/:path*`
