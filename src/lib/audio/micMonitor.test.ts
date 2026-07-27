import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { get } from 'svelte/store'
import { createMicMonitor } from './micMonitor'

class FakeTrack {
  stopped = false
  stop() {
    this.stopped = true
  }
}

class FakeAnalyser {
  fftSize = 2048
  fillValue = 0.2
  getFloatTimeDomainData(buffer: Float32Array) {
    buffer.fill(this.fillValue)
  }
  disconnect = vi.fn()
}

class FakeSource {
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeAudioContext {
  closed = false
  analyser = new FakeAnalyser()
  createAnalyser() {
    return this.analyser as unknown as AnalyserNode
  }
  createMediaStreamSource() {
    return new FakeSource() as unknown as MediaStreamAudioSourceNode
  }
  close() {
    this.closed = true
    return Promise.resolve()
  }
}

describe('createMicMonitor', () => {
  let track: FakeTrack
  let fakeStream: MediaStream
  let fakeContext: FakeAudioContext
  let getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>

  beforeEach(() => {
    vi.useFakeTimers()
    track = new FakeTrack()
    fakeStream = { getTracks: () => [track] } as unknown as MediaStream
    fakeContext = new FakeAudioContext()
    getUserMedia = vi.fn().mockResolvedValue(fakeStream)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts idle', () => {
    const monitor = createMicMonitor({
      getUserMedia,
      createAudioContext: () => fakeContext as unknown as AudioContext,
    })
    expect(get(monitor.state).status).toBe('idle')
  })

  it('requests the mic stream with AGC/echo cancellation/noise suppression disabled', async () => {
    const monitor = createMicMonitor({
      getUserMedia,
      createAudioContext: () => fakeContext as unknown as AudioContext,
    })
    await monitor.start()

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
      },
    })
  })

  it('transitions to running and reports readings after start', async () => {
    const monitor = createMicMonitor({
      getUserMedia,
      createAudioContext: () => fakeContext as unknown as AudioContext,
      intervalMs: 100,
      calibrationOffsetDb: 100,
    })

    await monitor.start()
    expect(get(monitor.state).status).toBe('running')

    await vi.advanceTimersByTimeAsync(100)
    const state = get(monitor.state)
    expect(state.status).toBe('running')
    expect(state.dbSpl).toBeGreaterThan(0)
  })

  it('reports an error state when getUserMedia rejects', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('Permission denied'))
    const monitor = createMicMonitor({
      getUserMedia: failing,
      createAudioContext: () => fakeContext as unknown as AudioContext,
    })

    await expect(monitor.start()).rejects.toThrow('Permission denied')
    const state = get(monitor.state)
    expect(state.status).toBe('error')
    expect(state.error).toBe('Permission denied')
  })

  it('stops tracks and audio context on stop()', async () => {
    const monitor = createMicMonitor({
      getUserMedia,
      createAudioContext: () => fakeContext as unknown as AudioContext,
    })
    await monitor.start()
    monitor.stop()

    expect(track.stopped).toBe(true)
    expect(fakeContext.closed).toBe(true)
    expect(get(monitor.state).status).toBe('stopped')
  })
})
