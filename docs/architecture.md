# YUA Architecture Map

## Domain Boundaries

```
yua-web        → Next.js 14 App Router, consumer-facing chat/studio UI
yua-backend    → Express 4 API server, AI orchestration, SSE streaming
yua-shared     → Types & contracts SSOT (all packages import from here)
yua-mobile     → Expo SDK 54 + React Native, mobile chat app
yua-platform   → (NEW) Platform admin dashboard (billing, analytics, moderation)
yua-admin      → (NEW) Internal ops console (user management, system health)
yua-desktop    → (NEW) Electron/Tauri desktop app
yua-console    → Developer console (API keys, usage)
yua-sdk        → Node.js SDK
yua-sdk-python → Python SDK
```

## Dependency Rules (Hard Invariants)

1. **yua-shared is the ONLY source of truth** for types/contracts
2. All packages depend on yua-shared; yua-shared depends on nothing
3. Frontend packages (web, mobile, desktop) NEVER import from yua-backend
4. Backend NEVER imports from frontend packages
5. SDK packages are standalone — they depend only on yua-shared types

## Database Architecture

| DB         | Engine     | Port | Purpose                                    |
|------------|------------|------|--------------------------------------------|
| PostgreSQL | pgvector   | 5432 | Main: chat, workspaces, projects, memory   |
| MySQL      | InnoDB     | 3306 | Users, VMs, snapshots, stream events       |
| Redis      | 7.x       | 6379 | Cache, presence, rate limiting, sessions   |

### Key Tables (PostgreSQL — Prisma)
- `chat_threads`, `chat_messages` — trace_id tracking
- `workspaces`, `workspace_users`, `workspace_memory_state`
- `projects`, `project_members`
- `engine_instances`, `instance_engines`, `instance_policies`
- Tier tables: `cpu_tiers`, `node_tiers`, `engine_tiers`, `qpu_tiers`, `omega_tiers`

### Key Tables (MySQL)
- `users` — Firebase UID mapping, SSOT for userId
- VMs, snapshots, stream events

## Auth Flow

```
Client → Authorization: Bearer <firebase-id-token>
  → requireFirebaseAuth middleware
    → firebaseAuth.verifyIdToken()
    → MySQL users table lookup (firebase_uid)
    → req.user = { userId, firebaseUid, email, name, role }
  → withWorkspace middleware
    → x-workspace-id header → workspace role lookup
    → fallback: auto-create personal workspace
    → req.workspace = { id, role }
```

### Auth States (Frontend)
`booting` | `guest` | `guest_booting` | `authed` | `onboarding_required`

## AI Pipeline

```
User message
  → chat-controller.ts (decision orchestrator)
    → path: NORMAL | SEARCH | SPINE | DEEP_THINKING | STUDIO
    → forceSearch detection (regex + intent)
  → execution-engine.ts
    → provider-selector.ts (Claude / GPT / Gemini routing)
    → tool execution (file analysis, quant, search, etc.)
  → StreamEngine → SSE events → Frontend store → UI
```

### SSE Event Types
`stage` | `token` | `final` | `suggestion` | `done` | `reasoning_block` | `reasoning_done` | `answer_unlocked` | `activity`

## Middleware Stack (Order Matters)
```
autoEngineDB → requireFirebaseAuth → withWorkspace → checkUsageLimit → aiEngineLimiter → rateLimit → router
```

## Deployment
- Server: `0.0.0.0:4000` (PM2: `yua-engine`)
- Web: `0.0.0.0:3000` (PM2: `yua-web`)
- Build then restart (atomic): `pnpm build && pm2 restart <name>`
- Domain: yuaone.com
