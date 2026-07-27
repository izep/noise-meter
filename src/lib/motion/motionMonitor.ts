/**
 * Wraps the DeviceMotion API to detect tablet movement using a debounced
 * acceleration-spike detector, and exposes live state + discrete "moved"
 * events as a Svelte store / callback.
 */
import { writable, type Readable } from 'svelte/store'
import { magnitude, MovementSpikeDetector, type Vector3 } from './spikeDetector'

export interface MovementEvent {
  timestamp: number
  magnitude: number
  durationMs: number
}

export type MotionMonitorStatus = 'idle' | 'running' | 'unsupported' | 'denied' | 'stopped'

export interface MotionMonitorState {
  status: MotionMonitorStatus
  moving: boolean
}

export interface MotionMonitorOptions {
  sensitivity?: number
  /** Consecutive time a spike must persist before it's confirmed as "moved", to avoid false positives. */
  debounceMs?: number
  onMovement?: (event: MovementEvent) => void
  /** Overridable for testing. Defaults to window.addEventListener/removeEventListener. */
  addEventListener?: (type: 'devicemotion', listener: (e: DeviceMotionEvent) => void) => void
  removeEventListener?: (type: 'devicemotion', listener: (e: DeviceMotionEvent) => void) => void
  /** Overridable for testing; defaults to the global DeviceMotionEvent (iOS-only permission gate). */
  requestPermission?: () => Promise<'granted' | 'denied'>
  now?: () => number
}

export interface MotionMonitor {
  state: Readable<MotionMonitorState>
  start(): Promise<void>
  stop(): void
  setSensitivity(sensitivity: number): void
}

function isPermissionGatedDeviceMotion(
  ctor: unknown,
): ctor is { requestPermission: () => Promise<'granted' | 'denied'> } {
  return (
    typeof ctor === 'function' &&
    typeof (ctor as { requestPermission?: unknown }).requestPermission === 'function'
  )
}

export function createMotionMonitor(options: MotionMonitorOptions = {}): MotionMonitor {
  const debounceMs = options.debounceMs ?? 300
  const now = options.now ?? (() => Date.now())
  const detector = new MovementSpikeDetector(options.sensitivity ?? 2.5)

  const addEventListener =
    options.addEventListener ??
    ((type: 'devicemotion', listener: (e: DeviceMotionEvent) => void) =>
      window.addEventListener(type, listener))
  const removeEventListener =
    options.removeEventListener ??
    ((type: 'devicemotion', listener: (e: DeviceMotionEvent) => void) =>
      window.removeEventListener(type, listener))
  const requestPermission =
    options.requestPermission ??
    (() => {
      const DME = (globalThis as { DeviceMotionEvent?: unknown }).DeviceMotionEvent
      if (isPermissionGatedDeviceMotion(DME)) {
        return DME.requestPermission()
      }
      return Promise.resolve('granted' as const)
    })

  const { subscribe, set } = writable<MotionMonitorState>({ status: 'idle', moving: false })

  let spikeStartedAt: number | undefined
  let listener: ((e: DeviceMotionEvent) => void) | undefined

  function handleEvent(e: DeviceMotionEvent): void {
    const accel = e.accelerationIncludingGravity ?? e.acceleration
    if (!accel || accel.x === null || accel.y === null || accel.z === null) return
    const vector: Vector3 = { x: accel.x, y: accel.y, z: accel.z }
    const isSpike = detector.update(magnitude(vector))
    const t = now()

    if (isSpike) {
      if (spikeStartedAt === undefined) spikeStartedAt = t
      const duration = t - spikeStartedAt
      if (duration >= debounceMs) {
        set({ status: 'running', moving: true })
        options.onMovement?.({ timestamp: t, magnitude: magnitude(vector), durationMs: duration })
      }
    } else {
      spikeStartedAt = undefined
      set({ status: 'running', moving: false })
    }
  }

  async function start(): Promise<void> {
    // Idempotent: remove any previously registered listener before re-starting.
    stop()
    if (typeof DeviceMotionEvent === 'undefined' && !options.addEventListener) {
      set({ status: 'unsupported', moving: false })
      return
    }
    const permission = await requestPermission()
    if (permission !== 'granted') {
      set({ status: 'denied', moving: false })
      return
    }
    detector.reset()
    spikeStartedAt = undefined
    listener = handleEvent
    addEventListener('devicemotion', listener)
    set({ status: 'running', moving: false })
  }

  function stop(): void {
    if (listener) removeEventListener('devicemotion', listener)
    listener = undefined
    set({ status: 'stopped', moving: false })
  }

  function setSensitivity(sensitivity: number): void {
    detector.setSensitivity(sensitivity)
  }

  return { state: { subscribe }, start, stop, setSensitivity }
}
