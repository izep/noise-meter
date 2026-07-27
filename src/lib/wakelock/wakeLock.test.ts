import { describe, it, expect, vi } from 'vitest'
import { isWakeLockSupported, createWakeLockController } from './wakeLock'

describe('isWakeLockSupported', () => {
  it('is true when a request() function is present', () => {
    expect(isWakeLockSupported({ request: () => Promise.resolve() })).toBe(true)
  })

  it('is false when undefined', () => {
    expect(isWakeLockSupported(undefined)).toBe(false)
  })

  it('is false for a plain object without request()', () => {
    expect(isWakeLockSupported({})).toBe(false)
  })
})

function makeFakeDoc() {
  const listeners = new Map<string, () => void>()
  return {
    visibilityState: 'visible' as DocumentVisibilityState,
    body: { appendChild: vi.fn() },
    addEventListener: vi.fn((type: string, cb: () => void) => listeners.set(type, cb)),
    removeEventListener: vi.fn((type: string) => listeners.delete(type)),
    triggerVisibilityChange(state: DocumentVisibilityState) {
      this.visibilityState = state
      listeners.get('visibilitychange')?.()
    },
  }
}

describe('createWakeLockController', () => {
  it('requests a native wake lock when supported', async () => {
    const sentinel = { release: vi.fn().mockResolvedValue(undefined) }
    const request = vi.fn().mockResolvedValue(sentinel)
    const doc = makeFakeDoc()

    const controller = createWakeLockController({
      wakeLockApi: { request },
      doc: doc as unknown as Document,
    })
    await controller.enable()

    expect(request).toHaveBeenCalledWith('screen')
    expect(controller.usingFallback).toBe(false)
  })

  it('releases the sentinel on disable()', async () => {
    const sentinel = { release: vi.fn().mockResolvedValue(undefined) }
    const request = vi.fn().mockResolvedValue(sentinel)
    const doc = makeFakeDoc()

    const controller = createWakeLockController({
      wakeLockApi: { request },
      doc: doc as unknown as Document,
    })
    await controller.enable()
    controller.disable()

    expect(sentinel.release).toHaveBeenCalled()
  })

  it('falls back to a video element when the API is unsupported', async () => {
    const doc = makeFakeDoc()
    const fallbackVideo = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      remove: vi.fn(),
    }

    const controller = createWakeLockController({
      wakeLockApi: undefined,
      doc: doc as unknown as Document,
      createFallbackVideo: () => fallbackVideo as unknown as HTMLVideoElement,
    })
    await controller.enable()

    expect(doc.body.appendChild).toHaveBeenCalledWith(fallbackVideo)
    expect(fallbackVideo.play).toHaveBeenCalled()
    expect(controller.usingFallback).toBe(true)
  })

  it('re-acquires the lock when the tab becomes visible again', async () => {
    const sentinel = { release: vi.fn().mockResolvedValue(undefined) }
    const request = vi.fn().mockResolvedValue(sentinel)
    const doc = makeFakeDoc()

    const controller = createWakeLockController({
      wakeLockApi: { request },
      doc: doc as unknown as Document,
    })
    await controller.enable()
    doc.triggerVisibilityChange('visible')

    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not re-acquire after disable()', async () => {
    const sentinel = { release: vi.fn().mockResolvedValue(undefined) }
    const request = vi.fn().mockResolvedValue(sentinel)
    const doc = makeFakeDoc()

    const controller = createWakeLockController({
      wakeLockApi: { request },
      doc: doc as unknown as Document,
    })
    await controller.enable()
    controller.disable()
    doc.triggerVisibilityChange('visible')

    expect(request).toHaveBeenCalledTimes(1)
  })
})
