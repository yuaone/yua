# YUA Product Specification

## Vision
AI-powered workspace platform with chat, studio, and enterprise features.

## Products

### yua-web (Production)
Consumer-facing web app at yuaone.com.
- Chat with AI (streaming, thinking visualization, deep thinking drawer)
- Multi-workspace support with team management
- Studio: image/document/video generation (WIP)
- Billing: free/premium/developer/business/enterprise tiers
- Auth: Firebase (Google, email) + guest sessions
- Dark mode, mobile responsive

### yua-backend (Production)
API server powering all clients.
- 5 AI modes: basic, pro, spine, assistant, dev
- Multi-engine: research, doc, security, identity, agent, task, video, audio, voice
- SSE streaming with thinking/activity visualization
- File analysis (CSV, Excel, PDF, images)
- Memory system (commit, retrieve, deduplicate)
- Workspace/team/billing management

### yua-mobile (Beta)
Expo SDK 54 mobile app.
- Full chat with streaming
- Dark mode, deep thinking drawer
- Attachments, settings
- Needs: dev build for Google Sign-In, Firebase persistence

### yua-platform (Planned)
Platform admin dashboard for business operations.
- User/workspace analytics
- Content moderation
- Billing/subscription management
- System health monitoring
- AI usage analytics

### yua-admin (Planned)
Internal ops console.
- User management (ban, role changes)
- System configuration
- Database operations
- Log viewer
- Incident response tools

### yua-desktop (Planned)
Desktop application (Electron or Tauri).
- Reuses ~72% of yua-web components
- Native file system access
- System tray integration
- Offline capabilities (planned)

### yua-console (Existing)
Developer console for API access.
- API key management
- Usage monitoring
- SDK documentation

### yua-sdk / yua-sdk-python (Existing)
SDKs for third-party integration.
- Chat thread management
- SSE streaming with event listeners
- Model selection, workspace isolation
- Extensibility: custom auth, stream events, abort

## Implementation Priority

### Phase 0: Security Hotfixes (DONE)
- JWT fallback removal
- CORS whitelist

### Phase 1: Platform Core
- yua-platform skeleton (Next.js 14)
- User analytics dashboard
- Workspace/billing overview

### Phase 2: Payments & Admin
- Payment integration (Stripe/Toss)
- yua-admin basic ops console
- Moderation tools

### Phase 3: Support AI & Desktop
- AI-powered support chat in platform
- yua-desktop MVP (Electron + yua-web reuse)

### Phase 4: Hardening
- Full security audit
- Performance optimization
- Database consolidation planning
