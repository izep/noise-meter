/**
 * Keeps the screen awake using the Screen Wake Lock API where available,
 * with a muted looping `<video>` fallback for browsers (e.g. older Fire OS
 * Silk) that don't support it. Re-acquires the lock on visibility change,
 * since the OS releases wake locks when a tab is hidden.
 */

export interface WakeLockOptions {
  /** Overridable for testing; defaults to navigator.wakeLock. */
  wakeLockApi?: { request(type: 'screen'): Promise<WakeLockSentinel> }
  /** Overridable for testing; defaults to document. */
  doc?: Document
  /** Factory for the fallback video element; overridable for testing. */
  createFallbackVideo?: () => HTMLVideoElement
}

export interface WakeLockController {
  enable(): Promise<void>
  disable(): void
  readonly usingFallback: boolean
}

export function isWakeLockSupported(
  wakeLockApi: unknown = typeof navigator !== 'undefined' ? navigator.wakeLock : undefined,
): boolean {
  return typeof wakeLockApi === 'object' && wakeLockApi !== null && 'request' in wakeLockApi
}

export function createWakeLockController(options: WakeLockOptions = {}): WakeLockController {
  const wakeLockApi =
    options.wakeLockApi ?? (typeof navigator !== 'undefined' ? navigator.wakeLock : undefined)
  const doc = options.doc ?? (typeof document !== 'undefined' ? document : undefined)
  const createFallbackVideo =
    options.createFallbackVideo ??
    (() => {
      const video = document.createElement('video')
      video.setAttribute('muted', '')
      video.muted = true
      video.setAttribute('playsinline', '')
      video.loop = true
      video.style.position = 'fixed'
      video.style.width = '1px'
      video.style.height = '1px'
      video.style.opacity = '0'
      video.style.pointerEvents = 'none'
      // A tiny inline (data URI) looping clip avoids needing a bundled asset.
      video.src = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMQAAAAhmcmVl'
      return video
    })

  let sentinel: WakeLockSentinel | undefined
  let fallbackVideo: HTMLVideoElement | undefined
  let enabled = false
  let visibilityListener: (() => void) | undefined

  async function acquire(): Promise<void> {
    if (isWakeLockSupported(wakeLockApi)) {
      try {
        sentinel = await wakeLockApi!.request('screen')
        return
      } catch {
        // Fall through to the fallback strategy below.
      }
    }
    if (!fallbackVideo) fallbackVideo = createFallbackVideo()
    doc?.body?.appendChild(fallbackVideo)
    try {
      await fallbackVideo.play()
    } catch {
      // Autoplay may be blocked until a user gesture; the video will still
      // attempt to play once one occurs elsewhere in the app.
    }
  }

  async function enable(): Promise<void> {
    enabled = true
    await acquire()
    if (!visibilityListener && doc) {
      visibilityListener = () => {
        if (enabled && doc.visibilityState === 'visible') void acquire()
      }
      doc.addEventListener('visibilitychange', visibilityListener)
    }
  }

  function disable(): void {
    enabled = false
    void sentinel?.release()
    sentinel = undefined
    if (fallbackVideo) {
      fallbackVideo.pause()
      fallbackVideo.remove()
    }
    if (visibilityListener && doc) {
      doc.removeEventListener('visibilitychange', visibilityListener)
      visibilityListener = undefined
    }
  }

  return {
    enable,
    disable,
    get usingFallback() {
      return !sentinel && !!fallbackVideo
    },
  }
}
