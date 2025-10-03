// Framework-agnostic auto-refresh service for React app
// Provides subscription to refresh events and interval management

export type RefreshCallback = () => void | Promise<void>;

export class AutoRefreshService {
  private intervalMs = 60000; // default: 1 minute
  private timerId: number | undefined;
  private listeners = new Set<RefreshCallback>();

  constructor(intervalMs?: number) {
    if (intervalMs) this.intervalMs = intervalMs;
  }

  // Subscribe to refresh events; returns an unsubscribe function
  onRefresh(cb: RefreshCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  // Manually trigger a refresh event
  async forceRefresh(): Promise<void> {
    await this.emit();
  }

  // Start the auto refresh interval
  start(): void {
    this.stop();
    this.timerId = window.setInterval(() => {
      void this.emit();
    }, this.intervalMs);
  }

  // Stop the auto refresh interval
  stop(): void {
    if (this.timerId !== undefined) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  // Update interval and restart timer
  setIntervalMs(ms: number): void {
    this.intervalMs = ms;
    this.start();
  }

  private async emit(): Promise<void> {
    for (const cb of Array.from(this.listeners)) {
      try {
        await cb();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('AutoRefreshService listener error:', err);
      }
    }
  }
}

// Singleton instance used by the app
export const autoRefreshService = new AutoRefreshService();
autoRefreshService.start();
