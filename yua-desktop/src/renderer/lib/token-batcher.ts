/**
 * TokenBatcher — rAF-aligned batching for streaming tokens
 *
 * The streaming engine (useChatStream) receives tokens one at a time via SSE.
 * Rendering each token individually causes layout thrashing and dropped frames.
 * TokenBatcher collects tokens and flushes them in batches aligned with
 * requestAnimationFrame for smooth 60fps rendering.
 *
 * Usage:
 *   const batcher = new TokenBatcher((batch) => {
 *     // batch is a string of accumulated tokens
 *     appendToMessage(batch);
 *   });
 *
 *   // On each SSE token:
 *   batcher.push(token);
 *
 *   // When stream ends:
 *   batcher.flush();
 *   batcher.dispose();
 */

type FlushCallback = (batch: string) => void;

export class TokenBatcher {
  private buffer: string[] = [];
  private rafId: number | null = null;
  private callback: FlushCallback;
  private disposed = false;

  // Performance tracking
  private frameCount = 0;
  private lastFpsCheck = 0;
  private currentFps = 60;

  constructor(callback: FlushCallback) {
    this.callback = callback;
  }

  push(token: string): void {
    if (this.disposed) return;
    this.buffer.push(token);

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  private tick(): void {
    this.rafId = null;
    if (this.disposed) return;

    // Flush buffer
    if (this.buffer.length > 0) {
      const batch = this.buffer.join('');
      this.buffer = [];
      this.callback(batch);
    }

    // Track FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsCheck >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsCheck = now;
    }
  }

  /** Force-flush any remaining tokens */
  flush(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.buffer.length > 0) {
      const batch = this.buffer.join('');
      this.buffer = [];
      this.callback(batch);
    }
  }

  /** Get current estimated FPS */
  get fps(): number {
    return this.currentFps;
  }

  /** Clean up */
  dispose(): void {
    this.disposed = true;
    this.flush();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

/**
 * DebouncedUpdater — batches Zustand store updates
 * Prevents multiple setState calls per frame by coalescing patches
 * and applying them on the next animation frame.
 *
 * Usage:
 *   const updater = new DebouncedUpdater<StoreState>((patch) => {
 *     useStore.setState(patch);
 *   });
 *
 *   // Multiple calls within the same frame are merged:
 *   updater.update({ content: 'hello' });
 *   updater.update({ isStreaming: true });
 *   // Only one setState({ content: 'hello', isStreaming: true }) fires
 *
 *   // On cleanup:
 *   updater.dispose();
 */
export class DebouncedUpdater<T> {
  private pending: Partial<T> | null = null;
  private rafId: number | null = null;
  private updater: (patch: Partial<T>) => void;

  constructor(updater: (patch: Partial<T>) => void) {
    this.updater = updater;
  }

  update(patch: Partial<T>): void {
    this.pending = this.pending ? { ...this.pending, ...patch } : { ...patch };

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        if (this.pending) {
          this.updater(this.pending);
          this.pending = null;
        }
      });
    }
  }

  flush(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.pending) {
      this.updater(this.pending);
      this.pending = null;
    }
  }

  dispose(): void {
    this.flush();
  }
}
