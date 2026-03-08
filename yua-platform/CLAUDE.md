# yua-platform — CLAUDE SSOT

## Stack
- Next.js 14.2.35 (App Router) + React 18.2.0
- Tailwind 3.4.10 + Zustand v5
- yua-shared (workspace dependency)

## Dev/Build
```bash
pnpm --filter yua-platform dev    # 0.0.0.0:3100
pnpm --filter yua-platform build
pnpm --filter yua-platform lint
```

## Purpose
Developer Platform — API key management, billing dashboard, SDK docs, usage analytics.

## TS/Paths
- `@/*` → `src/*`
- `yua-shared` → `../yua-shared/src/index.ts`

## API
- Rewrites: `/api/:path*` → `http://127.0.0.1:4000/api/:path*`
