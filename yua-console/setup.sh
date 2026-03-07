# ================================================
# YUA CONSOLE – SSOT v5.1 구조 자동 생성 스크립트
# root → bottom 순서로 mkdir + touch
# ================================================

mkdir -p yua-console
cd yua-console

# Root Files
touch package.json next.config.js tsconfig.json .env .gitignore

# Public
mkdir -p public/icons
mkdir -p public/fonts
mkdir -p public/glass
touch public/glass/bg-blur.png

# Icons (placeholder files)
touch public/icons/yua-logo.svg
touch public/icons/user.svg
touch public/icons/bot.svg
touch public/icons/copy.svg
touch public/icons/stop.svg
touch public/icons/refresh.svg
touch public/icons/branch.svg

# SRC ROOT
mkdir -p src

# ================================================
# APP ROUTER
# ================================================
mkdir -p src/app
touch src/app/layout.tsx
touch src/app/page.tsx

# API routes
mkdir -p src/app/api/chat/stream
mkdir -p src/app/api/chat/save
mkdir -p src/app/api/chat/load
mkdir -p src/app/api/chat/list
mkdir -p src/app/api/chat/regen

mkdir -p src/app/api/auth/login
mkdir -p src/app/api/auth/register

mkdir -p src/app/api/billing/toss
mkdir -p src/app/api/keys/create

touch src/app/api/chat/stream/route.ts
touch src/app/api/chat/save/route.ts
touch src/app/api/chat/load/route.ts
touch src/app/api/chat/list/route.ts
touch src/app/api/chat/regen/route.ts

touch src/app/api/auth/login/route.ts
touch src/app/api/auth/register/route.ts

touch src/app/api/billing/toss/route.ts
touch src/app/api/keys/create/route.ts

# Console Page
mkdir -p src/app/console
touch src/app/console/page.tsx

# ================================================
# COMPONENTS
# ================================================
mkdir -p src/components/chat
mkdir -p src/components/sidebar
mkdir -p src/components/console
mkdir -p src/components/ui
mkdir -p src/components/layout

touch src/components/chat/ChatContainer.tsx
touch src/components/chat/VirtualizedMessages.tsx
touch src/components/chat/ChatMessageItem.tsx
touch src/components/chat/ChatStreamRenderer.tsx
touch src/components/chat/ChatInput.tsx
touch src/components/chat/ChatActions.tsx
touch src/components/chat/MarkdownRenderer.tsx
touch src/components/chat/MessageBranchLine.tsx
touch src/components/chat/MessageCopyButton.tsx
touch src/components/chat/CodeCopyButton.tsx

touch src/components/sidebar/RightSidebar.tsx
touch src/components/sidebar/SidebarTabs.tsx
touch src/components/sidebar/AuthPanel.tsx
touch src/components/sidebar/BillingPanel.tsx
touch src/components/sidebar/KeysPanel.tsx
touch src/components/sidebar/UsagePanel.tsx

touch src/components/console/Terminal.tsx
touch src/components/console/ShellToggle.tsx
touch src/components/console/ShellStatus.tsx

touch src/components/ui/GlassPanel.tsx
touch src/components/ui/IconButton.tsx
touch src/components/ui/Loader.tsx

touch src/components/layout/Header.tsx

# ================================================
# HOOKS
# ================================================
mkdir -p src/hooks
touch src/hooks/useChatStream.ts
touch src/hooks/useChatState.ts
touch src/hooks/useChatHistory.ts
touch src/hooks/useSidebar.ts
touch src/hooks/useTerminal.ts

# ================================================
# LIB
# ================================================
mkdir -p src/lib
touch src/lib/api.ts
touch src/lib/auth.ts
touch src/lib/markdown.ts
touch src/lib/streamer.ts
touch src/lib/virtualization.ts
touch src/lib/storage.ts

# ================================================
# TERMINAL ENGINE
# ================================================
mkdir -p src/terminal
touch src/terminal/renderer.ts
touch src/terminal/highlighter-bash.ts
touch src/terminal/highlighter-qgml.ts
touch src/terminal/parser-utils.ts

# ================================================
# DUAL SHELL SUBSYSTEM
# ================================================
mkdir -p src/console/ssh
mkdir -p src/console/yua-shell

touch src/console/ssh/session-manager.ts
touch src/console/ssh/connection.ts
touch src/console/ssh/command-runner.ts
touch src/console/ssh/switcher.ts

touch src/console/yua-shell/tokenizer.ts
touch src/console/yua-shell/parser.ts
touch src/console/yua-shell/ast.ts
touch src/console/yua-shell/symbol-resolver.ts
touch src/console/yua-shell/intent-builder.ts
touch src/console/yua-shell/executor.ts
touch src/console/yua-shell/supervisor.ts

# ================================================
# STYLES
# ================================================
mkdir -p src/styles
touch src/styles/globals.css
touch src/styles/chat.css
touch src/styles/sidebar.css
touch src/styles/terminal.css

# ================================================
# TYPES
# ================================================
mkdir -p src/types
touch src/types/chat.ts
touch src/types/message.ts
touch src/types/user.ts
touch src/types/apikey.ts
touch src/types/billing.ts

# END
echo "YUA Console SSOT structure created successfully."
