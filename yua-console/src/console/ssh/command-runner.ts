// src/console/ssh/command-runner.ts

export interface CommandRunnerOptions {
  onData?: (data: string) => void;
  onExit?: (code: number) => void;
}

export class CommandRunner {
  private socket: WebSocket | null = null;

  run(command: string, opts: CommandRunnerOptions = {}) {
    this.socket = new WebSocket("ws://localhost:3000/api/ws/ssh");

    this.socket.onopen = () => {
      this.socket?.send(JSON.stringify({ type: "exec", command }));
    };

    this.socket.onmessage = (msg) => {
      const payload = JSON.parse(msg.data);

      if (payload.type === "stdout" && opts.onData) {
        opts.onData(payload.data);
      }

      if (payload.type === "exit" && opts.onExit) {
        opts.onExit(payload.code);
      }
    };

    this.socket.onerror = (err) => {
      console.error("[Runner] WebSocket error", err);
    };

    this.socket.onclose = () => {
      console.log("[Runner] closed");
    };
  }

  sendInput(input: string) {
    this.socket?.send(JSON.stringify({ type: "stdin", data: input }));
  }

  stop() {
    this.socket?.close();
  }
}

// ------------------------------
// FUNCTION API (Terminal.tsx에서 요구)
// ------------------------------
export function runSSHCommand(ws: WebSocket, command: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(
    JSON.stringify({
      type: "exec",
      command,
    })
  );
}
