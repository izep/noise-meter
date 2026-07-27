import { describe, it, expect, vi } from 'vitest'
import { get } from 'svelte/store'
import { createMotionMonitor } from './motionMonitor'

function makeEvent(x: number, y: number, z: number): DeviceMotionEvent {
  return { accelerationIncludingGravity: { x, y, z } } as unknown as DeviceMotionEvent
}

describe('createMotionMonitor', () => {
  it('starts idle before start()', () => {
    const monitor = createMotionMonitor({ addEventListener: vi.fn(), removeEventListener: vi.fn() })
    expect(get(monitor.state).status).toBe('idle')
  })

  it('registers a devicemotion listener and reports denied when permission is refused', async () => {
    const add = vi.fn()
    const monitor = createMotionMonitor({
      addEventListener: add,
      removeEventListener: vi.fn(),
      requestPermission: () => Promise.resolve('denied'),
    })
    await monitor.start()
    expect(get(monitor.state).status).toBe('denied')
    expect(add).not.toHaveBeenCalled()
  })

  it('transitions to running once granted and started', async () => {
    const monitor = createMotionMonitor({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      requestPermission: () => Promise.resolve('granted'),
    })
    await monitor.start()
    expect(get(monitor.state).status).toBe('running')
  })

  it('fires onMovement and sets moving=true after a sustained spike (debounced)', async () => {
    let handler: ((e: DeviceMotionEvent) => void) | undefined
    let t = 0
    const onMovement = vi.fn()
    const monitor = createMotionMonitor({
      sensitivity: 2,
      debounceMs: 100,
      now: () => t,
      onMovement,
      addEventListener: (_type, listener) => {
        handler = listener
      },
      removeEventListener: vi.fn(),
    })
    await monitor.start()

    handler!(makeEvent(0, 0, 9.8)) // baseline
    t = 50
    handler!(makeEvent(0, 0, 20)) // spike starts, not yet debounced
    expect(get(monitor.state).moving).toBe(false)
    expect(onMovement).not.toHaveBeenCalled()

    t = 160
    handler!(makeEvent(0, 0, 20)) // spike sustained past debounce window
    expect(get(monitor.state).moving).toBe(true)
    expect(onMovement).toHaveBeenCalledTimes(1)
    expect(onMovement.mock.calls[0][0]).toMatchObject({ timestamp: 160 })
  })

  it('clears moving state once acceleration settles back down', async () => {
    let handler: ((e: DeviceMotionEvent) => void) | undefined
    let t = 0
    const monitor = createMotionMonitor({
      sensitivity: 2,
      debounceMs: 0,
      now: () => t,
      addEventListener: (_type, listener) => {
        handler = listener
      },
      removeEventListener: vi.fn(),
    })
    await monitor.start()

    handler!(makeEvent(0, 0, 9.8))
    t = 10
    handler!(makeEvent(0, 0, 20))
    expect(get(monitor.state).moving).toBe(true)

    t = 20
    handler!(makeEvent(0, 0, 9.8))
    expect(get(monitor.state).moving).toBe(false)
  })

  it('removes the listener on stop()', async () => {
    const remove = vi.fn()
    const add = vi.fn()
    const monitor = createMotionMonitor({ addEventListener: add, removeEventListener: remove })
    await monitor.start()
    monitor.stop()
    expect(remove).toHaveBeenCalledWith('devicemotion', add.mock.calls[0][1])
    expect(get(monitor.state).status).toBe('stopped')
  })
})
