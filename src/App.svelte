<script lang="ts">
  import { onDestroy } from 'svelte'
  import PermissionsGate from './components/PermissionsGate.svelte'
  import VolumeGraph from './components/VolumeGraph.svelte'
  import AlertFlash from './components/AlertFlash.svelte'
  import HistoryPanel from './components/HistoryPanel.svelte'
  import SettingsPanel from './components/SettingsPanel.svelte'
  import { createMicMonitor } from './lib/audio/micMonitor'
  import { createMotionMonitor, type MovementEvent } from './lib/motion/motionMonitor'
  import { createWakeLockController } from './lib/wakelock/wakeLock'
  import { settings, loadSettings, DEFAULT_SETTINGS } from './lib/settings/settings'
  import {
    aggregateSamples,
    saveBuckets,
    getHistorySince,
    pruneOlderThan,
    retentionCutoff,
  } from './lib/storage/volumeHistory'
  import {
    saveMovementEvent,
    getMovementHistorySince,
    pruneMovementOlderThan,
  } from './lib/storage/movementHistory'
  import type { VolumeBucketRecord, MovementEventRecord } from './lib/storage/db'

  const LIVE_WINDOW_MS = 5 * 60 * 1000 // keep 5 minutes of raw samples for the live graph
  const AGGREGATE_INTERVAL_MS = 30_000 // flush aggregated buckets to IndexedDB every 30s
  const BUCKET_MS = 10_000 // 10s buckets when aggregating for storage
  const MOVEMENT_ALERT_DISPLAY_MS = 4_000

  let started = $state(false)
  let currentSettings = $state({ ...DEFAULT_SETTINGS })
  settings.subscribe((s) => (currentSettings = s))

  // Read once for initial construction; live updates are pushed via the $effect below.
  const initialSettings = loadSettings()
  const micMonitor = createMicMonitor({ calibrationOffsetDb: initialSettings.calibrationOffsetDb })
  const motionMonitor = createMotionMonitor({
    sensitivity: initialSettings.movementSensitivity,
    onMovement: handleMovement,
  })
  const wakeLock = createWakeLockController()

  let liveSamples = $state<{ timestamp: number; db: number }[]>([])
  let pendingSamples: { timestamp: number; db: number }[] = []
  let volumeHistory = $state<VolumeBucketRecord[]>([])
  let movementEvents = $state<MovementEventRecord[]>([])
  let movementAlertUntil = $state(0)
  let now = $state(Date.now())

  let dbSpl = $state(0)
  let micStatus = $state<'idle' | 'starting' | 'running' | 'error' | 'stopped'>('idle')
  micMonitor.state.subscribe((s) => {
    dbSpl = s.dbSpl
    micStatus = s.status
    if (s.status === 'running') {
      const sample = { timestamp: Date.now(), db: s.dbSpl }
      liveSamples = [...liveSamples, sample].filter(
        (s2) => s2.timestamp > Date.now() - LIVE_WINDOW_MS,
      )
      pendingSamples.push(sample)
    }
  })

  function handleMovement(event: MovementEvent): void {
    movementAlertUntil = Date.now() + MOVEMENT_ALERT_DISPLAY_MS
    void saveMovementEvent(event).then(refreshMovementHistory)
  }

  async function refreshVolumeHistory(): Promise<void> {
    const cutoff = retentionCutoff(currentSettings.retentionHours)
    volumeHistory = await getHistorySince(cutoff)
  }

  async function refreshMovementHistory(): Promise<void> {
    const cutoff = retentionCutoff(currentSettings.retentionHours)
    movementEvents = await getMovementHistorySince(cutoff)
  }

  async function flushAggregatedSamples(): Promise<void> {
    if (pendingSamples.length === 0) return
    const toFlush = pendingSamples
    pendingSamples = []
    const buckets = aggregateSamples(toFlush, BUCKET_MS)
    await saveBuckets(buckets)
    await pruneOlderThan(retentionCutoff(currentSettings.retentionHours))
    await pruneMovementOlderThan(retentionCutoff(currentSettings.retentionHours))
    await refreshVolumeHistory()
  }

  let aggregateTimer: ReturnType<typeof setInterval> | undefined
  let clockTimer: ReturnType<typeof setInterval> | undefined

  async function handleStart(): Promise<void> {
    await micMonitor.start()
    await motionMonitor.start()
    await wakeLock.enable()
    await refreshVolumeHistory()
    await refreshMovementHistory()
    aggregateTimer = setInterval(() => void flushAggregatedSamples(), AGGREGATE_INTERVAL_MS)
    clockTimer = setInterval(() => (now = Date.now()), 1000)
    started = true
  }

  // Keep the running monitors in sync when the user changes settings mid-session.
  $effect(() => {
    micMonitor.setCalibrationOffset(currentSettings.calibrationOffsetDb)
    motionMonitor.setSensitivity(currentSettings.movementSensitivity)
  })

  onDestroy(() => {
    if (aggregateTimer) clearInterval(aggregateTimer)
    if (clockTimer) clearInterval(clockTimer)
    micMonitor.stop()
    motionMonitor.stop()
    wakeLock.disable()
  })

  let volumeAlert = $derived(dbSpl > currentSettings.thresholdDb)
  let movementAlert = $derived(now < movementAlertUntil)
</script>

{#if !started}
  <PermissionsGate onStart={handleStart} />
{:else}
  <main>
    <AlertFlash {volumeAlert} {movementAlert} />

    <header>
      <h1>Noise Meter</h1>
      <div class="reading" class:over={volumeAlert}>
        {dbSpl.toFixed(0)} dB
        <span class="status">({micStatus})</span>
      </div>
    </header>

    <VolumeGraph data={liveSamples} thresholdDb={currentSettings.thresholdDb} />

    <div class="panels">
      <HistoryPanel {volumeHistory} {movementEvents} thresholdDb={currentSettings.thresholdDb} />
      <SettingsPanel />
    </div>
  </main>
{/if}

<style>
  main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    max-width: 60rem;
    margin: 0 auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  h1 {
    font-size: 1.25rem;
    margin: 0;
  }

  .reading {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .reading.over {
    color: #f87171;
  }

  .status {
    font-size: 0.8rem;
    color: #64748b;
    font-weight: 400;
  }

  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 640px) {
    .panels {
      grid-template-columns: 1fr;
    }
  }
</style>
