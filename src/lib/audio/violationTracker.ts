export interface ViolationEvent {
  timestamp: number
  peakDb: number
  durationMs: number
}

export class ThresholdViolationTracker {
  private violationStartedAt: number | undefined
  private peakDb: number | undefined

  constructor(private thresholdDb: number) {}

  setThreshold(thresholdDb: number): void {
    this.thresholdDb = thresholdDb
  }

  update(db: number, timestamp: number): ViolationEvent | undefined {
    if (db > this.thresholdDb) {
      if (this.violationStartedAt === undefined) {
        this.violationStartedAt = timestamp
        this.peakDb = db
        return undefined
      }

      this.peakDb = Math.max(this.peakDb ?? db, db)
      return undefined
    }

    return this.finishViolation(timestamp)
  }

  flush(atTimestamp: number): ViolationEvent | undefined {
    return this.finishViolation(atTimestamp)
  }

  private finishViolation(atTimestamp: number): ViolationEvent | undefined {
    if (this.violationStartedAt === undefined || this.peakDb === undefined) return undefined

    const event: ViolationEvent = {
      timestamp: this.violationStartedAt,
      peakDb: this.peakDb,
      durationMs: Math.max(0, atTimestamp - this.violationStartedAt),
    }

    this.violationStartedAt = undefined
    this.peakDb = undefined

    return event
  }
}
