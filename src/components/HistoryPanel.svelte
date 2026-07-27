<script lang="ts">
  import VolumeGraph from './VolumeGraph.svelte'
  import type {
    VolumeBucketRecord,
    MovementEventRecord,
    ViolationEventRecord,
  } from '../lib/storage/db'

  interface Props {
    volumeHistory: VolumeBucketRecord[]
    violationEvents: ViolationEventRecord[]
    violationCount: number
    percentAboveThreshold: number
    movementEvents: MovementEventRecord[]
    thresholdDb: number
  }

  let {
    volumeHistory,
    violationEvents,
    violationCount,
    percentAboveThreshold,
    movementEvents,
    thresholdDb,
  }: Props = $props()

  let graphData = $derived(
    volumeHistory.map((bucket) => ({ timestamp: bucket.timestamp, db: bucket.avgDb })),
  )

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleString()
  }
</script>

<section class="history">
  <h2>Volume History</h2>
  {#if volumeHistory.length > 0}
    <VolumeGraph
      data={graphData}
      {thresholdDb}
      height={180}
      violationTimestamps={violationEvents.map((event) => event.timestamp)}
    />
  {:else}
    <p class="empty">No history recorded yet.</p>
  {/if}

  <h2>Threshold Violations</h2>
  <p class="summary">
    Exceeded {thresholdDb} dB <strong>{violationCount}</strong> times ·
    <strong>{percentAboveThreshold.toFixed(1)}%</strong> of monitored time
  </p>
  {#if violationEvents.length > 0}
    <ul class="violation-list">
      {#each violationEvents as event (event.id ?? event.timestamp)}
        <li>
          <span class="violation-meta">
            <span class="indicator" aria-hidden="true"></span>
            <span class="time">{formatTime(event.timestamp)}</span>
          </span>
          <span class="peak">{event.peakDb.toFixed(1)} dB peak</span>
          <span class="duration">{event.durationMs}ms</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">No threshold violations recorded. Great job!</p>
  {/if}

  <h2>Movement Events</h2>
  {#if movementEvents.length > 0}
    <ul class="movement-list">
      {#each movementEvents as event (event.id ?? event.timestamp)}
        <li>
          <span class="time">{formatTime(event.timestamp)}</span>
          <span class="magnitude">{event.magnitude.toFixed(1)} m/s²</span>
          <span class="duration">{event.durationMs}ms</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">No movement detected. Good.</p>
  {/if}
</section>

<style>
  .history {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  h2 {
    font-size: 1rem;
    margin: 0.75rem 0 0.25rem;
    color: #cbd5e1;
  }

  .empty {
    color: #64748b;
    font-style: italic;
  }

  .summary {
    margin: 0;
    color: #94a3b8;
    font-size: 0.9rem;
  }

  .summary strong {
    color: #e2e8f0;
  }

  .violation-list,
  .movement-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 200px;
    overflow-y: auto;
  }

  .violation-list li,
  .movement-list li {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #1e293b;
    font-size: 0.875rem;
  }

  .violation-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: #f87171;
    flex: 0 0 auto;
  }

  .time {
    color: #e2e8f0;
  }

  .peak,
  .magnitude,
  .duration {
    color: #94a3b8;
  }
</style>
