<script lang="ts">
  interface Props {
    /** Invoked when the user taps "Start Monitoring"; should start mic + motion monitors. */
    onStart: () => Promise<void>
  }

  let { onStart }: Props = $props()

  let status = $state<'idle' | 'requesting' | 'error'>('idle')
  let errorMessage = $state('')

  async function handleStart(): Promise<void> {
    status = 'requesting'
    errorMessage = ''
    try {
      await onStart()
    } catch (err) {
      status = 'error'
      errorMessage = err instanceof Error ? err.message : String(err)
    }
  }
</script>

<div class="gate">
  <h1>Noise Meter</h1>
  <p>
    This app needs access to your microphone (to measure volume) and motion sensors (to detect if
    the tablet has been moved). Nothing is sent anywhere &mdash; all data stays on this device.
  </p>

  <button type="button" onclick={handleStart} disabled={status === 'requesting'}>
    {status === 'requesting' ? 'Requesting access…' : 'Start Monitoring'}
  </button>

  {#if status === 'error'}
    <p class="error" role="alert">
      Couldn't start monitoring: {errorMessage}. Please allow microphone and motion permissions in
      your browser settings and try again.
    </p>
  {/if}
</div>

<style>
  .gate {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
    max-width: 32rem;
    margin: 0 auto;
  }

  h1 {
    margin: 0;
  }

  p {
    color: #94a3b8;
  }

  button {
    background: #38bdf8;
    color: #0f172a;
    border: none;
    border-radius: 6px;
    padding: 0.75rem 1.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .error {
    color: #f87171;
  }
</style>
