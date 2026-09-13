#!/usr/bin/env python3
"""YUA 환경 진단 — 이 출력을 그대로 붙여넣으면 원인을 짚어드립니다."""
import os, platform, shutil, subprocess, sys

def run(cmd):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=20)
        return (r.stdout + r.stderr).strip()[:600] or "(출력 없음)"
    except Exception as e:
        return f"(실패: {e})"

print("=" * 52)
print("OS        :", platform.system(), platform.release(), platform.machine())
print("Python    :", sys.version.split()[0])
print("CPU 코어   :", os.cpu_count())

# 메모리 — 플랫폼별
mem = "알 수 없음"
try:
    if platform.system() == "Darwin":
        mem = f"{int(run('sysctl -n hw.memsize')) / 1024**3:.1f} GB"
    elif platform.system() == "Linux":
        with open("/proc/meminfo") as f:
            kb = int(f.readline().split()[1])
        mem = f"{kb / 1024**2:.1f} GB"
    elif platform.system() == "Windows":
        out = run("wmic computersystem get TotalPhysicalMemory")
        num = "".join(c for c in out if c.isdigit())
        mem = f"{int(num) / 1024**3:.1f} GB" if num else out
except Exception as e:
    mem = f"(실패: {e})"
print("RAM       :", mem)

print("디스크 여유:", f"{shutil.disk_usage(os.path.expanduser('~')).free / 1024**3:.1f} GB")
print("-" * 52)

ollama = shutil.which("ollama")
print("ollama    :", ollama or "❌ 설치 안 됨")
if ollama:
    print("버전      :", run("ollama --version"))
    print("서버      :", "✅ 응답" if "NAME" in run("ollama list") or run("ollama list") == "(출력 없음)"
          else "❌ 안 돎 → `ollama serve` 필요")
    print("받은 모델 :\n" + run("ollama list"))
print("-" * 52)
for pkg in ("llama_cpp", "faster_whisper", "sounddevice", "numpy", "torch"):
    try:
        __import__(pkg); print(f"  ✅ {pkg}")
    except ImportError:
        print(f"  ⬜ {pkg} (미설치)")
print("=" * 52)
