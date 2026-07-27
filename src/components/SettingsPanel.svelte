<script lang="ts">
  import { settings, DEFAULT_SETTINGS, loadSettings, type Settings } from '../lib/settings/settings'
  import { clearAllHistory } from '../lib/storage/db'

  interface Props {
    /** Called after history has been successfully cleared, so the app can refresh in-memory state. */
    onHistoryCleared?: () => void
  }

  let { onHistoryCleared }: Props = $props()

  let current = $state({ ...DEFAULT_SETTINGS })
  settings.subscribe((value) => (current = value))

  // Numeric fields are edited as independent, free-form text rather than
  // being bound straight to the settings store. If the input's `value` were
  // reactively tied to the store, clearing the field would commit `0` (from
  // Number('')), which immediately re-renders the DOM value back to "0" mid
  // keystroke -- so the next digit you type lands *after* that reinserted
  // zero (e.g. typing "1" becomes "10"). Especially painful on a tablet's
  // on-screen keyboard. Each field only commits to the store once it holds
  // a valid number, and reformats on blur.
  let thresholdText = $state(String(DEFAULT_SETTINGS.thresholdDb))
  let sensitivityText = $state(String(DEFAULT_SETTINGS.movementSensitivity))
  let retentionText = $state(String(DEFAULT_SETTINGS.retentionHours))
  let calibrationText = $state(String(DEFAULT_SETTINGS.calibrationOffsetDb))

  function syncTextFromSettings(s: Settings): void {
    thresholdText = String(s.thresholdDb)
    sensitivityText = String(s.movementSensitivity)
    retentionText = String(s.retentionHours)
    calibrationText = String(s.calibrationOffsetDb)
  }

  // Seed the text fields once from whatever settings were loaded at mount
  // (read directly from storage, not from the reactive `current` state, to
  // avoid a one-time initializer capturing a reactive value).
  syncTextFromSettings(loadSettings())

  let confirmingClear = $state(false)
  let clearStatus = $state<'idle' | 'clearing' | 'done' | 'error'>('idle')

  function commitNumberField(key: keyof Settings, text: string, min: number, max: number): void {
    if (text.trim() === '') return
    const value = Number(text)
    if (Number.isNaN(value)) return
    const clamped = Math.min(max, Math.max(min, value))
    settings.update((s) => ({ ...s, [key]: clamped }))
  }

  function handleReset(): void {
    settings.reset()
    syncTextFromSettings(DEFAULT_SETTINGS)
  }

  async function handleClearHistory(): Promise<void> {
    clearStatus = 'clearing'
    try {
      await clearAllHistory()
      clearStatus = 'done'
      onHistoryCleared?.()
    } catch {
      clearStatus = 'error'
    } finally {
      confirmingClear = false
    }
  }
</script>

<section class="settings">
  <h2>Settings</h2>

  <label>
    Volume alert threshold (dB)
    <input
      type="number"
      min="0"
      max="140"
      value={thresholdText}
      oninput={(e) => {
        thresholdText = e.currentTarget.value
        commitNumberField('thresholdDb', thresholdText, 0, 140)
      }}
      onblur={() => (thresholdText = String(current.thresholdDb))}
    />
  </label>

  <label>
    Movement sensitivity (m/s²)
    <input
      type="number"
      min="0.5"
      max="20"
      step="0.5"
      value={sensitivityText}
      oninput={(e) => {
        sensitivityText = e.currentTarget.value
        commitNumberField('movementSensitivity', sensitivityText, 0.5, 20)
      }}
      onblur={() => (sensitivityText = String(current.movementSensitivity))}
    />
  </label>

  <label>
    History retention (hours)
    <input
      type="number"
      min="1"
      max="72"
      value={retentionText}
      oninput={(e) => {
        retentionText = e.currentTarget.value
        commitNumberField('retentionHours', retentionText, 1, 72)
      }}
      onblur={() => (retentionText = String(current.retentionHours))}
    />
  </label>

  <label>
    Calibration offset (dB)
    <input
      type="number"
      min="0"
      max="200"
      value={calibrationText}
      oninput={(e) => {
        calibrationText = e.currentTarget.value
        commitNumberField('calibrationOffsetDb', calibrationText, 0, 200)
      }}
      onblur={() => (calibrationText = String(current.calibrationOffsetDb))}
    />
  </label>

  <button type="button" onclick={handleReset}>Reset to defaults</button>

  <div class="danger-zone">
    {#if !confirmingClear}
      <button type="button" class="danger" onclick={() => (confirmingClear = true)}>
        Clear history
      </button>
    {:else}
      <p class="confirm-text">
        This permanently deletes all stored volume history, threshold violations, and movement
        events. This cannot be undone.
      </p>
      <div class="confirm-actions">
        <button
          type="button"
          class="danger"
          onclick={handleClearHistory}
          disabled={clearStatus === 'clearing'}
        >
          {clearStatus === 'clearing' ? 'Clearing…' : 'Yes, clear everything'}
        </button>
        <button type="button" onclick={() => (confirmingClear = false)}>Cancel</button>
      </div>
    {/if}
    {#if clearStatus === 'done'}
      <p class="status-message success" role="status">History cleared.</p>
    {:else if clearStatus === 'error'}
      <p class="status-message error" role="alert">Couldn't clear history. Please try again.</p>
    {/if}
  </div>
</section>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  h2 {
    font-size: 1rem;
    margin: 0 0 0.25rem;
    color: #cbd5e1;
  }

  label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: #e2e8f0;
  }

  input {
    width: 6rem;
    padding: 0.25rem 0.4rem;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #334155;
    border-radius: 4px;
  }

  button {
    align-self: flex-start;
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid #334155;
    border-radius: 4px;
    padding: 0.4rem 0.75rem;
    cursor: pointer;
  }

  button:hover {
    background: #334155;
  }

  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .danger-zone {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid #334155;
  }

  .danger {
    align-self: flex-start;
    background: transparent;
    border-color: #b91c1c;
    color: #f87171;
  }

  .danger:hover {
    background: rgba(185, 28, 28, 0.15);
  }

  .confirm-text {
    margin: 0;
    font-size: 0.85rem;
    color: #fca5a5;
  }

  .confirm-actions {
    display: flex;
    gap: 0.5rem;
  }

  .status-message {
    margin: 0;
    font-size: 0.85rem;
  }

  .status-message.success {
    color: #86efac;
  }

  .status-message.error {
    color: #f87171;
  }
</style>
