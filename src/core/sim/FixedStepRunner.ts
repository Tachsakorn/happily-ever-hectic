/**
 * Advances a simulation in fixed steps regardless of display refresh rate
 * (60 Hz, 120 Hz ProMotion, or a hitch). Pure: the caller feeds real elapsed
 * time, the runner decides how many fixed ticks that buys.
 */
export class FixedStepRunner {
  private accumulator = 0;

  constructor(
    readonly stepSeconds: number,
    private readonly tick: (dt: number) => void,
    /** Caps catch-up after a long hitch (e.g. tab backgrounded) to avoid a spiral of death. */
    private readonly maxStepsPerAdvance = 8,
  ) {}

  /** Returns the number of ticks executed. */
  advance(elapsedSeconds: number): number {
    this.accumulator += Math.max(0, elapsedSeconds);
    let steps = 0;
    // Epsilon absorbs float drift so 0.25 + 0.05 at a 0.1 step really is 3 steps.
    while (this.accumulator >= this.stepSeconds - 1e-9 && steps < this.maxStepsPerAdvance) {
      this.tick(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      steps++;
    }
    if (steps === this.maxStepsPerAdvance) this.accumulator = 0;
    return steps;
  }

  /** Fraction of the next step already elapsed, for render interpolation. */
  get alpha(): number {
    return Math.max(0, this.accumulator) / this.stepSeconds;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
