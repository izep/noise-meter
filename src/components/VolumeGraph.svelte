<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import uPlot from 'uplot'
  import 'uplot/dist/uPlot.min.css'

  interface Props {
    /** Chronological samples: unix ms timestamp + dB reading. */
    data: { timestamp: number; db: number }[]
    thresholdDb: number
    height?: number
  }

  let { data, thresholdDb, height = 220 }: Props = $props()

  let container: HTMLDivElement | undefined
  let plot: uPlot | undefined

  function toSeries(samples: Props['data']): [number[], number[]] {
    const xs = samples.map((s) => s.timestamp / 1000)
    const ys = samples.map((s) => s.db)
    return [xs, ys]
  }

  function buildOptions(width: number): uPlot.Options {
    return {
      width,
      height,
      scales: { x: { time: true } },
      series: [
        {},
        {
          label: 'dB',
          stroke: '#38bdf8',
          width: 2,
          points: { show: false },
        },
      ],
      axes: [
        { stroke: '#94a3b8', grid: { stroke: '#1e293b' } },
        { stroke: '#94a3b8', grid: { stroke: '#1e293b' } },
      ],
      hooks: {
        draw: [
          (u) => {
            const y = u.valToPos(thresholdDb, 'y', true)
            const ctx = u.ctx
            ctx.save()
            ctx.strokeStyle = '#f87171'
            ctx.setLineDash([6, 4])
            ctx.beginPath()
            ctx.moveTo(u.bbox.left, y)
            ctx.lineTo(u.bbox.left + u.bbox.width, y)
            ctx.stroke()
            ctx.restore()
          },
        ],
      },
    }
  }

  onMount(() => {
    if (!container) return
    plot = new uPlot(buildOptions(container.clientWidth), toSeries(data), container)

    const resizeObserver = new ResizeObserver(() => {
      if (container && plot) plot.setSize({ width: container.clientWidth, height })
    })
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  })

  $effect(() => {
    if (plot) plot.setData(toSeries(data))
  })

  onDestroy(() => {
    plot?.destroy()
  })
</script>

<div class="graph" bind:this={container} role="img" aria-label="Volume over time graph"></div>

<style>
  .graph {
    width: 100%;
  }
</style>
