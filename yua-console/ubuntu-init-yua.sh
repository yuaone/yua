#!/usr/bin/env bash
set -e

echo "==============================================="
echo " YUA ONE — Ubuntu Host OS Init Script (SSOT v6.0)"
echo "==============================================="

# -------------------------------------------------------------
# 0. Root check
# -------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
  echo "❌ Please run as root (sudo)."
  exit 1
fi

# -------------------------------------------------------------
# 1. System Update
# -------------------------------------------------------------
echo "🔄 Updating system packages..."
apt update -y && apt upgrade -y

# Core packages
apt install -y \
  curl wget git unzip htop tmux vim nano \
  build-essential ca-certificates apt-transport-https \
  software-properties-common ufw

echo "✔ System base ready"


# -------------------------------------------------------------
# 2. Docker Installation
# -------------------------------------------------------------
echo "🐳 Installing Docker Engine..."

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) stable"

apt update -y
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "✔ Docker installed"


# -------------------------------------------------------------
# 3. NVIDIA GPU Support (Optional)
# -------------------------------------------------------------
if command -v nvidia-smi &> /dev/null; then
  echo "⚡ NVIDIA GPU detected, installing CUDA container toolkit"
  distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
    sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit.gpg

  curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sudo sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

  apt update -y
  apt install -y nvidia-container-toolkit

  nvidia-ctk runtime configure --runtime=docker
  systemctl restart docker

  echo "✔ NVIDIA container runtime configured"
else
  echo "ℹ️ No GPU detected — skipping NVIDIA setup"
fi


# -------------------------------------------------------------
# 4. Firewall (UFW) Setup
# -------------------------------------------------------------
echo "🛡 Configuring firewall..."

ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp

# YUA Shell (default)
ufw allow 4000/tcp

# Web app (Next.js)
ufw allow 3000/tcp

ufw --force enable

echo "✔ Firewall configured"


# -------------------------------------------------------------
# 5. YUA Directory Structure
# -------------------------------------------------------------
echo "📁 Creating YUA system directories..."

mkdir -p /opt/yua/logs
mkdir -p /opt/yua/snapshots
mkdir -p /opt/yua/config
mkdir -p /opt/yua/instances
mkdir -p /opt/yua/models
mkdir -p /opt/yua/workspace

chmod -R 755 /opt/yua

echo "✔ YUA directories prepared"


# -------------------------------------------------------------
# 6. YUA OS — Docker Pull (Optional first image)
# -------------------------------------------------------------
echo "🐳 Preparing YUA OS base image (Debian Slim + Node)..."

cat <<EOF > /opt/yua/YUA-OS.Dockerfile
FROM debian:stable-slim

RUN apt update && apt install -y \\
    nodejs npm python3 build-essential git curl && \\
    apt clean

WORKDIR /yua

# Runtime folders
RUN mkdir -p /yua/models /yua/workspace /yua/runtime

# Default entry
CMD ["bash"]
EOF

echo "✔ YUA OS base Dockerfile created"


# -------------------------------------------------------------
# 7. Systemd service for YUA Shell (optional)
# -------------------------------------------------------------
echo "🔧 Installing YUA Shell systemd service..."

cat <<EOF >/etc/systemd/system/yua-shell.service
[Unit]
Description=YUA ONE Shell Runtime
After=network.target docker.service

[Service]
Type=simple
Restart=always
WorkingDirectory=/opt/yua
ExecStart=/usr/bin/docker run --rm -p 4000:4000 yua-os
ExecStop=/usr/bin/docker stop yua-os

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable yua-shell

echo "✔ systemd service installed (disabled until build)"


# -------------------------------------------------------------
# 8. Final message
# -------------------------------------------------------------
echo "==============================================="
echo "🎉 Ubuntu Host OS Ready for YUA ONE Runtime!"
echo " Run your YUA OS build:"
echo "   cd /opt/yua"
echo "   docker build -t yua-os -f YUA-OS.Dockerfile ."
echo ""
echo " Start YUA Shell service:"
echo "   sudo systemctl start yua-shell"
echo ""
echo " Logs:"
echo "   journalctl -u yua-shell -f"
echo "==============================================="

exit 0
