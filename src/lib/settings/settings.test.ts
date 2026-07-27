import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './settings'

function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size
    },
  } as Storage
}

describe('settings persistence', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('returns defaults when nothing is stored', () => {
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips saved settings', () => {
    const custom: Settings = {
      thresholdDb: 70,
      movementSensitivity: 3,
      retentionHours: 12,
      calibrationOffsetDb: 95,
    }
    saveSettings(custom, storage)
    expect(loadSettings(storage)).toEqual(custom)
  })

  it('falls back to defaults for corrupt JSON', () => {
    storage.setItem('noise-meter:settings', '{not json')
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS)
  })

  it('merges partial stored settings with defaults', () => {
    storage.setItem('noise-meter:settings', JSON.stringify({ thresholdDb: 80 }))
    expect(loadSettings(storage)).toEqual({ ...DEFAULT_SETTINGS, thresholdDb: 80 })
  })
})
