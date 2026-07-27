/**
 * Pure movement-detection math, kept separate from the DeviceMotion event
 * wiring so it can be unit tested deterministically.
 */

export interface Vector3 {
  x: number
  y: number
  z: number
}

/** Euclidean magnitude of an acceleration vector. */
export function magnitude(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

/**
 * Tracks a slow-moving baseline magnitude (exponential moving average) and
 * flags a "moved" spike whenever the instantaneous magnitude deviates from
 * that baseline by more than `sensitivity` (m/s^2).
 */
export class MovementSpikeDetector {
  private baseline: number | undefined

  constructor(
    private sensitivity: number,
    /** Smoothing factor for the baseline EMA, in (0, 1]. Lower = slower to adapt. */
    private smoothing = 0.05,
  ) {}

  setSensitivity(sensitivity: number): void {
    this.sensitivity = sensitivity
  }

  reset(): void {
    this.baseline = undefined
  }

  /**
   * Feed one reading. Returns true if this sample is a movement spike.
   * The baseline only adapts on non-spike samples, so a sustained spike
   * keeps triggering rather than being absorbed into the baseline.
   */
  update(current: number): boolean {
    if (this.baseline === undefined) {
      this.baseline = current
      return false
    }
    const delta = Math.abs(current - this.baseline)
    const isSpike = delta > this.sensitivity
    if (!isSpike) {
      this.baseline = this.baseline + this.smoothing * (current - this.baseline)
    }
    return isSpike
  }
}
