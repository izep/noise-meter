/**
 * Wraps the Web Audio API to continuously sample microphone input and
 * expose a live approximate dB SPL reading as a Svelte store.
 *
 * Browser API access is injected so this module can be unit tested without
 * a real microphone or AudioContext.
 */
import { writable, type Readable } from 'svelte/store'
import { computeApproxDbSpl } from './dsp'

export interface MicMonitorOptions {
  /** How often to sample the analyser, in ms. */
  intervalMs?: number
  /** Calibration offset (dB) added to the raw dBFS reading. */
  calibrationOffsetDb?: number
  /** FFT size for the AnalyserNode (must be a power of 2). */
  fftSize?: number
  /** Overridable for testing; defaults to navigator.mediaDevices.getUserMedia. */
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  /** Overridable for testing; defaults to the global AudioContext. */
  createAudioContext?: () => AudioContext
}

export type MicMonitorStatus = 'idle' | 'starting' | 'running' | 'error' | 'stopped'

export interface MicMonitorState {
  status: MicMonitorStatus
  dbSpl: number
  error?: string
}

export interface MicMonitor {
  /** Live status + current reading. */
  state: Readable<MicMonitorState>
  start(): Promise<void>
  stop(): void
  /** Update the calibration offset applied to future readings. */
  setCalibrationOffset(offsetDb: number): void
}

const INITIAL_STATE: MicMonitorState = { status: 'idle', dbSpl: 0 }

export function createMicMonitor(options: MicMonitorOptions = {}): MicMonitor {
  const intervalMs = options.intervalMs ?? 200
  const fftSize = options.fftSize ?? 2048
  let calibrationOffsetDb = options.calibrationOffsetDb ?? 100

  const getUserMedia =
    options.getUserMedia ??
    ((constraints: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(constraints))
  const createAudioContext = options.createAudioContext ?? (() => new AudioContext())

  const { subscribe, set, update } = writable<MicMonitorState>({ ...INITIAL_STATE })

  let stream: MediaStream | undefined
  let audioContext: AudioContext | undefined
  let analyser: AnalyserNode | undefined
  let source: MediaStreamAudioSourceNode | undefined
  let timer: ReturnType<typeof setInterval> | undefined

  async function start(): Promise<void> {
    update((s) => ({ ...s, status: 'starting', error: undefined }))
    try {
      stream = await getUserMedia({ audio: true })
      audioContext = createAudioContext()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = fftSize
      source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const buffer = new Float32Array(analyser.fftSize)
      timer = setInterval(() => {
        if (!analyser) return
        analyser.getFloatTimeDomainData(buffer)
        const dbSpl = computeApproxDbSpl(buffer, calibrationOffsetDb)
        set({ status: 'running', dbSpl })
      }, intervalMs)

      set({ status: 'running', dbSpl: 0 })
    } catch (err) {
      set({ status: 'error', dbSpl: 0, error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  }

  function stop(): void {
    if (timer) clearInterval(timer)
    timer = undefined
    source?.disconnect()
    analyser?.disconnect()
    stream?.getTracks().forEach((track) => track.stop())
    void audioContext?.close()
    stream = undefined
    audioContext = undefined
    analyser = undefined
    source = undefined
    set({ status: 'stopped', dbSpl: 0 })
  }

  function setCalibrationOffset(offsetDb: number): void {
    calibrationOffsetDb = offsetDb
  }

  return { state: { subscribe }, start, stop, setCalibrationOffset }
}
