import { vi } from 'vitest';

export function freezeTime(at: Date | string | number): () => void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(at));

  return () => {
    vi.useRealTimers();
  };
}

export function advanceTimeByMs(milliseconds: number): void {
  vi.advanceTimersByTime(milliseconds);
}

export function runAllTimers(): void {
  vi.runAllTimers();
}
