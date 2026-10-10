export class ActivityClock {
  private last: number;
  private interacted: number;
  private visible = true;
  private paused = false;
  constructor(now: number) {
    this.last = now;
    this.interacted = now;
  }
  interact(now: number) {
    this.interacted = now;
  }
  sample(now: number) {
    const delta =
      this.visible && !this.paused
        ? Math.max(0, Math.min(now, this.interacted + 60000) - this.last)
        : 0;
    this.last = now;
    return delta;
  }
  visibility(now: number, visible: boolean) {
    const delta = this.sample(now);
    this.visible = visible;
    return delta;
  }
  pause(now: number, paused: boolean) {
    const delta = this.sample(now);
    this.paused = paused;
    return delta;
  }
}
