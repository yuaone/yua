#!/bin/bash

echo "🚀 YUA Console — SSOT Folder Structure Auto Setup 시작합니다..."

# components
mkdir -p src/components/chat
mkdir -p src/components/sidebar
mkdir -p src/components/console
mkdir -p src/components/ui
mkdir -p src/components/layout

# hooks
mkdir -p src/hooks

# lib
mkdir -p src/lib

# types
mkdir -p src/types

# styles (이미 있을 수 있음)
mkdir -p src/styles

# terminal
mkdir -p src/terminal

# console subsystems
mkdir -p src/console/ssh
mkdir -p src/console/yua-shell

echo "✔ SSOT 폴더 구조 생성 완료!"
echo "----------------------------------------"
echo "생성된 폴더:"
echo "src/components/chat/"
echo "src/components/sidebar/"
echo "src/components/console/"
echo "src/components/ui/"
echo "src/components/layout/"
echo "src/hooks/"
echo "src/lib/"
echo "src/types/"
echo "src/styles/"
echo "src/terminal/"
echo "src/console/ssh/"
echo "src/console/yua-shell/"
echo "----------------------------------------"
echo "🎉 모든 폴더 자동 생성 완료! 이제 파일만 채우면 됩니다!"
