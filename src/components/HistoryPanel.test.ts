import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/svelte'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
})

async function renderHistoryPanel(props: Record<string, unknown>) {
  const { default: HistoryPanel } = await import('./HistoryPanel.svelte')
  return render(HistoryPanel, props)
}

describe('HistoryPanel', () => {
  it('renders threshold violation summary stats', async () => {
    await renderHistoryPanel({
      volumeHistory: [],
      violationEvents: [],
      violationCount: 3,
      percentAboveThreshold: 12.3,
      movementEvents: [],
      thresholdDb: 65,
    })

    expect(screen.getByText(/Exceeded 65 dB/i)).toBeInTheDocument()
    expect(screen.getByText(/12\.3%/i)).toBeInTheDocument()
  })

  it('renders one row per threshold violation event', async () => {
    const { container } = await renderHistoryPanel({
      volumeHistory: [],
      violationEvents: [
        { id: 1, timestamp: 1000, peakDb: 71.2, durationMs: 500 },
        { id: 2, timestamp: 2000, peakDb: 73.4, durationMs: 900 },
      ],
      violationCount: 2,
      percentAboveThreshold: 8.7,
      movementEvents: [],
      thresholdDb: 65,
    })

    expect(container.querySelectorAll('.violation-list li')).toHaveLength(2)
    expect(screen.getByText('71.2 dB peak')).toBeInTheDocument()
    expect(screen.getByText('73.4 dB peak')).toBeInTheDocument()
  })

  it('shows a positive empty state when there are no threshold violations', async () => {
    await renderHistoryPanel({
      volumeHistory: [],
      violationEvents: [],
      violationCount: 0,
      percentAboveThreshold: 0,
      movementEvents: [],
      thresholdDb: 65,
    })

    expect(screen.getByText(/No threshold violations recorded\. Great job!/i)).toBeInTheDocument()
  })
})
