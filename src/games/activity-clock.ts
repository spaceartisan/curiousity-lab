import type { GameKind } from "../storage/contracts";
import type { ClockObserver, ClockSample } from "../storage/clock-context";
export interface ClockTarget {
  game: GameKind;
  id: string;
}
export interface ClockSlice extends ClockTarget {
  clock?: ClockSample;
  activeMs: number;
  pausedMs: number;
}
export class ActivityClock {
  private last: number;
  private interacted: number;
  private visible: boolean;
  private paused = false;
  private target: ClockTarget | null = null;
  constructor(
    now: number,
    visible = true,
    private observer?: ClockObserver,
  ) {
    this.last = now;
    this.interacted = now;
    this.visible = visible;
  }
  private take(now: number) {
    const clock = this.observer?.sample(now);
    now = Math.max(this.last, now);
    const elapsed = now - this.last;
    const activeMs =
      this.visible && !this.paused
        ? Math.max(0, Math.min(now, this.interacted + 60000) - this.last)
        : 0;
    const pausedMs = this.visible && this.paused ? elapsed : 0;
    this.last = now;
    return { activeMs, pausedMs, ...(clock ? { clock } : {}) };
  }
  drain(now: number): ClockSlice | null {
    const time = this.take(now);
    return this.target &&
      (time.activeMs > 0 || time.pausedMs > 0 || time.clock?.changed)
      ? { ...this.target, ...time }
      : null;
  }
  bind(now: number, target: ClockTarget | null, paused = false) {
    const slice = this.drain(now);
    const changed =
      target?.id !== this.target?.id || target?.game !== this.target?.game;
    if (changed || (this.paused && !paused)) this.interacted = this.last;
    this.target = target;
    this.paused = paused;
    return slice;
  }
  onInput(now: number) {
    const slice = this.drain(now);
    this.interacted = this.last;
    return slice;
  }
  onVisibility(now: number, visible: boolean) {
    const slice = this.drain(now);
    this.visible = visible;
    if (visible) this.interacted = this.last;
    return slice;
  }
  // Preserve the small standalone clock API used by engine consumers.
  interact(now: number) {
    const time = this.take(now);
    this.interacted = this.last;
    return time.activeMs;
  }
  sample(now: number) {
    return this.take(now).activeMs;
  }
  visibility(now: number, visible: boolean) {
    const time = this.take(now);
    this.visible = visible;
    return time.activeMs;
  }
  pause(now: number, paused: boolean) {
    const time = this.take(now);
    this.paused = paused;
    return time.activeMs;
  }
}
