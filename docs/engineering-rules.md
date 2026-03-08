# YUA Engineering Rules (Hard Invariants)

## Package Manager
- pnpm 10.26.2 ONLY (root `packageManager` field is SSOT)
- NEVER install pnpm globally or change version
- NEVER use npm/yarn
- `pnpm --filter <pkg> add <dep>` for package-specific deps

## Types & Contracts
- yua-shared is the SINGLE SOURCE OF TRUTH
- NEVER duplicate types across packages
- Import from `yua-shared` or `yua-shared/*`
- Changes to shared types require checking all consumers

## Stack Rules
- TypeScript everywhere (ES2020, Node16 module resolution)
- React 18.2.0 in yua-web (NOT React 19)
- React 19.1.0 in yua-mobile (Expo SDK 54)
- Zustand v5 for state management
- Firebase for auth (Admin SDK on backend, client SDK on frontend)

## UI Rules
- CSS variables for theming (var(--surface-*), var(--text-*), var(--line), etc.)
- Dark mode: `html.dark` class + CSS variables + `dark:` utilities
- No `transition-all` on layout containers (causes shake on hydration)
- `scrollbarGutter: "stable"` on scroll containers for consistent width
- Mobile-first responsive: mobile → tablet (768-1023px) → desktop (1024px+)

## Deploy Rules
- ALWAYS build before restart (prevents CSS/JS 404)
- PM2 names: `yua-engine` (backend), `yua-web` (frontend)
- Never hot-reload in production
- Verify `JWT_SECRET` env var exists (no fallback allowed)

## Security Rules
- NO hardcoded secrets or fallback secrets
- CORS: whitelist specific origins (no `origin: "*"` in production)
- Firebase token verification on all auth-required routes
- Rate limiting on AI endpoints
- Input validation at system boundaries

## Code Style
- No over-engineering; minimum complexity for current task
- No premature abstractions
- Korean comments are acceptable (team language)
- Prefer editing existing files over creating new ones

## Git Rules
- Never force-push to main
- Never skip hooks
- Lockfile changes only via pnpm commands
- Commit messages: concise, focus on "why"

## SSE Rules
- `X-Accel-Buffering: no` header always set
- ETag disabled on Express app
- Keep-alive ping every 15 seconds
- Never buffer SSE responses
