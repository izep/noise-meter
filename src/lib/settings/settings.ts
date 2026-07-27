/**
 * Persisted user-configurable settings for the noise meter.
 * Backed by localStorage so preferences survive reloads without a server.
 */
import { writable } from 'svelte/store'

export interface Settings {
  /** Volume alert threshold in (approximate) dB SPL. */
  thresholdDb: number
  /** Acceleration delta (m/s^2) above the rolling baseline that counts as "moved". */
  movementSensitivity: number
  /** How many hours of history to retain before old samples/events are pruned. */
  retentionHours: number
  /** Added to the raw dBFS reading to approximate real-world dB SPL; tune per device. */
  calibrationOffsetDb: number
}

export const DEFAULT_SETTINGS: Settings = {
  thresholdDb: 65,
  movementSensitivity: 2.5,
  retentionHours: 6,
  calibrationOffsetDb: 100,
}

const STORAGE_KEY = 'noise-meter:settings'

export function loadSettings(storage: Pick<Storage, 'getItem'> = safeLocalStorage()): Settings {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(
  settings: Settings,
  storage: Pick<Storage, 'setItem'> = safeLocalStorage(),
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage may be unavailable (e.g. private browsing quota); ignore.
  }
}

function safeLocalStorage(): Storage {
  return typeof localStorage !== 'undefined' ? localStorage : (undefined as never)
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<Settings>(loadSettings())

  return {
    subscribe,
    set(value: Settings) {
      set(value)
      saveSettings(value)
    },
    update(fn: (value: Settings) => Settings) {
      update((value) => {
        const next = fn(value)
        saveSettings(next)
        return next
      })
    },
    reset() {
      set({ ...DEFAULT_SETTINGS })
      saveSettings(DEFAULT_SETTINGS)
    },
  }
}

export const settings = createSettingsStore()
