<script lang="ts">
  import { settings, DEFAULT_SETTINGS } from '../lib/settings/settings'

  let current = $state({ ...DEFAULT_SETTINGS })
  settings.subscribe((value) => (current = value))

  function update<K extends keyof typeof current>(key: K, value: (typeof current)[K]): void {
    settings.update((s) => ({ ...s, [key]: value }))
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
      value={current.thresholdDb}
      oninput={(e) => update('thresholdDb', Number(e.currentTarget.value))}
    />
  </label>

  <label>
    Movement sensitivity (m/s²)
    <input
      type="number"
      min="0.5"
      max="20"
      step="0.5"
      value={current.movementSensitivity}
      oninput={(e) => update('movementSensitivity', Number(e.currentTarget.value))}
    />
  </label>

  <label>
    History retention (hours)
    <input
      type="number"
      min="1"
      max="72"
      value={current.retentionHours}
      oninput={(e) => update('retentionHours', Number(e.currentTarget.value))}
    />
  </label>

  <label>
    Calibration offset (dB)
    <input
      type="number"
      min="0"
      max="200"
      value={current.calibrationOffsetDb}
      oninput={(e) => update('calibrationOffsetDb', Number(e.currentTarget.value))}
    />
  </label>

  <button type="button" onclick={() => settings.reset()}>Reset to defaults</button>
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
</style>
