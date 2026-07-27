/**
 * Pure signal-processing helpers for turning raw audio samples into an
 * approximate dB SPL reading. Kept free of Web Audio APIs so it can be
 * unit tested without a browser.
 */

/** Root-mean-square amplitude of a PCM sample buffer (values in [-1, 1]). */
export function computeRms(samples: Float32Array | number[]): number {
  if (samples.length === 0) return 0
  let sumSquares = 0
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]
    sumSquares += v * v
  }
  return Math.sqrt(sumSquares / samples.length)
}

/** Converts linear RMS amplitude to dBFS (0 dBFS = full scale, negative below). */
export function rmsToDbfs(rms: number): number {
  if (rms <= 0) return -Infinity
  return 20 * Math.log10(rms)
}

/**
 * Approximates real-world dB SPL from a dBFS reading using a calibration
 * offset. This is only an estimate: true SPL accuracy requires calibrating
 * the offset against a reference sound level meter for the specific device
 * and microphone gain.
 */
export function dbfsToApproxSpl(dbfs: number, calibrationOffsetDb: number): number {
  if (!Number.isFinite(dbfs)) return 0
  return dbfs + calibrationOffsetDb
}

/** Convenience: raw samples straight to an approximate dB SPL reading, floored at 0. */
export function computeApproxDbSpl(
  samples: Float32Array | number[],
  calibrationOffsetDb: number,
): number {
  const rms = computeRms(samples)
  const dbfs = rmsToDbfs(rms)
  const spl = dbfsToApproxSpl(dbfs, calibrationOffsetDb)
  return Math.max(0, spl)
}
