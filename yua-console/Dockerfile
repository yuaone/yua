# ==================================================================
# YUA OS — SSOT v6.2 FINAL
# Debian Slim + Node + Python + QGML + Engines + C Runtime + TS Build
# ==================================================================
FROM debian:bookworm-slim

# --------------------------------------------------
# 1. System base
# --------------------------------------------------
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && apt-get upgrade -y

RUN apt-get install -y \
    curl wget git unzip vim nano tmux htop ca-certificates \
    build-essential pkg-config python3 python3-pip python3-venv \
    openssl

# --------------------------------------------------
# 2. Install Node.js 20.x
# --------------------------------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# --------------------------------------------------
# 3. Filesystem Layout
# --------------------------------------------------
RUN mkdir -p /yua \
    /yua/models \
    /yua/workspace \
    /yua/runtime \
    /yua/runtime/yua-shell \
    /yua/runtime/yua-c \
    /yua/tmp

WORKDIR /yua

# --------------------------------------------------
# 4. Copy runtime (TS source)
# --------------------------------------------------
COPY ./src/lib/yua-shell /yua/runtime/yua-shell
COPY ./src/lib/yua-c /yua/runtime/yua-c

# Copy tsconfig for shell build
COPY ./src/lib/yua-shell/tsconfig.shell.json /yua/runtime/yua-shell/tsconfig.shell.json
COPY ./src/lib/yua-shell/build-shell.sh /yua/runtime/yua-shell/build-shell.sh

RUN chmod +x /yua/runtime/yua-shell/build-shell.sh

# --------------------------------------------------
# 5. Install Node deps (runtime only)
# --------------------------------------------------
COPY package.json /yua/
RUN npm install --production

# --------------------------------------------------
# 6. Build C Engine (NAPI)
# --------------------------------------------------
WORKDIR /yua/runtime/yua-c/ffi
RUN apt-get install -y cmake make g++ && \
    npm install && \
    npm run build || true

# return workdir
WORKDIR /yua

# --------------------------------------------------
# 7. Install TypeScript Compiler
# --------------------------------------------------
RUN npm install -g typescript

# --------------------------------------------------
# 8. Build YUA Shell (TS → JS)
# --------------------------------------------------
WORKDIR /yua/runtime/yua-shell
RUN /yua/runtime/yua-shell/build-shell.sh

# --------------------------------------------------
# 9. Python venv for LLM
# --------------------------------------------------
RUN python3 -m venv /yua/pyenv
ENV PATH="/yua/pyenv/bin:$PATH"

RUN pip install --upgrade pip setuptools wheel

# --------------------------------------------------
# 10. Environment variables
# --------------------------------------------------
ENV YUA_MODE="runtime"
ENV YUA_HOME="/yua"
ENV MODELS_DIR="/yua/models"
ENV WORKSPACE_DIR="/yua/workspace"

# --------------------------------------------------
# 11. Startup command (run compiled JS)
# --------------------------------------------------
CMD ["node", "/yua/dist/yua-shell/server/server.js"]
