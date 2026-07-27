<script lang="ts">
  interface Props {
    volumeAlert: boolean
    movementAlert: boolean
  }

  let { volumeAlert, movementAlert }: Props = $props()

  let kind = $derived(movementAlert ? 'movement' : volumeAlert ? 'volume' : undefined)
</script>

{#if kind}
  <div class="flash {kind}" role="alert" aria-live="assertive">
    <span class="message">
      {kind === 'movement' ? 'Movement detected!' : 'Volume too loud!'}
    </span>
  </div>
{/if}

<style>
  .flash {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    animation: flash-pulse 0.6s ease-in-out infinite;
  }

  .flash.volume {
    background: rgba(248, 113, 113, 0.55);
  }

  .flash.movement {
    background: rgba(250, 204, 21, 0.55);
    animation-name: flash-pulse-fast;
  }

  .message {
    font-size: clamp(1.5rem, 6vw, 3rem);
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    padding: 0.5rem 1.5rem;
  }

  @keyframes flash-pulse {
    0%,
    100% {
      opacity: 0.35;
    }
    50% {
      opacity: 0.9;
    }
  }

  @keyframes flash-pulse-fast {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }
</style>
